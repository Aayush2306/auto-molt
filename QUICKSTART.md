# Quick Start Guide - OpenClaw Provisioning Platform

Get your platform running in 5 minutes!

## TL;DR

```bash
# 1. Setup
./setup.sh

# 2. Configure (edit .env with your DigitalOcean token)
nano .env

# 3. Test configuration
python test_config.py

# 4. Run
python main.py

# 5. Open frontend.html in browser and provision!
```

## Step-by-Step Instructions

### 1. Prerequisites Check

Make sure you have:
- [ ] Python 3.8+ installed
- [ ] DigitalOcean account with API access
- [ ] SSH key generated (`ssh-keygen -t rsa -b 4096`)
- [ ] At least $6 credit in DigitalOcean

### 2. Get Your DigitalOcean API Token

1. Visit: https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name: "OpenClaw Platform"
4. Scopes: Check both "Read" and "Write"
5. Click "Generate Token"
6. **Copy the token immediately** (you won't see it again!)

### 3. Upload SSH Key to DigitalOcean

**Option A: Via Web Interface**
1. Go to: https://cloud.digitalocean.com/account/security
2. Click "Add SSH Key"
3. Paste contents of `~/.ssh/id_rsa.pub`
4. Name it "openclaw-key"
5. Click "Add SSH Key"

**Option B: Via CLI (if you have doctl)**
```bash
doctl compute ssh-key import openclaw-key --public-key-file ~/.ssh/id_rsa.pub
```

### 4. Install and Configure

```bash
# Run the automated setup
./setup.sh

# Edit configuration file
nano .env

# Add your DigitalOcean token (replace the placeholder)
DIGITALOCEAN_TOKEN=dop_v1_your_actual_token_here

# Save and exit (Ctrl+X, then Y, then Enter)
```

### 5. Verify Configuration

```bash
# Run the configuration test
python test_config.py
```

You should see all tests passing:
```
✓ Environment: PASSED
✓ Dependencies: PASSED
✓ Database: PASSED
✓ DigitalOcean API: PASSED

All tests passed! 🎉
```

### 6. Start the Backend

```bash
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 7. Test the API

Open a new terminal and test:

```bash
# Health check
curl http://localhost:8000/

# Should return:
# {"service":"OpenClaw Provisioning Platform","status":"running","version":"1.0.0"}
```

### 8. Use the Frontend

1. Open `frontend.html` in your web browser
2. Enter your Anthropic API key (starts with `sk-ant-`)
3. Select a region (default: NYC3)
4. Click "Deploy OpenClaw VPS"
5. Wait 3-5 minutes while the VPS is provisioned
6. Click the dashboard link when ready!

## What Happens During Provisioning?

```
0:00 - User submits Anthropic API key
0:05 - DigitalOcean droplet created
0:30 - Droplet boots up
1:00 - OpenClaw installation starts
2:30 - OpenClaw configured with user's API key
3:00 - Dashboard URL generated
3:30 - User receives dashboard link ✅
```

## Testing with Sample API Request

```bash
# Store your test data
ANTHROPIC_KEY="sk-ant-your-test-key"

# Provision a VPS
curl -X POST http://localhost:8000/provision \
  -H "Content-Type: application/json" \
  -d "{
    \"anthropic_api_key\": \"$ANTHROPIC_KEY\",
    \"user_email\": \"test@example.com\",
    \"region\": \"nyc3\"
  }"

# Response will look like:
# {
#   "deployment_id": "abc123def456",
#   "status": "pending",
#   "message": "Provisioning started..."
# }

# Check status (replace abc123def456 with your deployment_id)
curl http://localhost:8000/status/abc123def456

# Keep checking every 30 seconds until status is "ready"
```

## Common Issues & Solutions

### "No SSH keys found in DigitalOcean"
**Fix:** Upload your public key to DigitalOcean
```bash
cat ~/.ssh/id_rsa.pub
# Copy output and paste at: https://cloud.digitalocean.com/account/security
```

### "DigitalOcean API test failed"
**Fix:** Double-check your API token
```bash
# Make sure token starts with 'dop_v1_' and has no extra spaces
grep DIGITALOCEAN_TOKEN .env
```

### "SSH private key not found"
**Fix:** Update path in .env
```bash
# Find your SSH key
ls -la ~/.ssh/
# Update .env with correct path
SSH_PRIVATE_KEY_PATH=/home/youruser/.ssh/id_rsa
```

### Frontend can't connect to backend
**Fix:** Update API URL in frontend.html
```javascript
// Change this line in frontend.html:
const API_BASE = 'http://localhost:8000';
// To your actual backend URL
```

### Provisioning gets stuck at "configuring_openclaw"
**Wait:** This step can take 2-3 minutes
**Check:** SSH into the droplet and check logs
```bash
# Get droplet IP from status endpoint
ssh root@DROPLET_IP
tail -f /var/log/openclaw_setup.log
```

## What Gets Created?

When you provision an OpenClaw VPS, we create:

1. **DigitalOcean Droplet**
   - Size: s-2vcpu-4gb (2 vCPUs, 4GB RAM)
   - Image: Moltbot/OpenClaw marketplace image
   - Cost: ~$24/month

2. **OpenClaw Configuration**
   - Web dashboard on port 18789
   - Gateway token for authentication
   - User's Anthropic API key injected

3. **Database Entry**
   - Deployment ID
   - Droplet ID and IP
   - Dashboard URL
   - Status tracking

## Next Steps

Once your first VPS is running:

1. **Add User Authentication**: Protect your API with JWT tokens
2. **Implement Billing**: Integrate Stripe for payments
3. **Add Email Notifications**: Alert users when VPS is ready
4. **Create Admin Dashboard**: Monitor all deployments
5. **Setup Monitoring**: Track uptime and performance
6. **Scale**: Add load balancing for high traffic

## Useful Commands

```bash
# View all deployments
curl http://localhost:8000/deployments

# Delete a deployment
curl -X DELETE http://localhost:8000/deployment/abc123def456

# View backend logs
tail -f logs/*.log  # if you set up logging

# Restart backend
# Ctrl+C to stop, then:
python main.py

# Update dependencies
pip install -r requirements.txt --upgrade
```

## Cost Calculator

Per VPS provisioned:
- **DigitalOcean**: $24/month
- **Your markup**: $10-15/month (suggested)
- **Total to user**: $35-40/month

Example monthly revenue:
- 10 users × $35 = $350/month
- 50 users × $35 = $1,750/month
- 100 users × $35 = $3,500/month

DigitalOcean costs:
- 10 VPS × $24 = $240/month (profit: $110)
- 50 VPS × $24 = $1,200/month (profit: $550)
- 100 VPS × $24 = $2,400/month (profit: $1,100)

## Support

- **OpenClaw Documentation**: https://docs.openclaw.ai/
- **DigitalOcean API Docs**: https://docs.digitalocean.com/reference/api/
- **Platform Issues**: Check the logs or README.md

## Success Checklist

Your platform is ready when:
- [ ] Backend starts without errors
- [ ] All config tests pass
- [ ] You can provision a test VPS
- [ ] Dashboard URL opens in browser
- [ ] You can interact with OpenClaw

---

**You're all set! Start provisioning OpenClaw instances! 🚀**
