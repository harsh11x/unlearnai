#!/bin/bash
# Upload a build to the server
# Usage: ./scripts/upload-build.sh <path-to-build-file>

set -e

SERVER_URL="${SERVER_URL:-https://13.204.245.212:3001}"
UPLOAD_TOKEN="${UPLOAD_TOKEN:-remap-builds-secret-2024}"

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-build-file>"
  echo "Example: $0 ../apps/desktop/dist/mac/Remap-Studios-1.0.0-arm64.dmg"
  exit 1
fi

FILE="$1"
FILENAME=$(basename "$FILE")
FILESIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)

echo "Uploading: $FILENAME"
echo "Server: $SERVER_URL"

curl -X POST "$SERVER_URL/api/builds/upload" \
  -H "X-Upload-Token: $UPLOAD_TOKEN" \
  -H "X-Filename: $FILENAME" \
  --data-binary "@$FILE" \
  --progress-bar

echo ""
echo "Upload complete!"
echo "Download URL: $SERVER_URL/builds/$FILENAME"
echo "Download page: $SERVER_URL/download"
