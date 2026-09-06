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
