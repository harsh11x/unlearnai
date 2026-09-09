#!/bin/bash
# ═══════════════════════════════════════════════════════
#  REMAP STUDIOS — One-Command Multi-Platform Deploy
#
#  Builds mac + windows + linux desktop apps, stages them
#  in server/osapps/, and uploads everything to AWS via
#  scp (scp is used because GitHub rejects files > 100MB).
#
#  Usage:
#    ./deploy-all.sh                          # build → stage → upload → verify
#    ./deploy-all.sh --platforms mac,linux    # subset: mac|win|linux
#    ./deploy-all.sh --skip-build             # use builds already in osapps/, just upload
#    ./deploy-all.sh --skip-upload            # build + stage locally only
#    ./deploy-all.sh --pull                   # also git pull + pm2 restart on AWS
#    ./deploy-all.sh --restart                # pm2 restart on AWS after upload
#    ./deploy-all.sh --no-clean               # keep old builds in osapps/
#
#  Config via env vars (defaults shown):
#    AWS_HOST=13.204.245.212
#    AWS_USER=ubuntu
#    AWS_SERVER_DIR=/home/ubuntu/unlearnai/unlearn-studio/server
#    SERVER_URL=http://13.204.245.212:3001
# ═══════════════════════════════════════════════════════
set -e

# ── Config ──
AWS_HOST="${AWS_HOST:-13.204.245.212}"
AWS_USER="${AWS_USER:-ubuntu}"
AWS_SERVER_DIR="${AWS_SERVER_DIR:-/home/ubuntu/unlearnai/unlearn-studio/server}"
SERVER_URL="${SERVER_URL:-http://$AWS_HOST:3001}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_DIR/.." && pwd)"
DESKTOP_SHARED="$REPO_ROOT/apps/desktop/shared"
DIST="$REPO_ROOT/apps/dist"
OSAPPS="$SERVER_DIR/osapps"

SSH="$AWS_USER@$AWS_HOST"

# ── Flags ──
DO_BUILD=1
DO_UPLOAD=1
DO_VERIFY=1
CLEAN=1
PULL=0
RESTART=0
PLATFORMS="mac win linux"

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-build)  DO_BUILD=0 ;;
    --skip-upload) DO_UPLOAD=0 ;;
    --skip-verify) DO_VERIFY=0 ;;
    --no-clean)    CLEAN=0 ;;
    --pull)        PULL=1; RESTART=1 ;;
    --restart)     RESTART=1 ;;
    --platforms)   shift; PLATFORMS="$(echo "$1" | tr ',' ' ' | tr 'WIN' 'win' | tr 'MAC' 'mac' | tr 'LINUX' 'linux')" ;;
    -h|--help)     sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $1 (see --help)"; exit 1 ;;
  esac
  shift
done

# ── Pretty output ──
if [ -t 1 ]; then
  B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; N="\033[0m"
else
  B=""; G=""; Y=""; R=""; N=""
fi
step()  { echo "" >&1; echo "${B}── $* ──${N}" >&1; }
ok()    { echo "  ${G}✓${N} $*" >&1; }
warn()  { echo "  ${Y}⚠${N} $*" >&1; }
fail()  { echo "  ${R}✗${N} $*" >&1; }
die()   { fail "$*"; exit 1; }

trap 'echo "" >&1; fail "Deploy failed. Fix the error above and re-run."' ERR

echo ""
echo "${B}╔══════════════════════════════════════════╗${N}"
echo "${B}║   Remap Studios — Deploy All Platforms   ║${N}"
echo "${B}╚══════════════════════════════════════════╝${N}"

# ── Validate platforms ──
VALID_P=""
for p in $PLATFORMS; do
  case "$p" in
    mac|win|linux) VALID_P="$VALID_P $p" ;;
    *) die "Invalid platform '$p' (use mac, win, linux)" ;;
  esac
done
PLATFORMS="$VALID_P"
ok "Platforms:$PLATFORMS"

# ── Helpers per platform ──
build_target() { case "$1" in mac) echo "mac";; win) echo "win";; linux) echo "linux";; esac; }
dist_dir()     { case "$1" in mac) echo "$DIST/mac";; win) echo "$DIST/win";; linux) echo "$DIST/linux";; esac; }
pattern()      { case "$1" in mac) echo "*.dmg";; win) echo "*.exe";; linux) echo "*.AppImage";; esac; }
os_dir()       { case "$1" in mac) echo mac;; win) echo windows;; linux) echo linux;; esac; }

# ══════════════════════════════════════════
#  1. BUILD
# ══════════════════════════════════════════
if [ "$DO_BUILD" = "1" ]; then
  step "Building desktop apps"
  if [ ! -d "$DESKTOP_SHARED" ]; then die "Missing $DESKTOP_SHARED"; fi
  if [ ! -d "$DESKTOP_SHARED/node_modules" ]; then
    echo "  Installing desktop dependencies..."
    (cd "$DESKTOP_SHARED" && npm install)
  fi
  for p in $PLATFORMS; do
    echo "  Building $p..."
    (cd "$DESKTOP_SHARED" && npm run "build:$(build_target $p)") > /tmp/deploy-build-$p.log 2>&1 \
      || { tail -20 "/tmp/deploy-build-$p.log"; die "$p build failed (full log: /tmp/deploy-build-$p.log)"; }
    ok "$p built"
  done
else
  step "Skipping build (--skip-build)"
fi

# ══════════════════════════════════════════
#  2. STAGE into server/osapps/
# ══════════════════════════════════════════
step "Staging builds into server/osapps/"
shopt -s nullglob
for p in $PLATFORMS; do
  DD="$(dist_dir $p)"
  PAT="$(pattern $p)"
  PDIR="$(os_dir $p)"
  mkdir -p "$OSAPPS/$PDIR"
  if [ "$CLEAN" = "1" ]; then
    rm -f "$OSAPPS/$PDIR"/*.dmg "$OSAPPS/$PDIR"/*.exe "$OSAPPS/$PDIR"/*.msi \
          "$OSAPPS/$PDIR"/*.AppImage "$OSAPPS/$PDIR"/*.deb "$OSAPPS/$PDIR"/*.rpm \
          "$OSAPPS/$PDIR"/*.blockmap "$OSAPPS/$PDIR"/*.zip 2>/dev/null || true
  fi
  COUNT=0
  for f in "$DD"/$PAT; do
    base="$(basename "$f")"
    case "$base" in __*|*-portable*|*.blockmap) continue ;; esac
    cp "$f" "$OSAPPS/$PDIR/"
    COUNT=$((COUNT+1))
    ok "$p: $base ($(du -h "$f" | cut -f1))"
  done
  [ "$COUNT" -gt 0 ] || die "No $PAT found in $DD — run without --skip-build"
done
shopt -u nullglob

# ══════════════════════════════════════════
#  3. UPLOAD via scp
# ══════════════════════════════════════════
if [ "$DO_UPLOAD" = "1" ]; then
  step "Uploading to $SSH (scp — bypasses GitHub 100MB limit)"

  # Ensure remote folders exist
  ssh "$SSH" "mkdir -p '$AWS_SERVER_DIR/osapps/mac' '$AWS_SERVER_DIR/osapps/windows' '$AWS_SERVER_DIR/osapps/linux'" \
    || die "SSH failed — check your key (ssh $SSH) and AWS_SERVER_DIR"

  # Remove old remote builds for the platforms being deployed (unless --no-clean)
  if [ "$CLEAN" = "1" ]; then
    for p in $PLATFORMS; do
      RPAT="$(pattern $p)"
      RDIR="$(os_dir $p)"
      ssh "$SSH" "cd '$AWS_SERVER_DIR/osapps/$RDIR' 2>/dev/null && rm -f $RPAT" || true
    done
    ok "Old remote builds removed"
  fi

  for p in $PLATFORMS; do
    RDIR="$(os_dir $p)"
    PAT="$(pattern $p)"
    for f in "$OSAPPS/$RDIR"/$PAT; do
      echo "  ↑ $(basename "$f") ($(du -h "$f" | cut -f1))..."
      scp -q "$f" "$SSH:$AWS_SERVER_DIR/osapps/$RDIR/" \
        || die "scp failed for $(basename "$f")"
    done
    ok "$RDIR uploaded"
  done

  # Optional: pull latest server code + restart
  if [ "$PULL" = "1" ]; then
    step "Pulling latest server code on AWS"
    ssh "$SSH" "cd '$AWS_SERVER_DIR' && git pull" || warn "git pull failed on AWS"
  fi
  if [ "$RESTART" = "1" ]; then
    step "Restarting server on AWS"
    ssh "$SSH" "cd '$AWS_SERVER_DIR' && pm2 restart remapstudios" \
      || ssh "$SSH" "cd '$AWS_SERVER_DIR' && pm2 start server.js --name remapstudios" \
      || warn "pm2 restart failed — restart manually"
    ok "Server restarted"
  fi
else
  step "Skipping upload (--skip-upload)"
fi

# ══════════════════════════════════════════
#  4. VERIFY
# ══════════════════════════════════════════
if [ "$DO_VERIFY" = "1" ]; then
  step "Verifying server"
  sleep 1
  RESPONSE="$(curl -s -m 15 "$SERVER_URL/api/downloads" || true)"
  if [ -z "$RESPONSE" ]; then
    warn "No response from $SERVER_URL/api/downloads"
    warn "Is the server running? On AWS: pm2 list / pm2 logs remapstudios"
    warn "Is port 3001 open in Lightsail firewall?"
    exit 1
  fi
  echo "$RESPONSE" | head -c 600
  echo ""
  AVAILABLE="$(echo "$RESPONSE" | grep -o '"available": true' | wc -l | tr -d ' ')"
  if [ "$AVAILABLE" -ge 1 ]; then
    ok "$AVAILABLE platform(s) available for download"
    ok "Download page: $SERVER_URL/download"
    ok "API for your Vercel site: $SERVER_URL/api/downloads"
  else
    warn "No platforms reported available — check file names and pm2 logs"
  fi
else
  step "Skipping verify (--skip-verify)"
fi

# ══════════════════════════════════════════
step "Deploy complete 🎉"
echo ""
