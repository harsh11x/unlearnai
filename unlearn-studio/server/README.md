# Remap Studios — Server

Production backend for Remap Studios desktop app.

## Quick Deploy (AWS)

```bash
# 1. Clone or copy this folder to your server
scp -r ./* ubuntu@13.204.245.212:~/remap-server/

# 2. SSH in and run setup
ssh ubuntu@13.204.245.212
cd ~/remap-server
bash scripts/setup.sh

# 3. Edit .env with real credentials
nano .env
# Then restart: pm2 restart remap-server
```

## One-Command Release Deploy (local Mac → AWS)

From your Mac, builds all platforms and ships them to AWS:

```bash
cd server
npm run deploy:apps              # build mac+win+linux → stage → scp → verify
# or directly:
./scripts/deploy-all.sh
```

Just build + stage into `server/osapps/` (no upload)? One command:

```bash
cd server
npm run build:apps               # or: bash ../apps/desktop/scripts/build-apps.sh
```

`build-apps.sh` builds the mac/windows/linux apps, **deletes every older
installer in `server/osapps/{mac,windows,linux}/`**, and copies only the latest
builds in — so those folders always contain exactly the current artifacts.

Useful flags (both scripts):

| Flag | Effect |
|------|--------|
| `--platforms mac,win` | Build/stage/upload only those platforms (mac\|win\|linux) |
| `--skip-build` | Reuse builds already in `osapps/`, just stage/upload |
| `--skip-stage` | Build into `apps/dist/` only, don't touch `osapps/` |
| `--skip-upload` | Build + stage locally only (deploy-all.sh) |
| `--pull` | Also `git pull` on AWS (updates server code) |
| `--restart` | `pm2 restart remapstudios` after upload |
| `--no-clean` | Keep old versioned builds in `osapps/` |

Uploads go via **scp** (not git) because GitHub rejects files > 100 MB.

## What It Does

- **Razorpay Subscriptions** — Pro (₹999/mo) and Business (₹2,999/mo)
- **Firebase Auth** — Token verification for user identity
- **Supabase** — Database for users, subscriptions, payments, settings sync
- **Build Distribution** — Hosts desktop app builds for download
- **Auto-Update** — Desktop app checks for new versions on startup

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Server status |
| `/api/plans` | GET | No | List subscription plans |
| `/api/subscription` | GET | Yes | Current user's subscription |
| `/api/subscription/create` | POST | Yes | Create Razorpay subscription |
| `/api/subscription/cancel` | POST | Yes | Cancel subscription |
| `/api/subscription/sync` | POST | Yes | Sync subscription status from Razorpay (polling fallback) |
| `/api/payments` | GET | Yes | Payment history |
| `/api/webhooks/razorpay` | POST | No | Razorpay webhook handler |
| `/api/user/profile` | GET | Yes | User profile |
| `/api/update/check` | GET | No | Check for app updates |
| `/api/update/publish` | POST | No | Publish new version |
| `/api/builds` | GET | No | List available builds |
| `/api/builds/upload` | POST | Token | Upload a build |
| `/download` | GET | No | Download page (OS detection) |
| `/builds/:file` | GET | No | Direct build download |
| `/api/sync/settings` | GET/POST | Yes | Cross-device settings sync |
| `/api/sync/unlearn-history` | GET/POST | Yes | Cross-device history sync |

## Upload a Build

Manual single-file upload (auto-detects mac/windows/linux from filename):

```bash
./scripts/upload-build.sh "../apps/desktop/dist/mac/Remap Studios-1.0.0-arm64.dmg"
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay Dashboard
- `RAZORPAY_WEBHOOK_SECRET` — from Razorpay webhook settings
- `RAZORPAY_PLAN_PRO_MONTHLY` / `RAZORPAY_PLAN_BUSINESS_MONTHLY` — plan IDs from Razorpay
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard
- `UPLOAD_TOKEN` — protects the build upload endpoint
