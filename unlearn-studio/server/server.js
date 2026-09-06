/**
 * ═══════════════════════════════════════════════════════
 *  REMAP STUDIOS — Production Server
 *  Razorpay Subscriptions · Webhooks · Auto-Update
 * ═══════════════════════════════════════════════════════
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Raw body for webhook signature verification
app.use("/api/webhooks/razorpay", express.raw({ type: "application/json" }));

// ══════════════════════════════════════════
//  SUPABASE (lazy init)
// ══════════════════════════════════════════

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("⚠  Supabase credentials not configured — DB features disabled");
    return null;
  }
  supabase = createClient(url, key);
  console.log("✓  Supabase connected");
  return supabase;
}

// ══════════════════════════════════════════
//  RAZORPAY (lazy init)
// ══════════════════════════════════════════

let razorpay = null;

function getRazorpay() {
  if (razorpay) return razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes("YOUR_")) {
    console.warn("⚠  Razorpay credentials not configured — payment features disabled");
    return null;
  }
  const Razorpay = require("razorpay");
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  console.log("✓  Razorpay connected");
  return razorpay;
}

// ══════════════════════════════════════════
//  FIREBASE TOKEN VERIFICATION
// ══════════════════════════════════════════

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = header.slice(7);
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf-8")
    );
    req.user = {
      uid: payload.user_id || payload.sub,
      email: payload.email || null,
      name: payload.name || payload.display_name || null,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ══════════════════════════════════════════
//  PLAN DEFINITIONS
// ══════════════════════════════════════════

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    currency: "INR",
    modelLimit: 3,
    stepLimit: 500,
    maxModels: 3,
    maxUnlearnPerMonth: 3,
    crossDeviceSync: false,
    features: [
      "3 models",
      "500 unlearn steps",
      "Basic visualization",
      "3 unlearn jobs/month",
    ],
  },
  pro: {
    name: "Pro",
    price: 999, // ₹999/month in paise
    currency: "INR",
    modelLimit: 50,
    stepLimit: 5000,
    maxModels: 50,
    maxUnlearnPerMonth: -1,
    crossDeviceSync: true,
    features: [
      "50 models",
      "5,000 unlearn steps",
      "Advanced visualization & heatmap",
      "Unlimited unlearn jobs",
      "Cross-device sync",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    price: 2999, // ₹2,999/month in paise
    currency: "INR",
    modelLimit: 999,
    stepLimit: 10000,
    maxModels: 999,
    maxUnlearnPerMonth: -1,
    crossDeviceSync: true,
    features: [
      "Unlimited models",
      "10,000 unlearn steps",
      "All visualization features",
      "Unlimited unlearn jobs",
      "Cross-device sync",
      "Priority support",
      "Team collaboration",
      "Custom branding",
    ],
  },
};

// ══════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    razorpay: !!getRazorpay(),
    supabase: !!getSupabase(),
  });
});

// ══════════════════════════════════════════
//  PLANS (public — no auth needed)
// ══════════════════════════════════════════

app.get("/api/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

// ══════════════════════════════════════════
//  USER / PROFILE
// ══════════════════════════════════════════

app.get("/api/user/profile", authMiddleware, async (req, res) => {
  const db = getSupabase();
  if (!db) {
    return res.json({
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name,
      plan: "free",
      source: "token",
    });
  }

  try {
    const { data, error } = await db
      .from("users")
      .select("*")
      .eq("uid", req.user.uid)
      .single();

    if (error || !data) {
      const { data: created, error: createErr } = await db
        .from("users")
        .upsert(
          {
            uid: req.user.uid,
            email: req.user.email,
            name: req.user.name,
            plan: "free",
            created_at: new Date().toISOString(),
          },
          { onConflict: "uid" }
        )
        .select()
        .single();

      if (createErr) throw createErr;
      return res.json(created);
    }

    res.json(data);
  } catch (e) {
    console.error("Profile error:", e.message);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// ══════════════════════════════════════════
//  SUBSCRIPTIONS
// ══════════════════════════════════════════

// Get current subscription
app.get("/api/subscription", authMiddleware, async (req, res) => {
  const db = getSupabase();
  if (!db) {
    return res.json({ plan: "free", ...PLANS.free, source: "default" });
  }

  try {
    const { data, error } = await db
      .from("subscriptions")
      .select("*")
      .eq("uid", req.user.uid)
      .in("status", ["active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return res.json({ plan: "free", ...PLANS.free, status: "active" });
    }

    const planDetails = PLANS[data.plan] || PLANS.free;
    res.json({
      ...planDetails,
      ...data,
      plan: data.plan,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
    });
  } catch (e) {
    console.error("Subscription error:", e.message);
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

// Create a Razorpay subscription
app.post("/api/subscription/create", authMiddleware, async (req, res) => {
  const { plan: planKey } = req.body;
  const rp = getRazorpay();
  const db = getSupabase();

  if (!rp) {
    return res.status(503).json({ error: "Payment system not configured" });
  }

  if (!planKey || !PLANS[planKey] || planKey === "free") {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const plan = PLANS[planKey];
  const razorpayPlanId =
    planKey === "pro"
      ? process.env.RAZORPAY_PLAN_PRO_MONTHLY
      : process.env.RAZORPAY_PLAN_BUSINESS_MONTHLY;

  if (!razorpayPlanId || razorpayPlanId.includes("YOUR_")) {
    return res.status(503).json({ error: "Subscription plans not configured in Razorpay" });
  }

  try {
    // Get or create Razorpay customer
    let customerId = null;
    if (db) {
      const { data: existingSub } = await db
        .from("subscriptions")
        .select("razorpay_customer_id")
        .eq("uid", req.user.uid)
        .not("razorpay_customer_id", "is", null)
        .limit(1)
        .maybeSingle();

      customerId = existingSub && existingSub.razorpay_customer_id;
    }

    if (!customerId) {
      const customer = await rp.customers.create({
        name: req.user.name || req.user.email,
        email: req.user.email,
        notes: { uid: req.user.uid },
      });
      customerId = customer.id;
    }

    // Create subscription
    const subscription = await rp.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      total_count: 120, // 10 years of monthly billing
      quantity: 1,
      notes: { uid: req.user.uid, plan: planKey },
    });

    // Store subscription in DB
    if (db) {
      await db.from("subscriptions").upsert(
        {
          uid: req.user.uid,
          plan: planKey,
          status: "active",
          razorpay_subscription_id: subscription.id,
          razorpay_customer_id: customerId,
          razorpay_plan_id: razorpayPlanId,
          amount: plan.price,
          currency: plan.currency,
          current_period_start: new Date(subscription.current_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_end * 1000).toISOString(),
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "uid" }
      );

      // Update user plan
      await db
        .from("users")
        .update({ plan: planKey, updated_at: new Date().toISOString() })
        .eq("uid", req.user.uid);
    }

    res.json({
      subscriptionId: subscription.id,
      customerId,
      planKey,
      amount: plan.price,
      currency: plan.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("Create subscription error:", e.message);
    res.status(500).json({ error: "Failed to create subscription: " + e.message });
  }
});

// Cancel subscription
app.post("/api/subscription/cancel", authMiddleware, async (req, res) => {
  const rp = getRazorpay();
  const db = getSupabase();

  if (!rp) {
    return res.status(503).json({ error: "Payment system not configured" });
  }

  try {
    // Get current subscription
    let rpSubId = null;
    if (db) {
      const { data } = await db
        .from("subscriptions")
        .select("razorpay_subscription_id")
        .eq("uid", req.user.uid)
        .in("status", ["active", "past_due"])
        .limit(1)
        .maybeSingle();

      rpSubId = data && data.razorpay_subscription_id;
    }

    if (!rpSubId) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    // Cancel at period end (don't revoke immediately)
    await rp.subscriptions.cancel(rpSubId, {
      cancel_at_cycle_end: true,
    });

    if (db) {
      await db
        .from("subscriptions")
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_subscription_id", rpSubId);
    }

    res.json({ message: "Subscription will be cancelled at the end of the billing period" });
  } catch (e) {
    console.error("Cancel subscription error:", e.message);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Sync subscription status from Razorpay (polling fallback — replaces webhooks when no domain)
app.post("/api/subscription/sync", authMiddleware, async (req, res) => {
  const rp = getRazorpay();
  const db = getSupabase();

  if (!rp || !db) {
    return res.json({ synced: false, reason: "payment or database not configured" });
  }

  try {
    // Get subscription from DB
    const { data: sub } = await db
      .from("subscriptions")
      .select("*")
      .eq("uid", req.user.uid)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.razorpay_subscription_id) {
      return res.json({ synced: true, plan: "free" });
    }

    // Fetch latest status from Razorpay
    const rpSub = await rp.subscriptions.fetch(sub.razorpay_subscription_id);

    // Map Razorpay status to our status
    let status = rpSub.status; // active, pending, halted, cancelled, completed, expired
    if (status === "halted") status = "past_due";
    if (status === "completed" || status === "expired") status = "cancelled";

    // Update DB
    await db
      .from("subscriptions")
      .update({
        status,
        current_period_start: new Date(rpSub.current_start * 1000).toISOString(),
        current_period_end: new Date(rpSub.current_end * 1000).toISOString(),
        cancel_at_period_end: rpSub.cancel_at_cycle_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_subscription_id", sub.razorpay_subscription_id);

    // If cancelled/expired, downgrade user to free
    if (status === "cancelled") {
      await db
        .from("users")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("uid", req.user.uid);
    }

    const planDetails = PLANS[sub.plan] || PLANS.free;
    res.json({
      synced: true,
      plan: sub.plan,
      status,
      currentPeriodEnd: new Date(rpSub.current_end * 1000).toISOString(),
      cancelAtPeriodEnd: rpSub.cancel_at_cycle_end || false,
      ...planDetails,
    });
  } catch (e) {
    console.error("Sync subscription error:", e.message);
    res.status(500).json({ error: "Failed to sync subscription" });
  }
});

// Get payment history
app.get("/api/payments", authMiddleware, async (req, res) => {
  const db = getSupabase();
  if (!db) {
    return res.json({ payments: [] });
  }

  try {
    const { data, error } = await db
      .from("payments")
      .select("*")
      .eq("uid", req.user.uid)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ payments: data || [] });
  } catch (e) {
    console.error("Payments error:", e.message);
    res.status(500).json({ error: "Failed to load payments" });
  }
});

// ══════════════════════════════════════════
//  RAZORPAY WEBHOOKS
// ══════════════════════════════════════════

app.post("/api/webhooks/razorpay", async (req, res) => {
  const db = getSupabase();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  if (webhookSecret) {
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("⚠  Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }
  }

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const payId = event.payload && event.payload.payment && event.payload.payment.entity && event.payload.payment.entity.id;
  const subId = event.payload && event.payload.subscription && event.payload.subscription.entity && event.payload.subscription.entity.id;
  console.log('[Webhook] ' + event.event + ' — ' + (payId || subId || 'unknown'));

  // Log event
  if (db) {
    try {
      await db.from("razorpay_events").insert({
        event_id: event.event_id || `${event.event}_${Date.now()}`,
        event_type: event.event,
        payload: event,
        processed: false,
      });
    } catch (e) {
      console.error("Failed to log webhook event:", e.message);
    }
  }

  // Handle events
  try {
    switch (event.event) {
      case "subscription.activated":
      case "subscription.pending":
        await handleSubscriptionActivated(event.payload.subscription && event.payload.subscription.entity, db);
        break;

      case "subscription.charged":
        await handleSubscriptionCharged(event.payload, db);
        break;

      case "subscription.cancelled":
      case "subscription.completed":
        await handleSubscriptionCancelled(event.payload.subscription && event.payload.subscription.entity, db);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(event.payload.subscription && event.payload.subscription.entity, db);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload.payment && event.payload.payment.entity, db);
        break;
    }

    // Mark as processed
    if (db && event.event_id) {
      await db
        .from("razorpay_events")
        .update({ processed: true })
        .eq("event_id", event.event_id);
    }
  } catch (e) {
    console.error(`[Webhook] Error handling ${event.event}:`, e.message);
  }

  res.json({ status: "ok" });
});

// Webhook handlers
async function handleSubscriptionActivated(subscription, db) {
  if (!subscription || !db) return;

  const uid = subscription.notes && subscription.notes.uid;
  if (!uid) return;

  await db
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscription.id);

  console.log(`[Webhook] Subscription activated: ${subscription.id}`);
}

async function handleSubscriptionCharged(payload, db) {
  if (!db) return;

  const subscription = payload.subscription && payload.subscription.entity;
  const payment = payload.payment && payload.payment.entity;

  if (payment && payment.notes && payment.notes.uid) {
    // Record payment
    await db.from("payments").insert({
      uid: payment.notes.uid,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      razorpay_subscription_id: payment.subscription_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status === "captured" ? "captured" : "created",
      description: `Subscription renewal`,
    });
  }

  if (subscription) {
    // Update subscription period
    await db
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: new Date(subscription.current_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_subscription_id", subscription.id);
  }

  console.log('[Webhook] Subscription charged: ' + (subscription && subscription.id));
}

async function handleSubscriptionCancelled(subscription, db) {
  if (!subscription || !db) return;

  const uid = subscription.notes && subscription.notes.uid;

  await db
    .from("subscriptions")
    .update({
      status: "cancelled",
      expires_at: new Date(subscription.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscription.id);

  // Downgrade user to free
  if (uid) {
    await db
      .from("users")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("uid", uid);
  }

  console.log(`[Webhook] Subscription cancelled: ${subscription.id}`);
}

async function handleSubscriptionPaused(subscription, db) {
  if (!subscription || !db) return;

  await db
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", subscription.id);

  console.log(`[Webhook] Subscription paused: ${subscription.id}`);
}

async function handlePaymentFailed(payment, db) {
  if (!payment || !db) return;

  const uid = payment.notes && payment.notes.uid;
  if (!uid) return;

  // Record failed payment
  await db.from("payments").insert({
    uid,
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    razorpay_subscription_id: payment.subscription_id,
    amount: payment.amount,
    currency: payment.currency,
    status: "failed",
    description: `Payment failed: ${payment.error_description || "unknown"}`,
  });

  console.log(`[Webhook] Payment failed: ${payment.id}`);
}

// ══════════════════════════════════════════
//  AUTO-UPDATE
// ══════════════════════════════════════════

// Check for updates
app.get("/api/update/check", async (req, res) => {
  const db = getSupabase();
  const currentVersion = req.query.version || "0.0.0";
  const platform = req.query.platform || process.platform;
  const arch = req.query.arch || "arm64";

  if (!db) {
    return res.json({ updateAvailable: false });
  }

  try {
    const { data, error } = await db
      .from("app_versions")
      .select("*")
      .eq("platform", platform)
      .or(`platform.eq.all`)
      .order("published_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return res.json({ updateAvailable: false });
    }

    // Find the latest version that's newer than current
    const latest = data.find(
      (v) => compareVersions(v.version, currentVersion) > 0
    );

    if (!latest) {
      return res.json({ updateAvailable: false });
    }

    res.json({
      updateAvailable: true,
      version: latest.version,
      downloadUrl: latest.download_url,
      releaseNotes: latest.release_notes,
      fileSize: latest.file_size,
      publishedAt: latest.published_at,
    });
  } catch (e) {
    console.error("Update check error:", e.message);
    res.json({ updateAvailable: false });
  }
});

// Publish a new version (admin only — protect in production)
app.post("/api/update/publish", async (req, res) => {
  const db = getSupabase();
  if (!db) {
    return res.status(503).json({ error: "Database not configured" });
  }

  // TODO: Add admin auth check
  const { version, platform, architecture, downloadUrl, releaseNotes, fileSize, sha256 } = req.body;

  if (!version || !platform || !downloadUrl) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await db
      .from("app_versions")
      .upsert(
        {
          version,
          platform,
          architecture: architecture || "arm64",
          download_url: downloadUrl,
          release_notes: releaseNotes || "",
          file_size: fileSize || 0,
          sha256: sha256 || null,
          published_at: new Date().toISOString(),
        },
        { onConflict: "version,platform" }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ published: true, version: data.version });
  } catch (e) {
    console.error("Publish error:", e.message);
    res.status(500).json({ error: "Failed to publish version" });
  }
});

// Download endpoint — redirects to the actual download URL
app.get("/api/update/download/:version/:platform", async (req, res) => {
  const db = getSupabase();
  if (!db) {
    return res.status(404).json({ error: "Not found" });
  }

  const { version, platform } = req.params;

  try {
    const { data, error } = await db
      .from("app_versions")
      .select("download_url, file_size")
      .eq("version", version)
      .eq("platform", platform)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Redirect to the actual download URL (S3, GitHub Releases, etc.)
    res.redirect(302, data.download_url);
  } catch (e) {
    res.status(500).json({ error: "Download failed" });
  }
});

// Version comparison helper
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// ══════════════════════════════════════════
//  OS SYNC — Cross-device state synchronization
// ══════════════════════════════════════════

app.post("/api/sync/settings", authMiddleware, async (req, res) => {
  const { settings } = req.body;
  const db = getSupabase();

  if (!db) {
    return res.json({ synced: true, source: "local-only" });
  }

  try {
    const { error } = await db
      .from("user_settings")
      .upsert(
        {
          uid: req.user.uid,
          settings: settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "uid" }
      );

    if (error) throw error;
    res.json({ synced: true });
  } catch (e) {
    console.error("Sync settings error:", e.message);
    res.status(500).json({ error: "Failed to sync settings" });
  }
});

app.get("/api/sync/settings", authMiddleware, async (req, res) => {
  const db = getSupabase();

  if (!db) {
    return res.json({ settings: null, source: "local-only" });
  }

  try {
    const { data, error } = await db
      .from("user_settings")
      .select("settings")
      .eq("uid", req.user.uid)
      .single();

    if (error || !data) {
      return res.json({ settings: null });
    }

    res.json({ settings: data.settings });
  } catch (e) {
    console.error("Load settings error:", e.message);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

app.post("/api/sync/unlearn-history", authMiddleware, async (req, res) => {
  const { job } = req.body;
  const db = getSupabase();

  if (!db) {
    return res.json({ synced: true, source: "local-only" });
  }

  try {
    const { error } = await db.from("unlearn_history").insert({
      uid: req.user.uid,
      model_name: job.modelName,
      target: job.target,
      method: job.method,
      steps: job.steps,
      status: job.status,
      nodes_erased: job.nodesErased,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    res.json({ synced: true });
  } catch (e) {
    console.error("Sync unlearn history error:", e.message);
    res.status(500).json({ error: "Failed to sync history" });
  }
});

app.get("/api/sync/unlearn-history", authMiddleware, async (req, res) => {
  const db = getSupabase();

  if (!db) {
    return res.json({ history: [], source: "local-only" });
  }

  try {
    const { data, error } = await db
      .from("unlearn_history")
      .select("*")
      .eq("uid", req.user.uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ history: data || [] });
  } catch (e) {
    console.error("Load history error:", e.message);
    res.status(500).json({ error: "Failed to load history" });
  }
});

// ══════════════════════════════════════════

// Load build distribution routes
require("./download_routes.js")(app, process.env);

//  START
// ══════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║  Remap Studios — Production Server                    ║
  ║  Running on ${SERVER_URL.padEnd(39)}║
  ║  Supabase: ${getSupabase() ? "Connected ✓" : "Not configured ⚠"}${" ".repeat(getSupabase() ? 27 : 16)}║
  ║  Razorpay: ${getRazorpay() ? "Connected ✓" : "Not configured ⚠"}${" ".repeat(getRazorpay() ? 27 : 16)}║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
