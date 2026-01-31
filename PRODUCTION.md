# Production Deployment Guide

This guide covers deploying the OpenClaw Provisioning Platform to production.

## Prerequisites

- Ubuntu 20.04+ server (VPS or dedicated)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt)
- PostgreSQL database (recommended for production)
- Systemd for process management

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.10 python3-pip python3-venv nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# Create application user
sudo useradd -m -s /bin/bash openclaw
sudo usermod -aG sudo openclaw

# Switch to application user
sudo su - openclaw
```

## 2. Application Deployment

```bash
# Clone/upload your application
cd /home/openclaw
# Upload your files here

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with production values
```

## 3. PostgreSQL Setup (Recommended)

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE openclaw_platform;
CREATE USER openclaw_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE openclaw_platform TO openclaw_user;
\q

# Update .env file
DATABASE_URL=postgresql://openclaw_user:strong_password_here@localhost/openclaw_platform
```

## 4. Systemd Service

Create `/etc/systemd/system/openclaw-platform.service`:

```ini
[Unit]
Description=OpenClaw Provisioning Platform
After=network.target postgresql.service

[Service]
Type=notify
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw/openclaw_platform
Environment="PATH=/home/openclaw/openclaw_platform/venv/bin"
ExecStart=/home/openclaw/openclaw_platform/venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 600 \
    --access-logfile /var/log/openclaw-platform/access.log \
    --error-logfile /var/log/openclaw-platform/error.log

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Create log directory
sudo mkdir -p /var/log/openclaw-platform
sudo chown openclaw:openclaw /var/log/openclaw-platform

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable openclaw-platform
sudo systemctl start openclaw-platform
sudo systemctl status openclaw-platform
```

## 5. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/openclaw-platform`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeout for long-running requests
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }
    
    # Static files (if serving frontend from same server)
    location /static {
        alias /home/openclaw/openclaw_platform/static;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/openclaw-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL Certificate (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
```

## 7. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

## 8. Monitoring and Logging

### Application Logs

```bash
# View real-time logs
sudo journalctl -u openclaw-platform -f

# View last 100 lines
sudo journalctl -u openclaw-platform -n 100

# View logs for specific date
sudo journalctl -u openclaw-platform --since "2026-01-31"
```

### Setup Log Rotation

Create `/etc/logrotate.d/openclaw-platform`:

```
/var/log/openclaw-platform/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 openclaw openclaw
    sharedscripts
    postrotate
        systemctl reload openclaw-platform > /dev/null 2>&1 || true
    endscript
}
```

## 9. Database Backups

Create `/home/openclaw/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/openclaw/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U openclaw_user openclaw_platform > $BACKUP_DIR/db_backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add this line for daily backups at 2 AM
0 2 * * * /home/openclaw/backup.sh
```

## 10. Security Hardening

### Add API Authentication

Install additional package:
```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

Add to `main.py`:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Implement your JWT verification here
    pass

# Protect endpoints
@app.post("/provision")
async def provision_openclaw(
    request: ProvisionRequest,
    auth: dict = Depends(verify_token)
):
    # ... existing code
```

### Rate Limiting

```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/provision")
@limiter.limit("5/hour")  # 5 provisions per hour per IP
async def provision_openclaw(request: Request, ...):
    # ... existing code
```

### Environment Variables Security

```bash
# Never commit .env file
echo ".env" >> .gitignore

# Secure file permissions
chmod 600 .env
```

## 11. Monitoring with Prometheus (Optional)

```bash
pip install prometheus-fastapi-instrumentator
```

```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

## 12. Health Checks

Add health check endpoint:

```python
@app.get("/health")
async def health_check():
    try:
        # Check database
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        # Check DigitalOcean API
        manager = digitalocean.Manager(token=DIGITALOCEAN_TOKEN)
        manager.get_account()
        
        return {
            "status": "healthy",
            "database": "connected",
            "digitalocean_api": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

## 13. Scaling Considerations

### Horizontal Scaling

Use a load balancer (Nginx, HAProxy) to distribute traffic across multiple application servers:

```nginx
upstream openclaw_backend {
    server 10.0.1.1:8000;
    server 10.0.1.2:8000;
    server 10.0.1.3:8000;
}

server {
    location / {
        proxy_pass http://openclaw_backend;
    }
}
```

### Database Connection Pooling

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40
)
```

## 14. Maintenance Commands

```bash
# Restart application
sudo systemctl restart openclaw-platform

# View status
sudo systemctl status openclaw-platform

# View logs
sudo journalctl -u openclaw-platform -f

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Database migration (if using Alembic)
cd /home/openclaw/openclaw_platform
source venv/bin/activate
alembic upgrade head
```

## 15. Disaster Recovery

### Backup Strategy
1. Daily database backups (automated via cron)
2. Weekly full server snapshots (DigitalOcean Snapshots)
3. Configuration files backed up to Git repository
4. Offsite backup storage (S3, Backblaze B2)

### Recovery Procedure
1. Deploy new server from snapshot
2. Restore database from latest backup
3. Update DNS records if needed
4. Verify all services are running

## Deployment Checklist

- [ ] Server provisioned and secured
- [ ] Application deployed
- [ ] PostgreSQL configured
- [ ] Systemd service running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backups automated
- [ ] Monitoring configured
- [ ] Log rotation set up
- [ ] Health checks working
- [ ] Security hardening complete
- [ ] Documentation updated

## Cost Optimization

1. Use DigitalOcean's Reserved Instances for 30% savings
2. Implement auto-shutdown for unused test droplets
3. Use object storage (Spaces) for backups
4. Monitor and optimize database queries
5. Implement caching (Redis) for frequently accessed data

---

**Production URL**: `https://your-domain.com`  
**Status**: Ready for deployment
