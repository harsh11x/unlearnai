#!/bin/bash
# Remap Studios — Windows Build Script
# Run from the shared/ directory: ./build-win.sh
#
# This builds a Windows NSIS installer + portable exe.
# Can run on macOS (cross-compile via Wine) or native Windows (Git Bash / WSL).

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WIN_DIR="$SCRIPT_DIR/../win"

echo "╔══════════════════════════════════════╗"
echo "║   Remap Studios — Windows Build      ║"
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
echo "Building Windows app..."
echo "Config: $WIN_DIR/electron-builder.json"
echo "Output: $WIN_DIR/../../dist/win/"
echo ""

npx electron-builder --win --config "$WIN_DIR/electron-builder.json"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Build complete!                    ║"
echo "║   Check ../../dist/win/ for output   ║"
echo "╚══════════════════════════════════════╝"
