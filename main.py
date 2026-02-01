from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import digitalocean
import paramiko
import time
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import logging
import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./deployments.db")
# Fix for Railway PostgreSQL URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database model
class DeploymentModel(Base):
    __tablename__ = "deployments"

    deployment_id = Column(String, primary_key=True, index=True)
    status = Column(String, default="pending")
    anthropic_key_masked = Column(String)
    wallet_address = Column(String, nullable=True)
    payment_signature = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    region = Column(String, default="nyc3")
    droplet_id = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    dashboard_url = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # 7 days after creation
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AutoClaw - OpenClaw Provisioning Platform")

# CORS middleware for frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    FRONTEND_URL,
]
# Add any additional origins from environment
if os.getenv("ADDITIONAL_ORIGINS"):
    ALLOWED_ORIGINS.extend(os.getenv("ADDITIONAL_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to get database session
def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Session will be closed after use

class ProvisionRequest(BaseModel):
    anthropic_api_key: str = Field(..., min_length=20, description="Anthropic API key")
    wallet_address: Optional[str] = Field(None, description="Solana wallet address")
    payment_signature: Optional[str] = Field(None, description="Payment transaction signature")
    user_email: Optional[str] = Field(None, description="User email for notifications")
    region: str = Field("nyc3", description="DigitalOcean region")

class ProvisionResponse(BaseModel):
    deployment_id: str
    status: str
    message: str
    droplet_id: Optional[int] = None
    dashboard_url: Optional[str] = None
    ip_address: Optional[str] = None

class DeploymentStatus(BaseModel):
    deployment_id: str
    status: str
    droplet_id: Optional[int] = None
    dashboard_url: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str
    updated_at: str
    error_message: Optional[str] = None

# Configuration - Loaded from .env file
DIGITALOCEAN_TOKEN = os.getenv("DIGITALOCEAN_TOKEN")
SSH_KEY_ID = os.getenv("SSH_KEY_ID") or None  # Empty string becomes None
SSH_PRIVATE_KEY_PATH = os.getenv("SSH_PRIVATE_KEY_PATH", os.path.expanduser("~/.ssh/id_ed25519"))

# For Railway: SSH key can be passed as base64 encoded string
SSH_PRIVATE_KEY_BASE64 = os.getenv("SSH_PRIVATE_KEY_BASE64")
if SSH_PRIVATE_KEY_BASE64:
    import base64
    import tempfile
    # Decode and write to temp file
    key_content = base64.b64decode(SSH_PRIVATE_KEY_BASE64).decode('utf-8')
    temp_key_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='_ssh_key')
    temp_key_file.write(key_content)
    temp_key_file.close()
    os.chmod(temp_key_file.name, 0o600)
    SSH_PRIVATE_KEY_PATH = temp_key_file.name
    logger.info(f"Using SSH key from environment variable")


def generate_deployment_id():
    """Generate unique deployment ID"""
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))


def get_or_create_ssh_key(manager: digitalocean.Manager):
    """Get existing SSH key or create one"""
    global SSH_KEY_ID
    
    if SSH_KEY_ID:
        return SSH_KEY_ID
    
    # Try to find existing key
    keys = manager.get_all_sshkeys()
    if keys:
        SSH_KEY_ID = keys[0].id
        logger.info(f"Using existing SSH key: {SSH_KEY_ID}")
        return SSH_KEY_ID
    
    # If no keys, you need to upload one
    logger.error("No SSH keys found in DigitalOcean account. Please add your SSH key first.")
    raise HTTPException(status_code=500, detail="No SSH keys configured in DigitalOcean")


def create_cloud_init_script(anthropic_key: str) -> str:
    """Generate cloud-init script - API key is configured via SSH after boot for reliability"""
    return """#cloud-config
package_update: false

runcmd:
  - echo "Droplet ready for Auto Clawd configuration" > /var/log/autoclawd_ready.log
"""


def wait_for_droplet_ready(droplet: digitalocean.Droplet, timeout: int = 300):
    """Wait for droplet to be active and have an IP"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        droplet.load()
        
        if droplet.status == 'active' and droplet.ip_address:
            logger.info(f"Droplet {droplet.id} is ready with IP {droplet.ip_address}")
            return True
        
        logger.info(f"Droplet status: {droplet.status}, waiting...")
        time.sleep(10)
    
    raise TimeoutError(f"Droplet {droplet.id} did not become ready within {timeout} seconds")


def wait_for_ssh_ready(ip_address: str, timeout: int = 180):
    """Wait for SSH to be available on the droplet"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(
                ip_address,
                username='root',
                key_filename=SSH_PRIVATE_KEY_PATH,
                timeout=10,
                banner_timeout=10
            )
            ssh.close()
            logger.info(f"SSH is ready on {ip_address}")
            return True
        except Exception as e:
            logger.info(f"SSH not ready yet: {str(e)}")
            time.sleep(10)
    
    raise TimeoutError(f"SSH did not become ready on {ip_address} within {timeout} seconds")


def configure_api_key_via_ssh(ip_address: str, anthropic_key: str) -> bool:
    """Configure Anthropic API key on the droplet via SSH"""

    # Wait for SSH to be ready
    wait_for_ssh_ready(ip_address)

    # Give the system time to fully boot
    logger.info("Waiting for system to fully boot before configuring API key...")
    time.sleep(30)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(
            ip_address,
            username='root',
            key_filename=SSH_PRIVATE_KEY_PATH,
            timeout=30
        )

        logger.info(f"Connected to {ip_address}, configuring Anthropic API key...")

        # Check if clawdbot.env exists
        stdin, stdout, stderr = ssh.exec_command("test -f /opt/clawdbot.env && echo 'exists'")
        if stdout.read().decode().strip() != 'exists':
            logger.error("/opt/clawdbot.env not found")
            ssh.close()
            return False

        # Remove any existing ANTHROPIC_API_KEY line (commented or not)
        ssh.exec_command("sed -i '/ANTHROPIC_API_KEY/d' /opt/clawdbot.env")
        time.sleep(1)

        # Add the API key
        stdin, stdout, stderr = ssh.exec_command(f"echo 'ANTHROPIC_API_KEY={anthropic_key}' >> /opt/clawdbot.env")

        # Enable ALL features by default for dashboard access
        logger.info("Enabling all features for dashboard...")

        features_to_enable = [
            # Web login and dashboard features
            ("WEB_LOGIN_ENABLED", "true"),
            ("ENABLE_WEB_CHANNEL_LOGIN", "true"),
            ("DASHBOARD_ENABLED", "true"),
            ("WEB_UI_ENABLED", "true"),

            # WhatsApp
            ("WHATSAPP_ENABLED", "true"),
            ("WHATSAPP_WEB_ENABLED", "true"),
            ("WHATSAPP_QR_LOGIN", "true"),

            # Telegram
            ("TELEGRAM_ENABLED", "true"),
            ("TELEGRAM_WEB_LOGIN", "true"),

            # Discord
            ("DISCORD_ENABLED", "true"),
            ("DISCORD_WEB_LOGIN", "true"),

            # Slack
            ("SLACK_ENABLED", "true"),
            ("SLACK_WEB_LOGIN", "true"),

            # Other messaging platforms
            ("SIGNAL_ENABLED", "true"),
            ("MATRIX_ENABLED", "true"),
            ("IRC_ENABLED", "true"),

            # Email
            ("EMAIL_ENABLED", "true"),
            ("GMAIL_ENABLED", "true"),
            ("SMTP_ENABLED", "true"),
            ("IMAP_ENABLED", "true"),

            # Productivity integrations
            ("GITHUB_ENABLED", "true"),
            ("NOTION_ENABLED", "true"),
            ("GOOGLE_CALENDAR_ENABLED", "true"),
            ("GOOGLE_DRIVE_ENABLED", "true"),

            # AI features
            ("WEB_BROWSING_ENABLED", "true"),
            ("FILE_ACCESS_ENABLED", "true"),
            ("CODE_EXECUTION_ENABLED", "true"),
            ("AUTONOMOUS_MODE_ENABLED", "true"),

            # MCP (Model Context Protocol) servers
            ("MCP_ENABLED", "true"),
            ("MCP_FILESYSTEM_ENABLED", "true"),
            ("MCP_BROWSER_ENABLED", "true"),
            ("MCP_GITHUB_ENABLED", "true"),

            # Other features
            ("WEBHOOKS_ENABLED", "true"),
            ("API_ACCESS_ENABLED", "true"),
            ("SCHEDULED_TASKS_ENABLED", "true"),
            ("VOICE_ENABLED", "true"),
            ("IMAGE_GENERATION_ENABLED", "true"),
        ]

        for key, value in features_to_enable:
            ssh.exec_command(f"sed -i '/{key}/d' /opt/clawdbot.env")
            ssh.exec_command(f"echo '{key}={value}' >> /opt/clawdbot.env")

        logger.info("All features enabled for dashboard")

        # Enable full host access for TUI/Dashboard so bot can configure channels itself
        logger.info("Enabling full host access for Clawdbot...")
        ssh.exec_command("/opt/clawdbot-cli.sh config set tools.exec.host gateway")
        time.sleep(1)
        ssh.exec_command("/opt/clawdbot-cli.sh config set tools.exec.security full")
        time.sleep(1)

        # Disable sandbox mode
        ssh.exec_command("/opt/clawdbot-cli.sh config set agents.defaults.sandbox.mode off")
        time.sleep(1)
        stderr_output = stderr.read().decode().strip()
        if stderr_output:
            logger.error(f"Error adding API key: {stderr_output}")

        # Verify the key was added
        stdin, stdout, stderr = ssh.exec_command("grep '^ANTHROPIC_API_KEY=' /opt/clawdbot.env")
        verify_output = stdout.read().decode().strip()
        if anthropic_key in verify_output:
            logger.info("Anthropic API key configured successfully")
        else:
            logger.warning(f"API key verification failed, got: {verify_output[:50]}...")

        # Restart clawdbot service to pick up the new key
        logger.info("Restarting clawdbot service...")
        stdin, stdout, stderr = ssh.exec_command("systemctl restart clawdbot")
        time.sleep(5)

        # Check service status
        stdin, stdout, stderr = ssh.exec_command("systemctl is-active clawdbot")
        service_status = stdout.read().decode().strip()
        logger.info(f"Clawdbot service status: {service_status}")

        ssh.close()
        return service_status == "active"

    except Exception as e:
        logger.error(f"Error configuring API key via SSH: {str(e)}")
        try:
            ssh.close()
        except:
            pass
        return False


def get_dashboard_url_via_ssh(ip_address: str, max_retries: int = 20) -> str:
    """Retrieve OpenClaw dashboard URL via SSH"""

    # Give OpenClaw time to initialize after API key config
    logger.info("Waiting for OpenClaw to fully initialize...")
    time.sleep(30)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    for attempt in range(max_retries):
        try:
            ssh.connect(
                ip_address,
                username='root',
                key_filename=SSH_PRIVATE_KEY_PATH,
                timeout=30
            )
            
            # Try multiple methods to get the dashboard URL
            commands = [
                # Method 1: Check clawdbot.env for gateway token (primary method)
                "grep 'CLAWDBOT_GATEWAY_TOKEN=' /opt/clawdbot.env 2>/dev/null | cut -d'=' -f2 || echo ''",

                # Method 2: Run status script to get gateway info
                "/opt/status-clawdbot.sh 2>&1 | grep -A1 'Gateway Token' | tail -1 || echo ''",

                # Method 3: Check for gateway token in various locations
                "cat /root/.openclaw/gateway_token 2>/dev/null || echo ''",

                # Method 4: Check clawdbot service status
                "systemctl is-active clawdbot 2>/dev/null || echo ''",

                # Method 5: Check if clawdbot is running and on what port
                "ss -tlnp | grep -E ':18789' || echo ''",
            ]
            
            results = {}
            for i, cmd in enumerate(commands):
                stdin, stdout, stderr = ssh.exec_command(cmd)
                output = stdout.read().decode().strip()
                results[f"method_{i+1}"] = output
                logger.info(f"Method {i+1} output: {output[:200]}")
            
            # Get gateway token from clawdbot.env
            stdin, stdout, stderr = ssh.exec_command(
                "grep 'CLAWDBOT_GATEWAY_TOKEN=' /opt/clawdbot.env 2>/dev/null | cut -d'=' -f2"
            )
            gateway_token = stdout.read().decode().strip()

            # Check if clawdbot service is running
            stdin, stdout, stderr = ssh.exec_command("systemctl is-active clawdbot 2>/dev/null")
            service_status = stdout.read().decode().strip()

            if gateway_token and service_status == "active":
                # Use HTTPS on port 443 (Caddy reverse proxy handles this)
                dashboard_url = f"https://{ip_address}?token={gateway_token}"
                logger.info(f"Constructed dashboard URL: {dashboard_url}")
                ssh.close()
                return dashboard_url
            
            # If no token found yet, wait and retry
            logger.info(f"Attempt {attempt + 1}/{max_retries}: OpenClaw not fully initialized yet")
            ssh.close()
            time.sleep(15)
            
        except Exception as e:
            logger.error(f"SSH error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(15)
            else:
                raise
    
    # Fallback: return basic URL without token
    logger.warning("Could not retrieve gateway token, returning basic URL")
    ssh.close()
    return f"https://{ip_address}"


def update_deployment_status(deployment_id: str, **kwargs):
    """Helper function to update deployment status in database"""
    db = SessionLocal()
    try:
        deployment = db.query(DeploymentModel).filter(DeploymentModel.deployment_id == deployment_id).first()
        if deployment:
            for key, value in kwargs.items():
                if hasattr(deployment, key):
                    setattr(deployment, key, value)
            deployment.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


async def provision_droplet_async(deployment_id: str, anthropic_key: str, region: str):
    """Async function to provision droplet in background"""
    try:
        logger.info(f"Starting provisioning for deployment {deployment_id}")

        # Update status
        update_deployment_status(deployment_id, status='creating_droplet')

        # Initialize DigitalOcean manager
        manager = digitalocean.Manager(token=DIGITALOCEAN_TOKEN)

        # Get SSH key
        ssh_key_id = get_or_create_ssh_key(manager)

        # Create cloud-init script
        user_data = create_cloud_init_script(anthropic_key)

        # Create droplet with Moltbot image
        logger.info(f"Creating droplet for deployment {deployment_id}")
        droplet = digitalocean.Droplet(
            token=DIGITALOCEAN_TOKEN,
            name=f"autoclawd-{deployment_id}",
            region=region,
            size_slug='s-2vcpu-4gb',  # Minimum recommended
            image='moltbot',  # Marketplace image slug
            ssh_keys=[ssh_key_id],
            user_data=user_data,
            tags=[f'deployment:{deployment_id}', 'autoclawd', 'platform-managed']
        )

        droplet.create()
        logger.info(f"Droplet {droplet.id} created for deployment {deployment_id}")

        # Update deployment record
        update_deployment_status(deployment_id, droplet_id=droplet.id, status='waiting_for_droplet')

        # Wait for droplet to be ready
        await asyncio.to_thread(wait_for_droplet_ready, droplet)

        ip_address = droplet.ip_address
        update_deployment_status(deployment_id, ip_address=ip_address, status='configuring_openclaw')

        logger.info(f"Droplet ready at {ip_address}, configuring API key...")

        # Configure API key via SSH (more reliable than cloud-init)
        api_key_configured = await asyncio.to_thread(configure_api_key_via_ssh, ip_address, anthropic_key)
        if not api_key_configured:
            logger.warning("API key configuration may have failed, continuing anyway...")

        # Get dashboard URL via SSH
        dashboard_url = await asyncio.to_thread(get_dashboard_url_via_ssh, ip_address)

        # Update final status
        update_deployment_status(deployment_id, dashboard_url=dashboard_url, status='ready')

        logger.info(f"Deployment {deployment_id} completed successfully!")
        logger.info(f"Dashboard URL: {dashboard_url}")

    except Exception as e:
        logger.error(f"Error provisioning deployment {deployment_id}: {str(e)}")
        update_deployment_status(deployment_id, status='failed', error_message=str(e))


@app.post("/provision", response_model=ProvisionResponse)
async def provision_openclaw(request: ProvisionRequest, background_tasks: BackgroundTasks):
    """
    Provision a new OpenClaw VPS for a user
    """
    try:
        # Generate unique deployment ID
        deployment_id = generate_deployment_id()

        # Create deployment record in database
        db = SessionLocal()
        try:
            deployment = DeploymentModel(
                deployment_id=deployment_id,
                status='pending',
                anthropic_key_masked=request.anthropic_api_key[:10] + '...',
                wallet_address=request.wallet_address,
                payment_signature=request.payment_signature,
                user_email=request.user_email,
                region=request.region,
                expires_at=datetime.utcnow() + timedelta(days=7),  # 7 days hosting
            )
            db.add(deployment)
            db.commit()
        finally:
            db.close()

        # Start provisioning in background
        background_tasks.add_task(
            provision_droplet_async,
            deployment_id,
            request.anthropic_api_key,
            request.region
        )

        return ProvisionResponse(
            deployment_id=deployment_id,
            status='pending',
            message='Provisioning started. Use /status endpoint to check progress.'
        )

    except Exception as e:
        logger.error(f"Error starting provisioning: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{deployment_id}", response_model=DeploymentStatus)
async def get_deployment_status(deployment_id: str):
    """
    Get the status of a deployment
    """
    db = SessionLocal()
    try:
        deployment = db.query(DeploymentModel).filter(DeploymentModel.deployment_id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        return DeploymentStatus(
            deployment_id=deployment.deployment_id,
            status=deployment.status,
            droplet_id=deployment.droplet_id,
            dashboard_url=deployment.dashboard_url,
            ip_address=deployment.ip_address,
            created_at=deployment.created_at.isoformat() if deployment.created_at else None,
            updated_at=deployment.updated_at.isoformat() if deployment.updated_at else None,
            error_message=deployment.error_message
        )
    finally:
        db.close()


@app.get("/deployments")
async def list_deployments(wallet: Optional[str] = None):
    """
    List all deployments, optionally filtered by wallet address
    """
    db = SessionLocal()
    try:
        if wallet:
            deployments_list = db.query(DeploymentModel).filter(DeploymentModel.wallet_address == wallet).all()
        else:
            deployments_list = db.query(DeploymentModel).all()

        result = []
        for d in deployments_list:
            result.append({
                "deployment_id": d.deployment_id,
                "status": d.status,
                "wallet_address": d.wallet_address,
                "droplet_id": d.droplet_id,
                "ip_address": d.ip_address,
                "dashboard_url": d.dashboard_url,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
                "expires_at": d.expires_at.isoformat() if d.expires_at else None,
                "error_message": d.error_message
            })

        return {
            "total": len(result),
            "deployments": result
        }
    finally:
        db.close()


@app.delete("/deployment/{deployment_id}")
async def delete_deployment(deployment_id: str):
    """
    Delete a deployment and destroy the droplet
    """
    db = SessionLocal()
    try:
        deployment = db.query(DeploymentModel).filter(DeploymentModel.deployment_id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        droplet_id = deployment.droplet_id

        if droplet_id:
            try:
                manager = digitalocean.Manager(token=DIGITALOCEAN_TOKEN)
                droplet = manager.get_droplet(droplet_id)
                droplet.destroy()
                logger.info(f"Destroyed droplet {droplet_id}")
            except Exception as e:
                logger.error(f"Error destroying droplet: {str(e)}")

        # Remove from database
        db.delete(deployment)
        db.commit()

        return {"message": f"Deployment {deployment_id} deleted"}
    finally:
        db.close()


class RenewRequest(BaseModel):
    deployment_id: str
    payment_signature: str
    wallet_address: str


@app.post("/renew")
async def renew_deployment(request: RenewRequest):
    """
    Renew a deployment for another 7 days (requires payment verification)
    """
    db = SessionLocal()
    try:
        deployment = db.query(DeploymentModel).filter(
            DeploymentModel.deployment_id == request.deployment_id
        ).first()

        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        # Verify wallet matches
        if deployment.wallet_address != request.wallet_address:
            raise HTTPException(status_code=403, detail="Wallet address does not match deployment owner")

        # Extend expiry by 7 days from now (or from current expiry if still valid)
        current_expiry = deployment.expires_at or datetime.utcnow()
        if current_expiry < datetime.utcnow():
            # Already expired, extend from now
            new_expiry = datetime.utcnow() + timedelta(days=7)
        else:
            # Still valid, extend from current expiry
            new_expiry = current_expiry + timedelta(days=7)

        deployment.expires_at = new_expiry
        deployment.payment_signature = request.payment_signature  # Store latest payment
        deployment.updated_at = datetime.utcnow()

        # If status was 'expired', set it back to 'ready'
        if deployment.status == 'expired':
            deployment.status = 'ready'

        db.commit()

        logger.info(f"Deployment {request.deployment_id} renewed until {new_expiry}")

        return {
            "message": "Deployment renewed successfully",
            "deployment_id": request.deployment_id,
            "expires_at": new_expiry.isoformat()
        }
    finally:
        db.close()


async def check_expired_deployments():
    """Background task to check and destroy expired deployments"""
    while True:
        try:
            db = SessionLocal()
            try:
                # Find all expired deployments that haven't been destroyed yet
                expired = db.query(DeploymentModel).filter(
                    DeploymentModel.expires_at < datetime.utcnow(),
                    DeploymentModel.status.in_(['ready', 'expired'])
                ).all()

                for deployment in expired:
                    logger.info(f"Deployment {deployment.deployment_id} has expired, destroying droplet...")

                    # Destroy the droplet
                    if deployment.droplet_id:
                        try:
                            manager = digitalocean.Manager(token=DIGITALOCEAN_TOKEN)
                            droplet = manager.get_droplet(deployment.droplet_id)
                            droplet.destroy()
                            logger.info(f"Destroyed expired droplet {deployment.droplet_id}")
                        except Exception as e:
                            logger.error(f"Error destroying expired droplet: {str(e)}")

                    # Update status to destroyed
                    deployment.status = 'destroyed'
                    deployment.updated_at = datetime.utcnow()
                    db.commit()

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error in expiry checker: {str(e)}")

        # Check every hour
        await asyncio.sleep(3600)


@app.on_event("startup")
async def startup_event():
    """Start background tasks on app startup"""
    logger.info("Starting AutoClaw API...")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    asyncio.create_task(check_expired_deployments())
    logger.info("Started expired deployment checker background task")


@app.get("/")
async def root():
    """Health check endpoint"""
    logger.info("Health check endpoint called")
    return {
        "service": "AutoClaw - OpenClaw Provisioning Platform",
        "status": "running",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
