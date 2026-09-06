#!/bin/bash
# ═══════════════════════════════════════════════════════
#  REMAP STUDIOS — One-Command AWS Setup
#  Run this on your AWS instance to deploy the server
# ═══════════════════════════════════════════════════════
set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  Remap Studios — AWS Setup               ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── 1. Install Node.js if missing ──
if ! command -v node &> /dev/null; then
  echo "→ Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "✓ Node.js $(node -v)"

# ── 2. Install npm dependencies ──
echo "→ Installing dependencies..."
cd "$(dirname "$0")/.."
npm install --production
echo "✓ Dependencies installed"

# ── 3. Create builds directory ──
mkdir -p builds
echo "✓ Builds directory ready"

# ── 4. Check .env ──
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo ""
    echo "⚠  Created .env from .env.example"
    echo "   You MUST edit it with real credentials:"
    echo "   nano .env"
    echo ""
    echo "   Required:"
    echo "   - RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET"
    echo "   - RAZORPAY_WEBHOOK_SECRET"
    echo "   - RAZORPAY_PLAN_PRO_MONTHLY / RAZORPAY_PLAN_BUSINESS_MONTHLY"
    echo "   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    echo ""
  else
    echo "⚠  No .env file found. Copy .env.example to .env and fill in credentials."
    exit 1
  fi
fi

# ── 5. Install PM2 ──
if ! command -v pm2 &> /dev/null; then
  echo "→ Installing PM2..."
  sudo npm install -g pm2
fi
echo "✓ PM2 ready"

# ── 6. Start/Restart server ──
echo "→ Starting server..."
pm2 stop remap-server 2>/dev/null || true
pm2 delete remap-server 2>/dev/null || true
pm2 start server.js --name remap-server
pm2 save
echo "✓ Server started"

# ── 7. Setup PM2 startup (auto-start on reboot) ──
pm2 startup 2>/dev/null || true

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  ✓ Deploy complete!                      ║"
echo "  ║                                          ║"
echo "  ║  Server: http://$(hostname -I | awk '{print $1}'):3001"
echo "  ║  Health: http://$(hostname -I | awk '{print $1}'):3001/api/health"
echo "  ║  Download: http://$(hostname -I | awk '{print $1}'):3001/download"
echo "  ║                                          ║"
echo "  ║  Commands:                               ║"
echo "  ║  pm2 logs remap-server    — view logs    ║"
echo "  ║  pm2 restart remap-server — restart      ║"
echo "  ║  pm2 stop remap-server    — stop         ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
