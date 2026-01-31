# OpenClaw VPS Provisioning Platform

A complete backend platform that automatically provisions DigitalOcean VPS instances with OpenClaw AI assistant. Users simply provide their Anthropic API key and receive a ready-to-use OpenClaw dashboard URL.

## 🚀 Features

- **One-Click Provisioning**: Users provide only their Anthropic API key
- **Automated Setup**: Complete VPS provisioning and OpenClaw configuration
- **Dashboard Access**: Instant access to OpenClaw web interface
- **Status Tracking**: Real-time deployment status updates
- **Secure**: API keys encrypted, proper SSH authentication, isolated VPS per user
- **RESTful API**: Easy integration with any frontend

## 📋 Prerequisites

1. **DigitalOcean Account** with API access
2. **SSH Key** added to your DigitalOcean account
3. **Python 3.8+** installed
4. **DigitalOcean Credit** (~$24/month per VPS)

## 🛠️ Installation

### 1. Clone and Setup

```bash
# Create project directory
mkdir openclaw_platform
cd openclaw_platform

# Copy all files (main.py, database.py, requirements.txt, etc.)

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### 2. Configure Environment

Edit `.env` file with your credentials:

```bash
# Required: Your DigitalOcean API token
DIGITALOCEAN_TOKEN=dop_v1_xxxxxxxxxxxxxxxxxxxxx

# Optional: Specific SSH key ID (leave empty for auto-detect)
SSH_KEY_ID=

# Path to your SSH private key
SSH_PRIVATE_KEY_PATH=/home/youruser/.ssh/id_rsa
```

### 3. Get DigitalOcean API Token

1. Go to https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name it "OpenClaw Platform"
4. Select scopes: **Read** and **Write**
5. Copy the token and paste it in `.env`

### 4. Ensure SSH Key is Uploaded

```bash
# List your SSH keys in DigitalOcean
doctl compute ssh-key list

# Or upload your public key
doctl compute ssh-key import openclaw-key --public-key-file ~/.ssh/id_rsa.pub
```

Alternatively, upload via web interface:
1. https://cloud.digitalocean.com/account/security
2. Click "Add SSH Key"
3. Paste contents of `~/.ssh/id_rsa.pub`

## 🚀 Running the Platform

### Start the Backend Server

```bash
python main.py
```

Server will start on `http://localhost:8000`

### Test with the Frontend

Open `frontend.html` in your browser and:
1. Enter your Anthropic API key
2. Select a region
3. Click "Deploy OpenClaw VPS"
4. Wait 3-5 minutes for provisioning
5. Click the dashboard link when ready

## 📡 API Documentation

### POST /provision

Provision a new OpenClaw VPS.

**Request:**
```json
{
  "anthropic_api_key": "sk-ant-xxxxx",
  "user_email": "user@example.com",  // optional
  "region": "nyc3"                   // optional, default: nyc3
}
```

**Response:**
```json
{
  "deployment_id": "abc123def456",
  "status": "pending",
  "message": "Provisioning started..."
}
```

### GET /status/{deployment_id}

Check deployment status.

**Response:**
```json
{
  "deployment_id": "abc123def456",
  "status": "ready",
  "droplet_id": 123456789,
  "dashboard_url": "http://159.89.123.45:18789?token=abc123",
  "ip_address": "159.89.123.45",
  "created_at": "2026-01-31T10:30:00",
  "updated_at": "2026-01-31T10:35:00"
}
```

**Status Values:**
- `pending` - Initial state
- `creating_droplet` - Creating DigitalOcean droplet
- `waiting_for_droplet` - Waiting for droplet to boot
- `configuring_openclaw` - Installing and configuring OpenClaw
- `ready` - Deployment complete, dashboard URL available
- `failed` - Deployment failed (see error_message)

### GET /deployments

List all deployments.

**Response:**
```json
{
  "total": 5,
  "deployments": [...]
}
```

### DELETE /deployment/{deployment_id}

Delete deployment and destroy droplet.

**Response:**
```json
{
  "message": "Deployment abc123def456 deleted"
}
```

## 🧪 Testing with cURL

```bash
# Provision new VPS
curl -X POST http://localhost:8000/provision \
  -H "Content-Type: application/json" \
  -d '{
    "anthropic_api_key": "sk-ant-your-key-here",
    "region": "nyc3"
  }'

# Check status
curl http://localhost:8000/status/abc123def456

# List all deployments
curl http://localhost:8000/deployments

# Delete deployment
curl -X DELETE http://localhost:8000/deployment/abc123def456
```

## 📊 Database Schema

SQLite database stores deployment records:

```sql
CREATE TABLE deployments (
    id INTEGER PRIMARY KEY,
    deployment_id VARCHAR(12) UNIQUE,
    status VARCHAR(50),
    user_email VARCHAR(255),
    anthropic_key_masked VARCHAR(50),
    droplet_id INTEGER,
    droplet_region VARCHAR(20),
    ip_address VARCHAR(45),
    dashboard_url TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    completed_at DATETIME,
    error_message TEXT
);
```

## 🔒 Security Considerations

### Current Implementation (Development)
- ✅ API keys masked in database
- ✅ SSH key authentication
- ✅ HTTPS communication with DigitalOcean API
- ✅ Isolated VPS per user
- ✅ Gateway token authentication for OpenClaw

### Production Recommendations
- 🔐 Add API authentication (JWT tokens)
- 🔐 Use secrets manager (HashiCorp Vault, AWS Secrets Manager)
- 🔐 Implement rate limiting
- 🔐 Add HTTPS/SSL for API server
- 🔐 Use PostgreSQL instead of SQLite
- 🔐 Implement user authentication system
- 🔐 Add webhook for deployment notifications
- 🔐 Implement proper error handling and retry logic

## 💰 Pricing Considerations

### Costs Per VPS
- **DigitalOcean Droplet**: $24/month (s-2vcpu-4gb)
- **Your Markup**: Add 20-50% for profit margin
- **User's Anthropic API Usage**: Separate, paid by user

### Suggested Pricing Model
- **Basic Plan**: $35/month (includes VPS + support)
- **Pro Plan**: $50/month (includes VPS + priority support + backups)
- **Enterprise**: Custom pricing for multiple VPS instances

## 🐛 Troubleshooting

### Issue: "No SSH keys found in DigitalOcean"
**Solution:** Upload your SSH key to DigitalOcean account

### Issue: Droplet creation fails
**Solution:** 
- Check DigitalOcean API token has write permissions
- Verify you have sufficient credit
- Try a different region

### Issue: Can't retrieve dashboard URL
**Solution:**
- Check SSH private key path in .env
- Ensure SSH key matches the one in DigitalOcean
- Wait longer (OpenClaw takes 2-3 minutes to initialize)

### Issue: Frontend can't connect to backend
**Solution:**
- Make sure backend is running (`python main.py`)
- Update `API_BASE` in frontend.html if using different port
- Check for CORS errors in browser console

## 🔄 Deployment Status Flow

```
pending
  ↓
creating_droplet (DigitalOcean API call)
  ↓
waiting_for_droplet (Polling until active)
  ↓
configuring_openclaw (SSH into droplet, configure OpenClaw)
  ↓
ready (Dashboard URL available) OR failed (Error occurred)
```

## 📝 Development Roadmap

- [ ] Add user authentication system
- [ ] Implement payment processing (Stripe)
- [ ] Add email notifications
- [ ] Support for multiple cloud providers (AWS, GCP)
- [ ] Auto-scaling based on demand
- [ ] Backup and restore functionality
- [ ] Custom domain support for OpenClaw instances
- [ ] Monitoring and analytics dashboard
- [ ] API rate limiting and quotas
- [ ] Webhook integrations

## 🤝 Contributing

This is a production-ready starting point. Feel free to extend it with:
- User authentication (JWT, OAuth)
- Payment processing
- Email notifications
- Monitoring dashboards
- Multi-cloud support

## 📄 License

MIT License - feel free to use for commercial purposes.

## 🆘 Support

For issues related to:
- **OpenClaw**: Visit https://docs.openclaw.ai/
- **DigitalOcean API**: Check https://docs.digitalocean.com/reference/api/
- **This Platform**: Open an issue in the repository

## 🎯 Quick Start Checklist

- [ ] Install Python 3.8+
- [ ] Run `./setup.sh`
- [ ] Get DigitalOcean API token
- [ ] Add token to `.env` file
- [ ] Upload SSH key to DigitalOcean
- [ ] Update `SSH_PRIVATE_KEY_PATH` in `.env`
- [ ] Run `python main.py`
- [ ] Open `frontend.html` in browser
- [ ] Enter Anthropic API key and provision!

---

**Built with ❤️ for the OpenClaw community**
