#!/bin/bash

# OpenClaw Platform Setup Script
# This script sets up the complete backend infrastructure

set -e

echo "======================================"
echo "OpenClaw Platform Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo -e "${YELLOW}Warning: Not running in a virtual environment.${NC}"
    echo "It's recommended to use a virtual environment."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Install dependencies
echo -e "${GREEN}[1/6] Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${GREEN}[2/6] Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file and add your DigitalOcean API token${NC}"
else
    echo -e "${YELLOW}[2/6] .env file already exists, skipping...${NC}"
fi

# Initialize database
echo -e "${GREEN}[3/6] Initializing database...${NC}"
python -c "from database import init_db; init_db(); print('Database initialized successfully')"

# Check SSH key
echo -e "${GREEN}[4/6] Checking SSH configuration...${NC}"
if [ -f ~/.ssh/id_rsa ]; then
    echo -e "${GREEN}SSH private key found at ~/.ssh/id_rsa${NC}"
else
    echo -e "${RED}No SSH private key found at ~/.ssh/id_rsa${NC}"
    echo "You need to either:"
    echo "1. Generate a new SSH key: ssh-keygen -t rsa -b 4096"
    echo "2. Update SSH_PRIVATE_KEY_PATH in .env to point to your key"
fi

# Verify DigitalOcean token
echo -e "${GREEN}[5/6] Verifying DigitalOcean configuration...${NC}"
if grep -q "your_digitalocean_api_token_here" .env 2>/dev/null; then
    echo -e "${RED}WARNING: You haven't set your DigitalOcean API token yet!${NC}"
    echo "Please edit .env file and replace 'your_digitalocean_api_token_here' with your actual token"
    echo ""
    echo "To get a token:"
    echo "1. Go to https://cloud.digitalocean.com/account/api/tokens"
    echo "2. Click 'Generate New Token'"
    echo "3. Give it 'Read' and 'Write' scopes"
    echo "4. Copy the token and paste it in .env file"
else
    echo -e "${GREEN}DigitalOcean token appears to be configured${NC}"
fi

# Create logs directory
echo -e "${GREEN}[6/6] Creating logs directory...${NC}"
mkdir -p logs

echo ""
echo -e "${GREEN}======================================"
echo "Setup Complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your DigitalOcean API token"
echo "2. Ensure your SSH key is uploaded to DigitalOcean"
echo "3. Run: python main.py"
echo "4. Open frontend.html in your browser"
echo ""
echo -e "${YELLOW}Note: Make sure you have at least \$6 credit in your DigitalOcean account${NC}"
echo -e "${YELLOW}Each OpenClaw VPS costs \$24/month (s-2vcpu-4gb droplet)${NC}"
echo ""
