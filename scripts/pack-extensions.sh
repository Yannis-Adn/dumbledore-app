#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PUBLIC="$ROOT/app/public"
EXT="$ROOT/extension"

mkdir -p "$PUBLIC"

# Chromium (MV3)
echo "→ Packaging Chromium extension..."
(cd "$EXT/chromium" && zip -r "$PUBLIC/dumbledore-extension-chrome.zip" . -x "*.DS_Store")
echo "  ✓ dumbledore-extension-chrome.zip"

# Firefox (MV2)
echo "→ Packaging Firefox extension..."
(cd "$EXT/firefox" && zip -r "$PUBLIC/dumbledore-extension-firefox.zip" . -x "*.DS_Store")
echo "  ✓ dumbledore-extension-firefox.zip"

echo ""
echo "Done. ZIPs written to app/public/"
