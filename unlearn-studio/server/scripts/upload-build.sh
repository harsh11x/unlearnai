#!/bin/bash
# ═══════════════════════════════════════════════════════
#  REMAP STUDIOS — Upload Build to Server
# ═══════════════════════════════════════════════════════
#
# Usage:
#   ./upload-build.sh <path-to-build-file>
#
# Examples:
#   ./upload-build.sh "../apps/desktop/dist/mac/Remap Studios-1.0.0-arm64.dmg"
#   ./upload-build.sh "../apps/desktop/dist/win/Remap Studios Setup 1.0.0.exe"
#   ./upload-build.sh "../apps/desktop/dist/linux/Remap Studios-1.0.0.AppImage"
#
# The script auto-detects the platform (mac/windows/linux) from the filename.

set -e

SERVER_URL="${SERVER_URL:-http://13.204.245.212:3001}"
UPLOAD_TOKEN="${UPLOAD_TOKEN:-remap-builds-secret-2024}"

BUILD_FILE="$1"

if [ -z "$BUILD_FILE" ]; then
  echo "Usage: $0 <path-to-build-file>"
  echo ""
  echo "Examples:"
  echo "  $0 '../apps/desktop/dist/mac/Remap Studios-1.0.0-arm64.dmg'"
  echo "  $0 '../apps/desktop/dist/win/Remap Studios Setup 1.0.0.exe'"
  exit 1
fi

if [ ! -f "$BUILD_FILE" ]; then
  echo "❌ File not found: $BUILD_FILE"
  exit 1
fi

FILENAME=$(basename "$BUILD_FILE")
FILESIZE=$(stat -f%z "$BUILD_FILE" 2>/dev/null || stat --printf="%s" "$BUILD_FILE" 2>/dev/null)

echo ""
echo "  📦 Uploading: $FILENAME"
echo "  📏 Size: $(echo "$FILESIZE" | awk '{printf "%.1f MB", $1/1048576}')"
echo "  🌐 Server: $SERVER_URL"
echo ""

HTTP_CODE=$(curl -s -o /tmp/upload-response.json -w "%{http_code}" \
  -X POST "$SERVER_URL/api/builds/upload" \
  -H "X-Upload-Token: $UPLOAD_TOKEN" \
  -H "X-Filename: $FILENAME" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$BUILD_FILE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ Upload successful!"
  echo ""
  cat /tmp/upload-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/upload-response.json
  echo ""
else
  echo "  ❌ Upload failed (HTTP $HTTP_CODE)"
  cat /tmp/upload-response.json 2>/dev/null
  echo ""
  exit 1
fi
