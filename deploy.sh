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

# ── Sync to public GitHub repo ──
PUBLIC_REPO="git@github.com:Yannis-Adn/dumbledore-app.git"
echo ""
echo "==> Syncing to public repo..."

SYNC_DIR=$(mktemp -d)
trap "rm -rf '$SYNC_DIR'" EXIT

git clone --depth 1 "$PUBLIC_REPO" "$SYNC_DIR" 2>/dev/null

# Clear all tracked files (keep .git)
(cd "$SYNC_DIR" && git rm -rf . > /dev/null 2>&1) || true

# Export current HEAD into the public repo
git -C "$SCRIPT_DIR" archive HEAD | tar -x -C "$SYNC_DIR"

# Remove files that shouldn't be in the public repo
rm -f "$SYNC_DIR/.deploy.env" "$SYNC_DIR/.mcp.json"
rm -rf "$SYNC_DIR/.claude"

(cd "$SYNC_DIR" && git add -A)
if (cd "$SYNC_DIR" && git diff --cached --quiet); then
  echo "    Public repo already up to date."
else
  (cd "$SYNC_DIR" && git commit -m "Sync $(git -C "$SCRIPT_DIR" log -1 --format='%h — %s')")
  (cd "$SYNC_DIR" && git push origin main)
  echo "    Public repo updated."
fi
