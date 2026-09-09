#!/bin/bash
# ═══════════════════════════════════════════════════════
#  REMAP STUDIOS — Build & Stage Desktop Apps
#
#  The ONE script that builds the mac/windows/linux apps and copies the
#  outputs into server/osapps/{mac,windows,linux}/ — deleting older files
#  in those folders first, so they always contain only the latest build.
#
#  Usage:
#    ./apps/desktop/scripts/build-apps.sh                  # build all 3 + stage + clean
#    ./apps/desktop/scripts/build-apps.sh -p mac           # build + stage only macOS
#    ./apps/desktop/scripts/build-apps.sh -p mac,win       # subset: mac|win|linux
#    ./build-apps.sh --skip-build                          # just re-stage existing dist/ builds
#    ./build-apps.sh --no-clean                            # keep old builds in osapps/
#    ./build-apps.sh --skip-stage                          # build into dist/ only
#
#  After staging, ship to AWS with:
#    ./server/scripts/deploy-all.sh --skip-build
# ═══════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHARED_DIR="$DESKTOP_DIR/shared"
REPO_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
OSAPPS="$SERVER_DIR/osapps"

# ── Flags ──
DO_BUILD=1
DO_STAGE=1
CLEAN=1
PLATFORMS="mac win linux"

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-build) DO_BUILD=0 ;;
    --skip-stage) DO_STAGE=0 ;;
    --no-clean)   CLEAN=0 ;;
    -p|--platforms) shift; PLATFORMS="$(echo "$1" | tr ',' ' ' | tr 'WIN' 'win' | tr 'MAC' 'mac' | tr 'LINUX' 'linux')" ;;
    -h|--help)    sed -n '2,22p' "$0"; exit 0 ;;
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
step() { echo "" >&1; echo "${B}── $* ──${N}" >&1; }
ok()   { echo "  ${G}✓${N} $*" >&1; }
warn() { echo "  ${Y}⚠${N} $*" >&1; }
die()  { echo "  ${R}✗${N} $*" >&1; exit 1; }

echo ""
echo "${B}╔══════════════════════════════════════════╗${N}"
echo "${B}║   Remap Studios — Build & Stage Apps     ║${N}"
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

# ── Platform helpers ──
build_target() { case "$1" in mac) echo "mac";; win) echo "win";; linux) echo "linux";; esac; }
dist_dir()     { case "$1" in mac) echo "$REPO_ROOT/apps/dist/mac";; win) echo "$REPO_ROOT/apps/dist/win";; linux) echo "$REPO_ROOT/apps/dist/linux";; esac; }
pattern()      { case "$1" in mac) echo "*.dmg";; win) echo "*.exe";; linux) echo "*.AppImage";; esac; }
extra_pat()    { case "$1" in linux) echo "*.deb";; *) echo "";; esac; }
os_dir()       { case "$1" in mac) echo mac;; win) echo windows;; linux) echo linux;; esac; }

# ══════════════════════════════════════════
#  1. BUILD
# ══════════════════════════════════════════
if [ "$DO_BUILD" = "1" ]; then
  step "Building desktop apps"
  if [ ! -d "$SHARED_DIR" ]; then die "Missing $SHARED_DIR"; fi
  if [ ! -d "$SHARED_DIR/node_modules" ]; then
    echo "  Installing desktop dependencies (first run)..."
    (cd "$SHARED_DIR" && npm install) || die "npm install failed"
  fi
  for p in $PLATFORMS; do
    echo "  Building $p..."
    if (cd "$SHARED_DIR" && npm run "build:$(build_target $p)") > /tmp/build-apps-$p.log 2>&1; then
      ok "$p built"
    else
      tail -20 "/tmp/build-apps-$p.log"
      die "$p build failed (full log: /tmp/build-apps-$p.log)"
    fi
  done
else
  step "Skipping build (--skip-build)"
fi

# ══════════════════════════════════════════
#  2. STAGE into server/osapps/  (+ clean old files)
# ══════════════════════════════════════════
if [ "$DO_STAGE" = "1" ]; then
  step "Staging builds into server/osapps/"
  shopt -s nullglob
  for p in $PLATFORMS; do
    DD="$(dist_dir $p)"
    PAT="$(pattern $p)"
    XPAT="$(extra_pat $p)"
    PDIR="$(os_dir $p)"
    mkdir -p "$OSAPPS/$PDIR"

    # Delete ALL older build files in the target osapps folder first,
    # so it only ever holds the latest artifacts.
    if [ "$CLEAN" = "1" ]; then
      REMOVED=0
      for old in "$OSAPPS/$PDIR"/*.dmg "$OSAPPS/$PDIR"/*.exe "$OSAPPS/$PDIR"/*.msi \
                 "$OSAPPS/$PDIR"/*.AppImage "$OSAPPS/$PDIR"/*.deb "$OSAPPS/$PDIR"/*.rpm \
                 "$OSAPPS/$PDIR"/*.blockmap "$OSAPPS/$PDIR"/*.zip; do
        rm -f "$old"
        REMOVED=$((REMOVED+1))
      done
      [ "$REMOVED" -gt 0 ] && ok "$PDIR: removed $REMOVED old file(s)"
    fi

    COUNT=0
    for PAT2 in "$PAT" "$XPAT"; do
      [ -n "$PAT2" ] || continue
      for f in "$DD"/$PAT2; do
        [ -e "$f" ] || continue
        base="$(basename "$f")"
        case "$base" in __*|*-portable*|*.blockmap) continue ;; esac
        cp "$f" "$OSAPPS/$PDIR/"
        COUNT=$((COUNT+1))
        ok "$p: $base ($(du -h "$f" | cut -f1))"
      done
    done
    [ "$COUNT" -gt 0 ] || warn "No $PAT found in $DD — run without --skip-build"
  done
  shopt -u nullglob
else
  step "Skipping stage (--skip-stage)"
fi

step "Done 🎉"
echo "" >&1
echo "Next steps:" >&1
echo "  • Full release (stage + upload to AWS): ./server/scripts/deploy-all.sh" >&1
echo "  • Serve locally:  cd server && npm start  →  http://localhost:3001/download" >&1
echo "" >&1
