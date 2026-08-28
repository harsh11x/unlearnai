#!/bin/bash
# Unlearn Studio — macOS Build Script
# Run from the shared/ directory: ./build-mac.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAC_DIR="$SCRIPT_DIR/../mac"

echo "╔══════════════════════════════════════╗"
echo "║   Unlearn Studio — macOS Build       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check dependencies
if ! command -v node &> /dev/null; then
  echo "Error: Node.js not found. Install from https://nodejs.org"
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo ""

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Build
echo "Building macOS app..."
echo "Config: $MAC_DIR/electron-builder.json"
echo "Output: $MAC_DIR/../../dist/mac/"
echo ""

npx electron-builder --mac --config "$MAC_DIR/electron-builder.json"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Build complete!                    ║"
echo "║   Check ../../dist/mac/ for output   ║"
echo "╚══════════════════════════════════════╝"
