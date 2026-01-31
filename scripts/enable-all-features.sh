#!/bin/bash
# Enable all Clawdbot features for dashboard access
# Run this on your VPS: curl -sL URL | bash

echo "Enabling all Clawdbot features..."

ENV_FILE="/opt/clawdbot.env"

# Features to enable
declare -a FEATURES=(
    "WEB_LOGIN_ENABLED=true"
    "ENABLE_WEB_CHANNEL_LOGIN=true"
    "DASHBOARD_ENABLED=true"
    "WEB_UI_ENABLED=true"
    "WHATSAPP_ENABLED=true"
    "WHATSAPP_WEB_ENABLED=true"
    "WHATSAPP_QR_LOGIN=true"
    "TELEGRAM_ENABLED=true"
    "TELEGRAM_WEB_LOGIN=true"
    "DISCORD_ENABLED=true"
    "DISCORD_WEB_LOGIN=true"
    "SLACK_ENABLED=true"
    "SLACK_WEB_LOGIN=true"
    "SIGNAL_ENABLED=true"
    "MATRIX_ENABLED=true"
    "IRC_ENABLED=true"
    "EMAIL_ENABLED=true"
    "GMAIL_ENABLED=true"
    "SMTP_ENABLED=true"
    "IMAP_ENABLED=true"
    "GITHUB_ENABLED=true"
    "NOTION_ENABLED=true"
    "GOOGLE_CALENDAR_ENABLED=true"
    "GOOGLE_DRIVE_ENABLED=true"
    "WEB_BROWSING_ENABLED=true"
    "FILE_ACCESS_ENABLED=true"
    "CODE_EXECUTION_ENABLED=true"
    "AUTONOMOUS_MODE_ENABLED=true"
    "MCP_ENABLED=true"
    "MCP_FILESYSTEM_ENABLED=true"
    "MCP_BROWSER_ENABLED=true"
    "MCP_GITHUB_ENABLED=true"
    "WEBHOOKS_ENABLED=true"
    "API_ACCESS_ENABLED=true"
    "SCHEDULED_TASKS_ENABLED=true"
    "VOICE_ENABLED=true"
    "IMAGE_GENERATION_ENABLED=true"
)

for feature in "${FEATURES[@]}"; do
    key="${feature%%=*}"
    # Remove existing line
    sed -i "/${key}/d" "$ENV_FILE"
    # Add new line
    echo "$feature" >> "$ENV_FILE"
    echo "  ✓ $feature"
done

echo ""
echo "Restarting Clawdbot..."
systemctl restart clawdbot

sleep 3

if systemctl is-active --quiet clawdbot; then
    echo ""
    echo "✅ All features enabled! Refresh your dashboard."
else
    echo ""
    echo "⚠️  Clawdbot may need a moment to start. Check: systemctl status clawdbot"
fi
