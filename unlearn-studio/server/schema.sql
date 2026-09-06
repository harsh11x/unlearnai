-- ═══════════════════════════════════════════════════════
--  REMAP STUDIOS — Supabase Schema (Production)
--  Run this in the Supabase SQL Editor to set up tables.
-- ═══════════════════════════════════════════════════════

-- Users table (synced from Firebase Auth)
CREATE TABLE IF NOT EXISTS users (
  uid         TEXT PRIMARY KEY,
  email       TEXT,
  name        TEXT,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions (Razorpay)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid                   TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  plan                  TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'business')),
  status                TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id  TEXT,
  razorpay_plan_id      TEXT,
  razorpay_payment_id   TEXT,
  amount                INTEGER DEFAULT 0,  -- in paise/cents
  currency              TEXT DEFAULT 'INR',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN DEFAULT false,
  started_at            TIMESTAMPTZ DEFAULT now(),
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Payment history (Razorpay transactions)
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid                   TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  razorpay_payment_id   TEXT UNIQUE,
  razorpay_order_id     TEXT,
  razorpay_subscription_id TEXT,
  amount                INTEGER NOT NULL,  -- in paise/cents
  currency              TEXT DEFAULT 'INR',
  status                TEXT DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  description           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Razorpay events log (for webhook debugging)
CREATE TABLE IF NOT EXISTS razorpay_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        TEXT UNIQUE,
  event_type      TEXT NOT NULL,
  payload         JSONB,
  processed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- User settings sync (cross-device)
CREATE TABLE IF NOT EXISTS user_settings (
  uid         TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  settings    JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Unlearning job history
CREATE TABLE IF NOT EXISTS unlearn_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid          TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  model_name   TEXT,
  target       TEXT,
  method       TEXT,
  steps        INTEGER,
  status       TEXT DEFAULT 'completed',
  nodes_erased INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- App versions (for auto-update)
CREATE TABLE IF NOT EXISTS app_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version         TEXT NOT NULL UNIQUE,
  platform        TEXT NOT NULL CHECK (platform IN ('darwin', 'win32', 'linux', 'all')),
  architecture    TEXT DEFAULT 'arm64',
  download_url    TEXT NOT NULL,
  release_notes   TEXT,
  file_size       INTEGER,
  sha256          TEXT,
  published_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_uid ON subscriptions(uid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_uid ON payments(uid);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_events_type ON razorpay_events(event_type);
CREATE INDEX IF NOT EXISTS idx_unlearn_history_uid ON unlearn_history(uid);
CREATE INDEX IF NOT EXISTS idx_unlearn_history_created ON unlearn_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform, published_at DESC);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlearn_history ENABLE ROW LEVEL SECURITY;
-- Note: app_versions and razorpay_events are server-only, no RLS needed

-- Policies
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = uid);
CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Users can read own settings" ON user_settings FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid()::text = uid);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = uid);
CREATE POLICY "Users can read own history" ON unlearn_history FOR SELECT USING (auth.uid()::text = uid);
CREATE POLICY "Users can insert own history" ON unlearn_history FOR INSERT WITH CHECK (auth.uid()::text = uid);
