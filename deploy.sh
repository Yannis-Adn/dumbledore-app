#!/bin/bash
set -e

# ── VM Connection (from .deploy.env) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.deploy.env" ]; then
  source "$SCRIPT_DIR/.deploy.env"
else
  echo "Error: .deploy.env not found. Copy .deploy.env.example to .deploy.env and fill in your values."
  exit 1
fi
SSH_CMD="ssh -p $VM_PORT $VM_HOST"

echo "==> Building frontend..."
(cd app && npm run build)

echo "==> Syncing files to VM..."
rsync -avz --delete \
  -e "ssh -p $VM_PORT" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.playwright-mcp' \
  --exclude='.vercel' \
  --exclude='.claude' \
  --exclude='/.playwright-mcp/*.png' \
  --exclude='*.har' \
  --exclude='*.mp4' \
  --exclude='*.pptx' \
  --exclude='app/node_modules' \
  --exclude='server/node_modules' \
  --exclude='server/dist' \
  --exclude='.env' \
  --exclude='.deploy.env' \
  ./ "$VM_HOST:$REMOTE_DIR/"

echo "==> Building and restarting on VM..."
$SSH_CMD "cd $REMOTE_DIR && docker compose build --no-cache backend && docker compose up -d"

echo "==> Done! App should be live at $PRODUCTION_URL"
