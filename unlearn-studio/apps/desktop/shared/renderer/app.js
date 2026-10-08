// ══════════════════════════════════════════════════════════
// REMAP STUDIOS — Professional Neural Network IDE
// ══════════════════════════════════════════════════════════

const API = window.electronAPI;

// ── Lazy script loader ──
// PERF: Firebase + Razorpay used to be <script> tags loaded up-front, which
// blocked first paint AND app.js on slow networks — the whole app felt dead:
// even "Continue as Guest" did nothing because its click handler wasn't
// attached yet. They are now fetched on demand, so the login screen paints
// instantly and the dashboard is one click away.
const _scriptCache = new Map();
function loadScript(src) {
  if (_scriptCache.has(src)) return _scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
  _scriptCache.set(src, p);
  return p;
}

// Kick Firebase off after first paint. Google sign-in won't be usable for a
// few hundred ms after launch — guest sign-in and the whole dashboard are.
// Razorpay only loads if a paid upgrade is actually started.
function scheduleLazySdkLoads() {
  const load = () => {
    loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
      .then(() => loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"))
      .then(() => { if (!currentUser || !currentUser.isGuest) initFirebase(); })
      .catch((e) => console.warn("[Auth] Firebase SDK load failed:", e.message));
  };
  if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 300);
}

// ── Server API ──
// HTTP on purpose: the AWS server has no TLS cert yet (raw IP). If you add a
// domain + SSL later, switch this back to https.
const SERVER_URL = "http://13.204.245.212:3001";

function isGuest() {
  return !!(currentUser && currentUser.isGuest);
}

async function serverAPI(endpoint, options = {}) {
  if (isGuest()) {
    // Guests have no Firebase token — skip server calls silently instead of
    // throwing and spamming the console with CORS/auth errors.
    throw new Error("Guests cannot use cloud features. Sign in with Google to sync.");
  }
  const user = firebaseAuth ? firebaseAuth.currentUser : null;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (user) {
    try {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (e) {
      console.warn("[ServerAPI] Could not get token:", e.message);
    }
  }
  try {
    const res = await fetch(`${SERVER_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[ServerAPI] ${endpoint} failed:`, e.message);
    throw e;
  }
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBI6mgxY6uWTDb_ib8tCgPhz-3xCWQzukI",
  authDomain: "remapstudios-5b9b0.firebaseapp.com",
  projectId: "remapstudios-5b9b0",
  storageBucket: "remapstudios-5b9b0.firebasestorage.app",
  messagingSenderId: "215400190992",
  appId: "1:215400190992:web:ed670be9ba1794acf9e695",
};

let firebaseApp = null;
let firebaseAuth = null;
let currentUser = null;

// ── Guest sign-in ──
// No network required: creates a local-only user so people can explore the
// app (load/visualise models on their machine) without a Firebase account.
// PERF: fully synchronous — one click, instant dashboard, zero network calls.
function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("remap_user") || "null");
  } catch (e) {
    return null; // corrupt cache — ignore
  }
}

function restoreSavedSession() {
  // Runs before Firebase init: any stored user (guest OR real) gets the
  // dashboard immediately, so the login screen never flashes on relaunch.
  const saved = getSavedUser();
  if (saved && (saved.isGuest || saved.uid)) {
    currentUser = saved;
    showApp();
    updateSettingsUserInfo();
    return true;
  }
  return false;
}

function signInAsGuest() {
  // Reuse the same guest identity across restarts so "Continue as Guest"
  // always feels like returning to your own dashboard.
  const saved = getSavedUser();
  currentUser = (saved && saved.isGuest)
    ? saved
    : {
        uid: "guest-" + Math.random().toString(36).slice(2, 10),
        email: "guest@localhost",
        displayName: "Guest User",
        photoURL: null,
        isGuest: true,
        signedInAt: Date.now(),
      };
  localStorage.setItem("remap_user", JSON.stringify(currentUser));
  showApp();
  updateSettingsUserInfo();
  toast("Welcome, guest! Explore everything locally — cloud sync is disabled.", "info", 4000);
  log("Signed in as guest — cloud sync & subscriptions disabled.", "info");
  // Firebase isn't needed for guests; load it in the background anyway so
  // "Continue with Google" works later without a reload.
  scheduleLazySdkLoads();
}

function showAuthScreen() {
  document.getElementById("auth-screen")?.classList.remove("hidden");
  const main = document.getElementById("main-layout");
  const bar = document.getElementById("bottombar");
  const panel = document.getElementById("bottom-panel");
  if (main) main.style.display = "none";
  if (bar) bar.style.display = "none";
  if (panel) panel.style.display = "none";
}

function showApp() {
  document.getElementById("auth-screen")?.classList.add("hidden");
  const main = document.getElementById("main-layout");
  const bar = document.getElementById("bottombar");
  const panel = document.getElementById("bottom-panel");
  if (main) main.style.display = "";
  if (bar) bar.style.display = "";
  if (panel) panel.style.display = "";
}

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK not loaded, skipping auth");
    showApp();
    return;
  }

  try {
    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    }
    firebaseAuth = firebase.auth();

    // CRITICAL: setPersistence → getRedirectResult → registerAuthListener
    // getRedirectResult MUST run BEFORE onAuthStateChanged
    firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log("[Auth] Persistence set, checking redirect...");
        return firebaseAuth.getRedirectResult();
      })
      .then((result) => {
        if (result && result.credential) {
          console.log("[Auth] Redirect sign-in OK:", result.user?.email);
        } else {
          console.log("[Auth] No redirect result");
        }
        registerAuthListener();
      })
      .catch((e) => {
        console.warn("[Auth] Redirect/persistence error:", e.message);
        registerAuthListener();
      });
  } catch (e) {
    console.error("[Auth] Firebase init error:", e);
    showApp();
  }
}

function registerAuthListener() {
  firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isGuest: false,
      };
      localStorage.setItem("remap_user", JSON.stringify(currentUser));
      console.log("[Auth] Signed in:", user.email);
      showApp();
      updateSettingsUserInfo();
      if (user.email === "harshdevsingh2004@gmail.com") {
        assignBusinessPlan(user.uid);
      }
    } else if (currentUser && currentUser.isGuest) {
      // Guest session active — Firebase has no user but that's expected.
      console.log("[Auth] Guest session active, staying in app");
      return;
    } else {
      currentUser = null;
      localStorage.removeItem("remap_user");
      console.log("[Auth] No user, showing login");
      showAuthScreen();
    }
  });

  // Safety: show app after 5s if auth never resolves. Fall back to a guest
  // session rather than a no-user limbo — otherwise Settings shows "Not
  // signed in" and Sign Out silently does nothing, with no way back to login.
  setTimeout(() => {
    if (!currentUser) {
      console.warn("[Auth] Timed out, falling back to guest");
      signInAsGuest();
    }
  }, 5000);
}

function assignBusinessPlan(uid) {
  if (!firebaseAuth) return;
  firebaseAuth.currentUser?.getIdToken(true).then(() => {
    fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=plan&updateMask.fieldPaths=modelLimit&updateMask.fieldPaths=stepLimit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          plan: { stringValue: "business" },
          modelLimit: { integerValue: 999 },
          stepLimit: { integerValue: 10000 },
        },
      }),
    }).catch(() => {});
  }).catch(() => {});
}

function initAuthHandlers() {
  // Logout
  document.getElementById("settings-logout-btn")?.addEventListener("click", logoutUser);

  // Guest sign-in — local-only session, no account needed
  document.getElementById("auth-guest-btn")?.addEventListener("click", () => {
    try {
      signInAsGuest();
    } catch (e) {
      console.error("[Auth] Guest sign-in error:", e);
      showAuthErr("auth-error", "Guest sign-in failed: " + e.message);
    }
  });

  // Google sign-in via Firebase redirect (works in Electron)
  document.getElementById("auth-google-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("auth-google-btn");
    try {
      btn.disabled = true;
      btn.textContent = "Redirecting to Google...";
      // Firebase loads lazily now — make sure it's actually there before use.
      if (!firebaseAuth) {
        await loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js");
        initFirebase();
      }
      if (!firebaseAuth) throw new Error("Auth is still initializing, try again in a moment");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await firebaseAuth.signInWithRedirect(provider);
    } catch (e) {
      console.error("[Auth] Google sign-in error:", e);
      showAuthErr("auth-error", e.message || "Google sign-in failed");
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google';
    }
  });

  // Apple sign-in (not yet implemented)
  document.getElementById("auth-apple-btn")?.addEventListener("click", () => {
    showAuthErr("auth-error", "Apple sign-in is not yet supported");
  });

  // Email login
  document.getElementById("auth-email-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const btn = document.getElementById("auth-submit-btn");
    btn.disabled = true; btn.textContent = "Signing in...";
    try {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      const errors = {
        "auth/user-not-found": "No account found",
        "auth/wrong-password": "Incorrect password",
        "auth/invalid-credential": "Invalid email or password",
        "auth/too-many-requests": "Too many attempts",
        "auth/invalid-email": "Invalid email address",
      };
      showAuthErr("auth-error", errors[err.code] || err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Sign In";
    }
  });
}

function showAuthErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

// ── Toast notifications ──
// Stacked, deduplicated, optionally action-bearing notifications. Repeated
// identical messages collapse into a counter instead of flooding the stack
// (a failing poll loop used to push one toast per tick), and errors stay put
// until dismissed so they are never missed while the window is unfocused.
const TOAST_ICONS = { info: "i", success: "\u2713", warning: "!", error: "\u2715" };
const TOAST_MAX = 5;
const _toastRecent = new Map();

function toast(message, type = "info", duration = 3500, opts = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return null;

  // Dedupe: an identical message within 4s bumps a counter on the live toast.
  const dedupeKey = `${type}\u0000${message}`;
  const prev = _toastRecent.get(dedupeKey);
  if (prev && prev.el.isConnected && Date.now() - prev.at < 4000) {
    prev.count += 1;
    prev.at = Date.now();
    const badge = prev.el.querySelector(".toast-count");
    if (badge) badge.textContent = `\u00d7${prev.count}`;
    prev.el.classList.remove("toast-pulse");
    void prev.el.offsetWidth; // restart the animation
    prev.el.classList.add("toast-pulse");
    if (prev.timer) clearTimeout(prev.timer);
    if (type !== "error" && duration > 0) {
      prev.timer = setTimeout(() => dismissToast(prev.el), duration);
    }
    return prev.el;
  }

  // Cap the stack — drop the oldest dismissible toast first so a burst never
  // covers the UI.
  const live = [...container.querySelectorAll(".toast:not(.out)")];
  if (live.length >= TOAST_MAX) {
    const victim = live.find((t) => t.dataset.sticky !== "1") || live[0];
    dismissToast(victim);
  }

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = TOAST_ICONS[type] || "i";
  el.appendChild(icon);

  const body = document.createElement("span");
  body.className = "toast-body";
  body.textContent = message;
  el.appendChild(body);

  const count = document.createElement("span");
  count.className = "toast-count";
  el.appendChild(count);

  if (opts.action && typeof opts.onAction === "function") {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.textContent = opts.action;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try { opts.onAction(); } finally { dismissToast(el); }
    });
    el.appendChild(btn);
  }

  const close = document.createElement("button");
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "\u00d7";
  close.addEventListener("click", (e) => { e.stopPropagation(); dismissToast(el); });
  el.appendChild(close);

  // Errors and warnings never auto-vanish: they usually mean the user has to
  // act, and silently deleting the evidence is worse than a sticky card.
  const sticky = opts.sticky === true || (type === "error" && opts.sticky !== false);
  if (sticky) el.dataset.sticky = "1";

  container.appendChild(el);

  const rec = { el, count: 1, at: Date.now(), timer: null };
  _toastRecent.set(dedupeKey, rec);
  if (duration > 0 && !sticky) rec.timer = setTimeout(() => dismissToast(el), duration);
  return el;
}

function dismissToast(el) {
  if (!el || !el.isConnected || el.classList.contains("out")) return;
  el.classList.add("out");
  setTimeout(() => {
    el.remove();
    // Drop the dedupe entry once its toast is gone so the same message can
    // reappear later without being counted against a dead element.
    for (const [k, v] of _toastRecent) if (v.el === el) _toastRecent.delete(k);
  }, 200);
}

function clearToasts() {
  document.querySelectorAll("#toast-container .toast").forEach(dismissToast);
}

// ══════════════════════════════════════════
// SETTINGS STORE
// ══════════════════════════════════════════
// One spec drives the UI wiring, persistence and the live effect of every
// preference, so adding a setting means adding one entry here plus its markup.
// The durable copy lives in the main process (userData/settings.json) — the
// renderer keeps a localStorage mirror purely so the first paint uses the
// right values instead of flashing defaults.
const SETTINGS_SPEC = {
  autoload:   { type: "bool",   def: true,           label: "Auto-load last model" },
  welcome:    { type: "bool",   def: true,           label: "Show welcome screen" },
  gpu:        { type: "bool",   def: true,           label: "GPU acceleration" },
  animSpeed:  { type: "enum",   def: "normal",       label: "Node animation speed" },
  connections:{ type: "bool",   def: true,           label: "Show connection lines" },
  defaultMethod: { type: "enum", def: "retain_aware", label: "Default unlearn method" },
  sizes:      { type: "map",    def: {},             label: "Panel sizes" },
  autosave:   { type: "bool",   def: true,           label: "Auto-save checkpoints" },
  pythonPath: { type: "string", def: "",             label: "Preferred interpreter" },
  device:     { type: "enum",   def: "auto",         label: "Compute device" },
  heatmapColor: { type: "enum", def: "grayscale",    label: "Heatmap colour scheme" },
  lastModelPath: { type: "string", def: "",          label: "Last model" },
  recentModels:  { type: "list",  def: [],            label: "Recent models" },
};

const SETTINGS_LS_KEY = "remap_settings";
const ANIM_SPEED_SCALE = { slow: 0.35, normal: 1, fast: 2.4, off: 0 };

function defaultSettings() {
  const out = {};
  for (const [k, spec] of Object.entries(SETTINGS_SPEC)) {
    out[k] = Array.isArray(spec.def) ? [] : (spec.type === "map" ? {} : spec.def);
  }
  return out;
}

function loadSettingsFromCache() {
  const settings = defaultSettings();
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_LS_KEY) || "null");
    if (raw && typeof raw === "object") {
      for (const k of Object.keys(SETTINGS_SPEC)) {
        if (Object.prototype.hasOwnProperty.call(raw, k)) settings[k] = raw[k];
      }
    }
  } catch (e) { /* corrupted cache — defaults are fine */ }
  return settings;
}

function cacheSettings() {
  try { localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(state.settings)); } catch (e) { /* quota */ }
}

// Coerce whatever came out of the settings file into the shape the spec wants,
// so a hand-edited JSON file cannot inject a bad enum or a non-array list.
function coerceSetting(key, value) {
  const spec = SETTINGS_SPEC[key];
  if (!spec) return undefined;
  if (spec.type === "bool") return value !== false && value !== "false" && value !== 0;
  if (spec.type === "enum") {
    const allowed = { animSpeed: ["slow", "normal", "fast", "off"], defaultMethod: ["retain_aware", "gradient_forget"], device: ["auto", "cpu", "mps", "cuda"], heatmapColor: ["grayscale", "viridis", "magma", "inferno", "coolwarm"] }[key];
    if (allowed && !allowed.includes(value)) return spec.def;
    return value;
  }
  if (spec.type === "list") return Array.isArray(value) ? value : [];
  if (spec.type === "map") return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (spec.type === "string") return typeof value === "string" ? value : (value == null ? "" : String(value));
  return value;
}

// Pull the durable copy from the main process once, at boot.
async function initSettingsStore() {
  state.settings = loadSettingsFromCache();
  // Legacy keys from earlier builds: the fake "Backend port" field and the
  // one-off heatmap migration flag. Dropped so they never get re-saved.
  delete state.settings.port;
  delete state.settings.heatmapColorMigrated;
  try {
    const stored = await API.getSettings();
    if (stored && typeof stored === "object") {
      for (const k of Object.keys(SETTINGS_SPEC)) {
        if (stored[k] !== undefined) state.settings[k] = coerceSetting(k, stored[k]);
      }
      state.settingsPath = stored._path || null;
      cacheSettings();
    }
  } catch (e) {
    log(`Could not read stored settings (${e.message}) — using defaults`, "warning");
  }
  applyAllSettings({ initial: true });
  return state.settings;
}

async function setSetting(key, value, opts = {}) {
  if (!SETTINGS_SPEC[key]) return false;
  const coerced = coerceSetting(key, value);
  const before = state.settings[key];
  state.settings[key] = coerced;
  cacheSettings();
  applySetting(key, coerced, opts);
  try {
    const res = await API.setSetting(key, coerced);
    if (res && res.ok === false && !opts.quiet) {
      toast(`Could not save “${SETTINGS_SPEC[key].label}”: ${res.error}`, "warning", 6000);
      return false;
    }
  } catch (e) {
    if (!opts.quiet) toast(`Could not save settings: ${e.message}`, "warning", 6000);
    return false;
  }
  // Keep the panel in step with the value. Without this the interpreter hint
  // still read "auto-detect" straight after pinning an interpreter, which makes
  // the control look like it did nothing.
  syncSettingsControls();
  if (!opts.quiet && opts.announce !== false) {
    toast(`${SETTINGS_SPEC[key].label}${describeSettingValue(key, coerced)}`, "success", 2200);
  }
  return true;
}

function describeSettingValue(key, value) {
  if (typeof value === "boolean") return value ? " enabled" : " disabled";
  if (value === "") return " cleared — auto-detect";
  if (SETTINGS_SPEC[key].type === "enum") {
    const pretty = String(value).replace(/_/g, " ").replace(/\b(mps|cuda|cpu)\b/i, (m) => m.toUpperCase());
    return `: ${pretty}`;
  }
  return " updated";
}

// Every preference's live effect lands here. `initial` suppresses the work that
// only makes sense on a user-driven change (reloading a model, respawning).
function applySetting(key, value, opts = {}) {
  switch (key) {
    case "animSpeed":
      applyAnimationSpeed(value);
      break;
    case "connections":
      state.showConnections = value !== false;
      if (state.nn3d) state.nn3d.setConnections?.(state.showConnections);
      break;
    case "gpu":
      if (!value) {
        log("GPU acceleration disabled — falling back to CPU compute", "warning");
        if (!opts.initial) applyDevicePreference("cpu");
      } else if (!opts.initial && state.settings.device === "auto") {
        applyDevicePreference("auto");
      }
      break;
    case "heatmapColor":
      if (state.heatmapData) renderHeatmap(state.heatmapData);
      break;
    case "defaultMethod":
      syncUnlearnMethodDefault(value);
      break;
    case "device":
      applyDevicePreference(value);
      break;
    case "welcome":
      if (!value) hideWelcomeScreen();
      break;
    default:
      break;
  }
}

function applyAllSettings(opts = {}) {
  for (const key of Object.keys(SETTINGS_SPEC)) applySetting(key, state.settings[key], { ...opts, initial: true });
  syncSettingsControls();
}

// Push state → controls (used at boot and after a reset).
function syncSettingsControls() {
  const s = state.settings;
  const bind = (id, value, prop = "checked") => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === "checked") el.checked = value !== false;
    else el.value = value == null ? "" : value;
  };
  bind("setting-autoload", s.autoload);
  bind("setting-welcome", s.welcome);
  bind("setting-gpu", s.gpu);
  bind("setting-anim-speed", s.animSpeed, "value");
  bind("setting-connections", s.connections);
  bind("setting-default-method", s.defaultMethod, "value");
  bind("setting-autosave", s.autosave);
  bind("setting-heatmap-color", s.heatmapColor, "value");
  bind("setting-python", s.pythonPath, "value");
  bind("setting-device", s.device, "value");

  const hint = document.getElementById("setting-python-hint");
  if (hint) {
    hint.textContent = s.pythonPath
      ? "pinned — used for the dependency check and backend"
      : "auto-detect (app environment first)";
  }
  const storePath = document.getElementById("setting-store-path");
  if (storePath) storePath.textContent = state.settingsPath || "userData/settings.json";
  const pyInput = document.getElementById("setting-python");
  if (pyInput && pyInput.value !== (s.pythonPath || "")) pyInput.value = s.pythonPath || "";
}

function applyAnimationSpeed(value) {
  const scale = ANIM_SPEED_SCALE[value] ?? 1;
  if (state.nn3d && state.nn3d.cam) {
    // nn3d owns its own rotate speed; scale around its natural value so the
    // default ("normal") is bit-identical to the pre-settings behaviour.
    const base = state.nn3d.baseAutoRotateSpeed || 0.055;
    state.nn3d.cam.autoRotateSpeed = base * scale;
  }
  document.documentElement.style.setProperty("--anim-scale", String(scale));
  // "Off" is a real motion-off switch, not just a slower spin: it neutralises
  // CSS transitions too, which is what users who picked it actually want.
  if (value === "off") document.documentElement.setAttribute("data-anim", "off");
  else document.documentElement.removeAttribute("data-anim");
}

// The compute device applies to the Python backend, not this process: ask it to
// re-pin, then report what it actually landed on.
async function applyDevicePreference(device) {
  if (!state.backendReady) return;
  try {
    const info = await API.rpc("device_preference", { device: device || "auto" });
    if (info && info.error) { toast(`Device change failed: ${info.error}`, "error", 7000); return; }
    const landed = info && info.device ? String(info.device) : "?";
    const wanted = device || "auto";
    log(`Compute device set to ${landed}${wanted !== "auto" && !landed.startsWith(wanted) ? ` (${wanted} unavailable — fell back)` : ""}`, "info");
    if (landed.includes("cpu") && wanted !== "cpu" && wanted !== "auto") {
      toast(`${wanted.toUpperCase()} is not available on this machine — running on CPU`, "warning", 7000);
    }
    updateStatusDeviceChip(landed);
  } catch (e) {
    toast(`Could not set compute device: ${e.message}`, "warning", 6000);
  }
}

function syncUnlearnMethodDefault(method) {
  const sel = document.querySelector("#unlearn-method, .unlearn-method-select, [data-unlearn-method]");
  if (sel && "value" in sel && !sel.disabled) {
    sel.value = method;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  state.unlearnMethod = method;
}

// ── Recent models (backing the File ▸ Recent Models menu) ──
function rememberRecentModel(path, name, size) {
  if (!path) return;
  const list = Array.isArray(state.settings.recentModels) ? state.settings.recentModels.slice() : [];
  const entry = { path, name: name || path.split(/[\\/]/).pop(), size: size || 0, at: Date.now() };
  const without = list.filter((m) => m && m.path !== path);
  without.unshift(entry);
  const trimmed = without.slice(0, 10);
  state.settings.recentModels = trimmed;
  cacheSettings();
  API.setSetting("recentModels", trimmed).catch(() => {});
  setSetting("lastModelPath", path, { quiet: true, announce: false });
}

function recentModels() {
  return Array.isArray(state.settings.recentModels) ? state.settings.recentModels.filter((m) => m && m.path) : [];
}

// Drop every trace of the loaded model from the UI. Used when the backend is
// replaced underneath us: leaving the old tree, tensors and canvas up would be
// a lie, and any action taken on that ghost model fails confusingly.
function clearModelState(opts = {}) {
  state.model = null;
  state.layers = [];
  state.tensors = [];
  state.modelSummary = null;
  state.selectedTensor = null;
  state.heatmapData = null;
  state.tensorCapabilities = null;
  state.multiSelectedTensors = [];
  state.localModelsDirty = true;
  state.expandedTreeGroups?.clear?.();
  state.collapsedTreeGroups?.clear?.();
  // Cancel any in-flight stats hydration so its results cannot land on the new
  // (empty) list.
  state.weightHydrateToken = (state.weightHydrateToken || 0) + 1;

  // 3D: clear the graph so the next model builds a fresh one rather than
  // drawing the previous model's nodes next to the new model's stats.
  if (state.nn3d) {
    try { state.nn3d.setModel({ layers: [], tensors: [], summary: {} }); } catch (e) { /* engine may be gone */ }
  }

  const tree = document.getElementById("model-tree");
  if (tree && !opts.keepAgainstReload) {
    tree.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No model loaded</p>
        <p class="empty-desc">Open a model file or directory to begin exploring</p>
        <div class="empty-actions">
          <button class="btn-primary-sm" id="btn-open-model-empty">Open File</button>
          <button class="btn-outline-sm" id="btn-open-folder-empty">Open Folder</button>
        </div>
      </div>`;
    document.getElementById("btn-open-model-empty")?.addEventListener("click", openFile);
    document.getElementById("btn-open-folder-empty")?.addEventListener("click", openFolder);
  }

  const body = document.getElementById("weight-explorer-body");
  if (body) {
    body.innerHTML = '<div class="empty-state"><p class="empty-title">No model loaded</p><p class="empty-desc">Open a model to list its weights</p></div>';
  }
  const sel = document.getElementById("weight-layer-select");
  if (sel) sel.innerHTML = '<option value="">Select a layer...</option>';
  const summary = document.getElementById("weight-summary");
  if (summary) summary.textContent = "";

  ["status-model", "status-params", "status-format"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = i === 0 ? "No model" : "—"; el.style.color = ""; el.style.cursor = ""; el.onclick = null; }
  });
  document.getElementById("status-quant")?.classList.add("hidden");
  renderModelCanvas();
}


// ── Confirm dialog ──
// Destructive actions used to fire immediately with no way to back out. This
// is a promise-based confirm that inherits the app's modal styling, traps
// focus, and resolves false on Escape / backdrop click — so `await` is the
// only thing a caller has to get right.
function confirmDialog({ title, body, confirm = "Confirm", cancel = "Cancel", danger = false, extra = null } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal confirm-modal">
        <div class="modal-header">
          <h3>${escapeHtml(title || "Are you sure?")}</h3>
        </div>
        <div class="modal-body">
          <p class="confirm-body">${escapeHtml(body || "")}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" data-confirm-cancel>${escapeHtml(cancel)}</button>
          <button class="btn-primary${danger ? " btn-danger" : ""}" data-confirm-ok>${escapeHtml(confirm)}</button>
        </div>
      </div>`;

    const finish = (value) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); finish(true); }
      if (e.key === "Tab") {
        // Two buttons — cycle between them instead of escaping to the page.
        const focusables = [...overlay.querySelectorAll("button")];
        const idx = focusables.indexOf(document.activeElement);
        const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx + 1) % focusables.length;
        e.preventDefault();
        focusables[next]?.focus();
      }
    };

    const previousFocus = document.activeElement;
    overlay.querySelector("[data-confirm-cancel]").addEventListener("click", () => finish(false));
    overlay.querySelector("[data-confirm-ok]").addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(false); });
    document.addEventListener("keydown", onKey, true);

    document.body.appendChild(overlay);
    overlay.querySelector("[data-confirm-ok]").focus();
  });
}

// ── Welcome screen ──
// "Show welcome screen on startup" has to be honoured in both directions: the
// overlay is painted after a model load, a failed load and on a fresh launch,
// so each of those paths checks the preference instead of assuming it is on.
function hideWelcomeScreen() {
  state.welcomeDismissed = true;
  const overlay = document.getElementById("canvas-overlay");
  if (overlay) overlay.classList.add("hidden");
}

function welcomeAllowed() {
  return state.settings.welcome !== false && !state.welcomeDismissed;
}

// The status bar device chip turns "auto" into what the backend actually
// landed on, so a silent CPU fallback is visible at a glance.
function updateStatusDeviceChip(device) {
  const el = document.getElementById("status-platform");
  if (!el) return;
  const pretty = String(device || "").replace("cuda:0", "CUDA").replace(/^mps$/, "Apple GPU (MPS)").replace(/^cpu$/, "CPU");
  el.textContent = pretty || "—";
  el.classList.toggle("status-cpu", /cpu/i.test(String(device || "")));
  el.title = `Compute device: ${device || "unknown"} · Settings → Backend`;
  el.dataset.device = String(device || "");
}

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function copyToClipboard(text, label) {
  const value = String(text == null ? "" : text);
  if (!value) { toast(`Nothing to copy for ${label || "that item"}`, "warning", 3000); return Promise.resolve(false); }
  const done = () => toast(`${label || "Copied"}: ${value.length > 60 ? value.slice(0, 57) + "…" : value}`, "success", 2500);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value).then(() => { done(); return true; })
      .catch(() => { fallbackCopy(value); done(); return true; });
  }
  fallbackCopy(value);
  done();
  return Promise.resolve(true);
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) { /* clipboard blocked */ }
  ta.remove();
}

// ── State ──
const state = {
  model: null,
  layers: [],
  tensors: [],
  selectedTensor: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  lastMouse: { x: 0, y: 0 },
  backendReady: false,
  backendInfo: null,
  currentJobId: null,
  unlearnPollTimer: null,
  heatmapData: null,
  heatmapZoom: 1,
  modelSummary: null,
  // New state
  hardware: null,
  catalogFilter: "all",
  selectedModel: null,
  localModels: [],
  selectedLocalPath: null,
  activeDropdown: null,
  commandPaletteOpen: false,
  selectedCommandIdx: 0,
  sidebarVisible: true,
  propsVisible: true,
  terminalExpanded: false,
  // Preferences. Shaped exactly like SETTINGS_SPEC — the spec is the source of
  // truth for defaults, this is just the live copy the UI reads.
  settings: {
    autoload: true,
    welcome: true,
    gpu: true,
    animSpeed: "normal",
    connections: true,
    defaultMethod: "retain_aware",
    autosave: true,
    pythonPath: "",
    device: "auto",
    heatmapColor: "grayscale",
    lastModelPath: "",
    recentModels: [],
    sizes: {},
  },
  settingsPath: null,
  unlearnMethod: "retain_aware",
  // Edit history for the Weight Explorer / surgery edits (Edit ▸ Undo/Redo).
  undoStack: [],
  redoStack: [],
  lastClosedPane: null,
  // When true the welcome overlay is suppressed for this session only.
  welcomeDismissed: false,
  appVersion: null,
  platform: null,
  platformName: null,
  backendSession: 0,
  modelSize: 0,
  modelIsDirectory: false,
  multiSelectedTensors: [],
  clipboardEdit: null,
  docsModalOpen: false,
  exportFormat: "safetensors",
  expandedTreeGroups: new Set(),
  collapsedTreeGroups: new Set(),

  // ── Viewport ──
  viewMode: "2d",          // "2d" | "3d"
  nn3d: null,              // NN3D instance (created lazily)
  nn3dFailed: false,
  layout3d: "layered",     // layered | helix | sphere
  colorMode3d: "depth",    // depth | dtype | params
  autoRotate: true,
  showConnections: true,
  hoveredNode3d: -1,
  selectedNode3d: -1,
};

const LAYOUTS_3D = ["layered", "helix", "sphere"];
const LAYOUT_LABELS_3D = { layered: "Layers", helix: "Helix", sphere: "Sphere" };
const COLORMODES_3D = ["depth", "dtype", "params"];
const COLORMODE_LABELS_3D = { depth: "Depth", dtype: "Dtype", params: "Energy" };

// ══════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
  // PERF: skip animations during boot for a snappier first paint.
  document.documentElement.classList.add("booting");
  setTimeout(() => document.documentElement.classList.remove("booting"), 600);

  // Restore session BEFORE Firebase init so a stored guest/real user goes
  // straight to the dashboard with no login-screen flash (the Firebase auth
  // listener settles later and keeps the same user).
  restoreSavedSession();

  initAuthHandlers();
  // PERF: Firebase (and Razorpay, on demand) load in the background instead
  // of blocking page load — see loadScript/scheduleLazySdkLoads above.
  scheduleLazySdkLoads();

  // Preferences first: everything below reads them (welcome visibility, 3D
  // connection lines, animation speed, the interpreter the gate probes with),
  // so applying them late would visibly re-configure the UI after first paint.
  await initSettingsStore();

  initTabs();
  initResizeHandles();
  initBottomPanel();
  initDragDrop();
  initModelOpeners();
  initExplorerActions();
  initCanvasInteractions();
  initViewportHUD();
  initUnlearnPanel();
  initWeightExplorer();
  initHeatmapControls();
  loadPlatform();
  initBackendListeners();
  checkForUpdates();
  initChatbot();
  initResourceMonitor();
  initModelCatalog();
  initCommandPalette();
  initDropdownMenus();
  initActivityBar();
  initKeyboardShortcuts();
  initExportDialog();
  initSettingsPanel();
  initDependencyGate();
  initContextMenu();
  initBottomPanelTabs();
  initSearchPanel();
  restorePanelSizes();
  initStatusBarActions();
  initDocsModal();
  initWeightMultiSelect();

  // Welcome-screen preference applies to the static overlay in index.html too:
  // with it off the viewport should show the grid, not a call to action.
  if (!welcomeAllowed()) {
    document.getElementById("canvas-overlay")?.classList.add("hidden");
    log("'Show welcome screen' is off — press ⌘O to open a model", "info");
  }

  // Auto-load the last model, once the backend is actually up (it is spawned
  // asynchronously and a load before "ready" fails with a Python error).
  if (state.settings.autoload && state.settings.lastModelPath) {
    autorestoreLastModel(state.settings.lastModelPath);
  }

  // The dependency gate may need re-running now that a preferred interpreter
  // from settings is known to the main process.
  if (state.settings.pythonPath) log(`Preferred Python interpreter: ${state.settings.pythonPath}`);
});

// Load the previously-open model in the background: wait for the backend, then
// retry a missing file gracefully (moved/unmounted drive) instead of throwing
// an error dialog at launch.
async function autorestoreLastModel(pathToModel) {
  const name = String(pathToModel).split(/[\\/]/).pop();
  const waitForBackend = async () => {
    for (let i = 0; i < 120; i++) {
      if (state.backendReady) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };
  const ready = await waitForBackend();
  if (!ready) { log(`Skipped auto-loading ${name}: backend never became ready`, "warning"); return; }
  // Restoring is best-effort: if the path is gone we say so once and clear it,
  // so the next launch does not repeat the same failure forever.
  const probe = await API.rpc("system_info", {}).catch(() => null);
  if (probe && probe.error) return;
  log(`Auto-loading last model: ${name}`, "info");
  await loadModel(pathToModel, name, 0, false, { auto: true });
}


// ══════════════════════════════════════════
// BACKEND LISTENERS
// ══════════════════════════════════════════

function initBackendListeners() {
  API.onBackendReady((info) => {
    const previousSession = state.backendSession || 0;
    state.backendSession = previousSession + 1;
    state.backendReady = true;
    state.backendInfo = info;

    // A backend can start more than once per app session: changing the
    // interpreter, pressing Restart Backend, or recovering from a crash all
    // respawn Python. The new process has NO model in memory while the window
    // still shows the old one — every tensor RPC then fails with "No model
    // loaded" against a UI that insists a model is open. Recover explicitly.
    if (previousSession > 0) {
      const name = state.model && state.model.name;
      if (name) {
        const path = state.model.path;
        log(`Backend restarted — reloading ${name}`, "warning");
        toast(`Backend restarted — reloading ${name}`, "info", 5000);
        clearModelState({ keepAgainstReload: true });
        if (path) {
          loadModel(path, name, state.modelSize || 0, state.modelIsDirectory === true, { silent: true })
            .catch(() => log(`Could not reload ${name} — open it again with ⌘O`, "error"));
        }
      } else {
        clearModelState();
      }
    }

    log("Python backend connected", "success");
    log(`Device: ${info.device} | PyTorch ${info.torch} | Python ${(info.python || "?").split(" ")[0]}`);
    if (info.cuda_available) log(`CUDA ${info.cuda_version} available`, "info");
    if (info.mps_available) log("Apple MPS GPU available", "info");
    log(`RAM: ${info.ram_available_gb}GB / ${info.ram_total_gb}GB available`);

    // Degraded mode: backend started but some packages failed to import.
    // Say so loudly instead of letting the user hit vague errors later.
    if (info.degraded && Array.isArray(info.import_errors) && info.import_errors.length > 0) {
      log(`Backend DEGRADED — failed imports: ${info.import_errors.join("; ")}`, "error");
      toast(`Python backend missing packages: ${info.import_errors.join(", ").split(":")[0]}. Model loading is disabled until fixed.`, "error", 8000);
      const platformEl = document.getElementById("status-platform");
      if (platformEl) {
        platformEl.textContent = "backend degraded";
        platformEl.style.color = "var(--danger)";
      }
    }

    document.getElementById("status-platform").textContent = info.degraded ? "backend degraded" : `${info.device}`;
    document.getElementById("status-device").textContent = info.ram_total_gb != null ? `${info.ram_total_gb}GB RAM` : "RAM ?";
    document.getElementById("status-ram").textContent = info.ram_available_gb != null ? `${info.ram_available_gb}GB free` : "RAM ?";
  });

  API.onBackendStatus?.((status) => {
    if (status && status.error) {
      toast(`Backend error: ${status.error}`, "error", 8000);
      const platformEl = document.getElementById("status-platform");
      if (platformEl) {
        platformEl.textContent = "backend offline";
        platformEl.style.color = "var(--danger)";
      }
    }
  });

  API.onBackendLog((msg) => log(msg));
  API.onUnlearnProgress((data) => handleUnlearnProgress(data));
  API.onDownloadProgress((data) => updateDownloadProgress(data));

  API.isBackendReady().then((ready) => {
    if (!ready) log("Waiting for Python backend...", "info");
  });

  // Safety net for the ready-event race: if the backend signalled "ready"
  // before this listener was attached, the event is gone and backendReady
  // would stay false forever ("Python backend not ready" on every load).
  // Poll until main reports ready, with a hard cap.
  let polls = 0;
  const pollTimer = setInterval(async () => {
    polls++;
    try {
      const ready = await API.isBackendReady();
      if (ready && !state.backendReady) {
        state.backendReady = true;
        log("Python backend connected", "success");
        clearInterval(pollTimer);
      }
    } catch (e) { /* main not up yet */ }
    if (polls >= 120) {
      clearInterval(pollTimer);
      if (!state.backendReady) {
        log("Backend not ready after 2 min. Is Python 3 installed with torch, safetensors, psutil?", "error");
      }
    }
  }, 1000);
}

// ══════════════════════════════════════════
// PYTHON DEPENDENCY SETUP GATE
// ══════════════════════════════════════════
// The main process re-checks every requirement in backend/requirements.txt on
// launch (version + real import, so conflicting libraries are caught too). When
// something is missing the backend cannot start, and this modal offers the fix:
// Allow → the app builds its own Python environment and pip-installs everything,
// streaming progress here; Close → quit. There is no dismiss button: without
// the packages the app has no working backend.

let depsInstalling = false;
let depsLastSeq = 0; // ignore status snapshots older than the newest one applied

function initDependencyGate() {
  if (!API.onDepsStatus) return;
  API.onDepsStatus((status) => renderDependencyGate(status));
  API.onDepsProgress((evt) => renderDepsProgress(evt));

  document.getElementById("deps-install")?.addEventListener("click", startDependencyInstall);
  document.getElementById("deps-recheck")?.addEventListener("click", async () => {
    const btn = document.getElementById("deps-recheck");
    if (btn) { btn.disabled = true; btn.textContent = "Checking…"; }
    try { await API.checkDeps(); } catch (e) { log(`Dependency check failed: ${e.message}`, "error"); }
    finally { if (btn) { btn.disabled = false; btn.textContent = "Check Again"; } }
  });
  document.getElementById("deps-continue")?.addEventListener("click", async () => {
    hideDependencyGate();
    try { await API.continueWithoutDeps(); } catch (e) { /* older build */ }
    log("Continuing without the missing Python packages — some features will not work.", "warning");
  });
  document.getElementById("deps-quit")?.addEventListener("click", () => { API.quitApp?.(); });
  // Only meaningful when no interpreter exists at all: macOS installs the
  // command line tools (which ship python3) through Apple's own dialog, other
  // platforms get sent to python.org. The user then presses Check Again.
  document.getElementById("deps-getpython")?.addEventListener("click", async () => {
    const btn = document.getElementById("deps-getpython");
    if (btn) { btn.disabled = true; btn.textContent = "Opening installer…"; }
    try {
      const res = await API.getPython();
      if (res && res.already) toast("Python 3 already ships with the installed Xcode tools — press Check Again", "info", 8000);
      else if (res && res.opened) toast("Finish the Python install, then press Check Again", "info", 8000);
      else toast("A system dialog should be asking to install the developer tools", "info", 9000);
      log(`Python install helper: ${JSON.stringify(res).slice(0, 200)}`, "info");
    } catch (e) {
      toast(`Could not start the Python installer: ${e.message}`, "error", 8000);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Get Python 3"; }
    }
  });

  // The launch check can finish before this listener attaches; ask for the
  // current state once, so the modal is never missed.
  API.getDepsStatus?.().then((s) => {
    if (s && s.status && s.status !== "unknown") renderDependencyGate(s);
  }).catch(() => { /* main not up yet */ });
}

function showDependencyGate() { document.getElementById("deps-overlay")?.classList.add("visible"); }
function hideDependencyGate() { document.getElementById("deps-overlay")?.classList.remove("visible"); }

async function startDependencyInstall() {
  if (depsInstalling) return;
  depsInstalling = true;
  const installBtn = document.getElementById("deps-install");
  if (installBtn) { installBtn.disabled = true; installBtn.textContent = "Installing…"; }
  const logEl = document.getElementById("deps-log");
  if (logEl) { logEl.style.display = "block"; logEl.textContent = ""; }
  document.getElementById("deps-progress")?.style.setProperty("display", "block");
  log("Installing Python packages — this can take several minutes", "info");
  try {
    const res = await API.installDeps();
    if (res && res.ok) {
      log(`Python packages installed (${res.envKind || "app-env"}: ${res.envPath || res.python})`, "success");
      toast("Python packages installed — backend starting", "success", 6000);
    } else {
      toast(res && res.error ? `Install failed: ${res.error}` : "Install failed", "error", 9000);
    }
  } catch (e) {
    toast(`Install failed: ${e.message}`, "error", 9000);
  } finally {
    depsInstalling = false;
    if (installBtn) { installBtn.disabled = false; installBtn.textContent = "Allow & Install Everything"; }
    // Apply the final state *after* clearing the local flag: the "ok" status
    // was broadcast while depsInstalling was still true, so it rendered as
    // in-progress and the dialog would otherwise stay on screen forever.
    try { renderDependencyGate(await API.getDepsStatus()); } catch (e) { hideDependencyGate(); }
  }
}

function renderDependencyGate(status) {
  if (!status) return;
  // A "getDepsStatus" round-trip and a push event race each other; both carry
  // the main process's counter, so anything older than what is already on
  // screen is dropped instead of reverting the dialog to a stale state.
  if (typeof status.seq === "number") {
    if (status.seq < depsLastSeq) return;
    depsLastSeq = status.seq;
  }
  const overlay = document.getElementById("deps-overlay");
  if (!overlay) return;

  const title = document.getElementById("deps-title");
  const intro = document.getElementById("deps-intro");
  const meta = document.getElementById("deps-meta");
  const list = document.getElementById("deps-list");
  const progress = document.getElementById("deps-progress");
  const logEl = document.getElementById("deps-log");
  const installBtn = document.getElementById("deps-install");
  const recheckBtn = document.getElementById("deps-recheck");
  const continueBtn = document.getElementById("deps-continue");
  const quitBtn = document.getElementById("deps-quit");
  const missing = Array.isArray(status.missing) ? status.missing : [];

  const envLines = [];
  if (status.python) {
    envLines.push(`Interpreter: <b>${status.python}</b>${status.pythonVersion ? ` (Python ${status.pythonVersion})` : ""}`);
  } else if (status.basePython) {
    envLines.push(`Python found: <b>${status.basePython}</b>${status.basePythonVersion ? ` (Python ${status.basePythonVersion})` : ""}`);
  }
  if (status.envKind) {
    const kind = status.envKind === "app-env" ? "app-managed environment"
      : status.envKind === "target-dir" ? "app-managed package directory" : "system Python";
    envLines.push(`Environment: <b>${kind}</b>${status.envPath ? ` — ${status.envPath}` : ""}`);
  } else if (status.plannedEnvPath) {
    envLines.push(`Environment: <b>will be created</b> — ${status.plannedEnvPath}`);
  }

  // ── Working / installing ──
  if (status.status === "installing" || depsInstalling) {
    if (title) title.textContent = "INSTALLING PYTHON PACKAGES";
    if (intro) intro.textContent = "Downloading and installing everything the backend needs. Keep this window open — torch is a large download and the whole install usually takes a few minutes.";
    if (meta) meta.innerHTML = envLines.join("<br>");
    if (list) list.innerHTML = "";
    if (progress) progress.style.display = "block";
    if (logEl) logEl.style.display = "block";
    if (installBtn) installBtn.style.display = "none";
    if (recheckBtn) recheckBtn.style.display = "none";
    if (continueBtn) continueBtn.style.display = "none";
    const getPythonBtn = document.getElementById("deps-getpython");
    if (getPythonBtn) getPythonBtn.style.display = "none";
    if (quitBtn) { quitBtn.disabled = true; quitBtn.textContent = "Installing…"; }
    showDependencyGate();
    return;
  }

  // ── Something is missing (or a previous install failed) ──
  if (status.status === "missing" || status.status === "failed") {
    const failed = status.status === "failed";
    const noPython = missing.length === 1 && missing[0].name === "python";
    if (title) title.textContent = failed ? "PYTHON PACKAGES INSTALL FAILED" : "PYTHON SETUP REQUIRED";
    if (intro) {
      intro.textContent = failed
        ? "The automatic install did not finish cleanly. Check your internet connection and try again — or continue without the missing features."
        : noPython
          ? "Remap Studios runs its machine-learning backend on Python 3, and no usable Python interpreter was found on this computer. Install Python 3.9 or newer, then press Check Again — the app will install the rest automatically into its own environment."
          : "Remap Studios runs its machine-learning backend on Python, and some packages it needs are missing, out of date or broken on this machine — usually a conflict between library versions. Allow the app to install everything automatically? Nothing outside the app's own Python environment is touched.";
    }
    if (meta) meta.innerHTML = envLines.join("<br>") + (status.detail ? `<br><span style="color:var(--danger)">${status.detail}</span>` : "");
    if (list) {
      list.innerHTML = missing.length
        ? missing.map((m) => `
            <div class="deps-item">
              <span class="deps-item-name">${m.name}</span>
              <span class="deps-item-need">${m.need ? `needs ${m.need}` : ""}</span>
              <span class="deps-item-reason">${m.reason || "unavailable"}</span>
            </div>`).join("")
        : `<div class="deps-item"><span class="deps-item-name">python</span><span class="deps-item-reason">No usable Python 3 interpreter was found. Install Python 3.9 or newer, then press Check Again.</span></div>`;
    }
    if (progress) progress.style.display = "none";
    if (logEl) {
      const stored = Array.isArray(status.log) ? status.log.join("\n") : "";
      if (!logEl.textContent && stored) logEl.textContent = stored;
      logEl.style.display = logEl.textContent ? "block" : "none";
    }
    // Without an interpreter there is nothing to install into — the user has
    // to install Python first, then press Check Again.
    if (installBtn) { installBtn.style.display = ""; installBtn.disabled = Boolean(noPython); installBtn.textContent = "Allow & Install Everything"; }
    const getPythonBtn = document.getElementById("deps-getpython");
    if (getPythonBtn) getPythonBtn.style.display = noPython ? "" : "none";
    if (recheckBtn) recheckBtn.style.display = "";
    if (continueBtn) continueBtn.style.display = "";
    if (quitBtn) { quitBtn.disabled = false; quitBtn.textContent = "Close Application"; }
    showDependencyGate();
    return;
  }

  // ── Healthy, or still checking ──
  // Only a definite "everything is fine" (or an explicit skip) may close the
  // dialog: hiding on "checking" let an in-flight status fetch arriving after
  // the "missing" verdict wipe the setup dialog off the screen.
  if (status.status === "ok" || status.status === "skipped") hideDependencyGate();
}

function renderDepsProgress(evt) {
  if (!evt) return;
  const logEl = document.getElementById("deps-log");
  if (evt.line != null) {
    if (logEl) {
      logEl.style.display = "block";
      logEl.textContent += (logEl.textContent ? "\n" : "") + evt.line;
      logEl.scrollTop = logEl.scrollHeight;
    }
    return;
  }
  const progress = document.getElementById("deps-progress");
  const bar = document.getElementById("deps-progress-bar");
  const label = document.getElementById("deps-progress-label");
  if (progress) progress.style.display = "block";
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, evt.percent || 0))}%`;
  if (label) label.textContent = evt.label || (evt.total ? `${evt.done || 0} / ${evt.total} packages` : "Working…");
}

// ══════════════════════════════════════════
// AUTO-UPDATE
// ══════════════════════════════════════════

async function checkForUpdates() {
  try {
    const result = await API.checkForUpdates();
    if (result.updateAvailable) {
      log(`Update available: v${result.version}`, "info");
      log(`Download: ${result.downloadUrl}`, "info");
      if (result.releaseNotes) {
        log(`Release notes: ${result.releaseNotes}`, "info");
      }
      // Show update notification in status bar
      const statusEl = document.getElementById("status-model");
      if (statusEl) {
        statusEl.textContent = `Update: v${result.version}`;
        statusEl.style.color = "var(--accent)";
        statusEl.style.cursor = "pointer";
        statusEl.onclick = () => API.openExternal(result.downloadUrl);
      }
    }
  } catch (e) {
    // Silent fail — updates are optional
  }
}

// ══════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) return;
      switchTab(tab.dataset.tab);
    });
  });
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  const tab = document.querySelector(`.tab[data-tab="${name}"]`);
  const panel = document.getElementById(`panel-${name}`);
  if (tab) tab.classList.add("active");
  if (panel) panel.classList.add("active");
  if (name === "heatmap" && state.model) renderHeatmap();
  if (name === "visualization" && state.model) renderModelCanvas();
  if (name === "unlearn") { renderUnlearnCanvas(); updateUnlearnModeNote(); }
}

// ══════════════════════════════════════════
// RESIZE HANDLES
// ══════════════════════════════════════════

// Panel geometry is remembered across launches, and every handle is also
// drivable from the keyboard (focus it and use ←/→) — dragging was the only
// way to change a panel size before, which left keyboard users stuck.
const PANEL_SIZE_KEY = "panelSizes";

function savedPanelSizes() {
  const raw = state.settings.sizes;
  return raw && typeof raw === "object" ? raw : {};
}

function rememberPanelSize(name, size) {
  const sizes = { ...savedPanelSizes(), [name]: Math.round(size) };
  state.settings.sizes = sizes;
  cacheSettings();
  API.setSetting("sizes", sizes).catch(() => {});
}

function restorePanelSizes() {
  const sizes = savedPanelSizes();
  const apply = (name, setter) => {
    const v = Number(sizes[name]);
    if (Number.isFinite(v) && v > 0) setter(v);
  };
  apply("sidebar", (w) => { const el = document.getElementById("sidebar"); if (el) el.style.width = `${w}px`; });
  apply("props", (w) => { const el = document.getElementById("properties"); if (el) el.style.width = `${w}px`; });
  if (Object.keys(sizes).length) log(`Restored panel layout (${Object.keys(sizes).length} panels)`);
}

function resetPanelSize(name) {
  const sizes = { ...savedPanelSizes() };
  delete sizes[name];
  state.settings.sizes = sizes;
  cacheSettings();
  API.setSetting("sizes", sizes).catch(() => {});
}

function initResizeHandles() {
  const setupResize = (selector, options) => {
    document.querySelectorAll(`.resize-handle[data-resize='${selector}']`).forEach((handle) => {
      let startPos, startSize;

      // Double-click a handle to put that panel back to its natural size.
      handle.addEventListener("dblclick", (e) => {
        e.preventDefault(); e.stopPropagation();
        resetPanelSize(selector);
        const el = document.getElementById(selector === "props" ? "properties" : selector);
        if (el) el.style.width = "";
        options.onDone?.();
        toast(`${selector === "props" ? "Properties" : selector} panel reset`, "info", 1800);
      });

      handle.setAttribute("tabindex", "0");
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", options.axis === "x" ? "vertical" : "horizontal");
      handle.title = "Drag to resize · double-click to reset · arrow keys work too";
      handle.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 40 : 12;
        const back = options.axis === "x" ? "ArrowLeft" : "ArrowUp";
        const fwd = options.axis === "x" ? "ArrowRight" : "ArrowDown";
        if (e.key !== back && e.key !== fwd) return;
        e.preventDefault();
        const dir = e.key === fwd ? 1 : -1;
        const delta = options.invert ? -dir * step : dir * step;
        const max = typeof options.max === "function" ? options.max() : options.max;
        const next = Math.max(options.min, Math.min(max, options.getSize() + delta));
        options.setSize(next);
        rememberPanelSize(selector, next);
        options.onDone?.();
      });

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault(); e.stopPropagation();
        startPos = options.axis === "x" ? e.clientX : e.clientY;
        startSize = options.getSize();
        handle.classList.add("active");
        document.body.classList.add("resizing");
        document.body.style.cursor = options.axis === "x" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";

        let latest = startSize;
        const onMove = (e) => {
          const currentPos = options.axis === "x" ? e.clientX : e.clientY;
          const diff = currentPos - startPos;
          const newSize = options.invert ? startSize - diff : startSize + diff;
          const max = typeof options.max === "function" ? options.max() : options.max;
          latest = Math.max(options.min, Math.min(max, newSize));
          options.setSize(latest);
        };
        const onUp = () => {
          handle.classList.remove("active");
          document.body.classList.remove("resizing");
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          // Persist once on release, not on every mousemove.
          if (Math.abs(latest - startSize) > 1) rememberPanelSize(selector, latest);
          if (options.onDone) options.onDone();
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  };

  setupResize("sidebar", {
    axis: "x", min: 180, max: 400,
    getSize: () => document.getElementById("sidebar").offsetWidth,
    setSize: (w) => { document.getElementById("sidebar").style.width = `${w}px`; },
    onDone: () => renderModelCanvas(),
  });

  setupResize("props", {
    axis: "x", min: 220, max: 450, invert: true,
    getSize: () => document.getElementById("properties").offsetWidth,
    setSize: (w) => { document.getElementById("properties").style.width = `${w}px`; },
  });

  setupResize("unlearn", {
    axis: "x", min: 220, max: 500,
    getSize: () => document.querySelector(".unlearn-left")?.offsetWidth || 300,
    setSize: (w) => { const el = document.querySelector(".unlearn-left"); if (el) el.style.width = `${w}px`; },
    onDone: () => renderUnlearnCanvas(),
  });

  // ── Bottom dock: output divider + panel height ──
  // One divider sits between output and terminal. Dragging it sizes the
  // output pane; the terminal is rightmost and keeps absorbing the leftover
  // width, so the dock never ends in an empty gap.
  const dockColumns = () => document.querySelector("#bottom-panel .bottom-panel-columns");

  setupResize("logs", {
    axis: "x", min: 140, max: 4000,
    getSize: () => dockPaneEl("logs")?.offsetWidth || 240,
    setSize: (w) => {
      const total = dockColumns()?.clientWidth || 900;
      // Leave room for the terminal's minimum width plus the divider itself.
      const width = Math.round(Math.max(140, Math.min(w, total - 205)));
      const el = dockPaneEl("logs");
      if (el) el.style.flex = `0 0 ${width}px`;
    },
    onDone: () => requestModelCanvasRender(),
  });

  // Fixed AI assistant split in the sidebar: drag its top edge to set the
  // chat height; Properties takes whatever is left.
  setupResize("props-chat", {
    axis: "y", min: 120, max: 600, invert: true,
    getSize: () => document.getElementById("props-chat")?.offsetHeight || 280,
    setSize: (h) => document.getElementById("properties")?.style.setProperty("--chat-h", `${Math.round(h)}px`),
  });

  setupResize("bottom-panel", {
    axis: "y", invert: true, min: 120, max: () => Math.max(220, window.innerHeight - 320),
    getSize: () => document.getElementById("bottom-panel")?.offsetHeight || 240,
    setSize: (h) => document.documentElement.style.setProperty("--bottom-panel-h", `${Math.round(h)}px`),
    onDone: () => { renderModelCanvas(); state.nn3d?.resize?.(); },
  });

}

// ══════════════════════════════════════════
// COMMAND PALETTE
// ══════════════════════════════════════════

const COMMANDS = [
  { label: "Open File", category: "File", shortcut: "⌘O", action: () => openFile() },
  { label: "Open Folder", category: "File", shortcut: "⌘⇧O", action: () => openFolder() },
  { label: "Export Model", category: "File", shortcut: "⌘E", action: () => toggleModal("export-overlay") },
  { label: "Settings", category: "File", shortcut: "⌘,", action: () => toggleModal("settings-overlay") },
  { label: "Toggle 3D Neural Network", category: "View", shortcut: "G", action: () => setViewMode(state.viewMode === "3d" ? "2d" : "3d") },
  { label: "Show 2D Architecture Graph", category: "View", shortcut: "G", action: () => setViewMode("2d") },
  { label: "Show 3D Neural Network", category: "View", action: () => setViewMode("3d") },
  { label: "Cycle 3D Layout (Layers / Helix / Sphere)", category: "View", shortcut: "L", action: () => cycleLayout3D() },
  { label: "Cycle 3D Colour Mode", category: "View", shortcut: "C", action: () => cycleColorMode3D() },
  { label: "Toggle 3D Auto-Orbit", category: "View", shortcut: "Space", action: () => toggleAutoRotate3D() },
  { label: "Reset 3D Camera", category: "View", shortcut: "R", action: () => resetView3D() },
  { label: "Slant 3D View Left", category: "View", shortcut: "Q", action: () => slantView3D(false) },
  { label: "Slant 3D View Right", category: "View", shortcut: "E", action: () => slantView3D(true) },
  { label: "Toggle Sidebar", category: "View", shortcut: "⌘B", action: () => toggleSidebar() },
  { label: "Toggle Properties", category: "View", shortcut: "⌘⇧P", action: () => toggleProps() },
  { label: "Toggle Terminal", category: "View", shortcut: "⌘`", action: () => toggleTerminal() },
  { label: "Zoom In", category: "View", shortcut: "⌘+", action: () => zoomIn() },
  { label: "Zoom Out", category: "View", shortcut: "⌘-", action: () => zoomOut() },
  { label: "Reset Zoom", category: "View", shortcut: "⌘0", action: () => { state.zoom = 1; updateZoom(); } },
  { label: "Start Unlearning", category: "Run", shortcut: "⌘⇧R", action: () => startUnlearn() },
  { label: "Go to Visualization", category: "Navigation", shortcut: "⌘1", action: () => switchTab("visualization") },
  { label: "Go to Weight Explorer", category: "Navigation", shortcut: "⌘2", action: () => switchTab("weights") },
  { label: "Go to Heatmap", category: "Navigation", shortcut: "⌘3", action: () => switchTab("heatmap") },
  { label: "Go to Unlearn", category: "Navigation", shortcut: "⌘4", action: () => switchTab("unlearn") },
  { label: "Go to Model Catalog", category: "Navigation", shortcut: "⌘5", action: () => switchTab("models") },
  { label: "Show Keyboard Shortcuts", category: "Help", shortcut: "⌘/", action: () => toggleModal("shortcuts-overlay") },
  { label: "About Remap Studios", category: "Help", action: () => toggleModal("about-overlay") },
  { label: "Run Model Analysis", category: "Run", action: () => { switchTab("visualization"); if (state.model) log("Running analysis...", "info"); } },
  { label: "Benchmark Model", category: "Run", action: () => { if (state.model) log("Starting benchmark...", "info"); else log("Load a model first", "error"); } },
  { label: "Refresh Model Tree", category: "Explorer", action: () => { if (state.model) updateModelTree(); } },
  { label: "Export Configuration as JSON", category: "File", action: () => exportConfig() },
];

function initCommandPalette() {
  const overlay = document.getElementById("command-palette-overlay");
  const input = document.getElementById("command-palette-input");
  const list = document.getElementById("command-palette-list");

  document.getElementById("btn-command-palette")?.addEventListener("click", openCommandPalette);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCommandPalette();
  });

  input.addEventListener("input", () => filterCommands(input.value));
  input.addEventListener("keydown", (e) => {
    const items = list.querySelectorAll(".command-item");
    if (e.key === "Escape") { closeCommandPalette(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); state.selectedCommandIdx = Math.min(state.selectedCommandIdx + 1, items.length - 1); updateCommandSelection(items); }
    if (e.key === "ArrowUp") { e.preventDefault(); state.selectedCommandIdx = Math.max(state.selectedCommandIdx - 1, 0); updateCommandSelection(items); }
    if (e.key === "Enter") { e.preventDefault(); items[state.selectedCommandIdx]?.click(); }
  });

  filterCommands("");
}

function openCommandPalette() {
  const overlay = document.getElementById("command-palette-overlay");
  const input = document.getElementById("command-palette-input");
  overlay.classList.add("visible");
  state.commandPaletteOpen = true;
  state.selectedCommandIdx = 0;
  input.value = "";
  filterCommands("");
  setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
  document.getElementById("command-palette-overlay").classList.remove("visible");
  state.commandPaletteOpen = false;
}

function filterCommands(query) {
  const list = document.getElementById("command-palette-list");
  const q = query.toLowerCase();
  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));

  state.selectedCommandIdx = 0;
  list.innerHTML = filtered.map((cmd, i) => `
    <div class="command-item${i === 0 ? " selected" : ""}" data-idx="${i}" onclick="executeCommand(${COMMANDS.indexOf(cmd)})">
      <span class="command-item-category">${cmd.category}</span>
      <span class="command-item-label">${cmd.label}</span>
      ${cmd.shortcut ? `<span class="command-item-shortcut">${cmd.shortcut}</span>` : ""}
    </div>
  `).join("");
}

function updateCommandSelection(items) {
  items.forEach((item, i) => item.classList.toggle("selected", i === state.selectedCommandIdx));
  items[state.selectedCommandIdx]?.scrollIntoView({ block: "nearest" });
}

function executeCommand(idx) {
  closeCommandPalette();
  COMMANDS[idx]?.action();
}

// ══════════════════════════════════════════
// DROPDOWN MENUS
// ══════════════════════════════════════════

function initDropdownMenus() {
  const overlay = document.getElementById("dropdown-overlay");
  overlay.addEventListener("click", closeAllDropdowns);

  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menuId = `dropdown-${btn.dataset.menu}`;
      const menu = document.getElementById(menuId);
      if (!menu) return;

      if (state.activeDropdown === menuId) {
        closeAllDropdowns();
        return;
      }

      closeAllDropdowns();
      const rect = btn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 2}px`;
      menu.style.left = `${rect.left}px`;
      menu.classList.add("visible");
      overlay.classList.add("visible");
      btn.classList.add("active");
      state.activeDropdown = menuId;
    });

    btn.addEventListener("mouseenter", () => {
      if (state.activeDropdown) {
        const menuId = `dropdown-${btn.dataset.menu}`;
        const menu = document.getElementById(menuId);
        if (!menu) return;
        closeAllDropdowns();
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 2}px`;
        menu.style.left = `${rect.left}px`;
        menu.classList.add("visible");
        overlay.classList.add("visible");
        btn.classList.add("active");
        state.activeDropdown = menuId;
      }
    });
  });

  // Dropdown item actions
  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
      const action = item.dataset.action;
      closeAllDropdowns();
      if (item.classList.contains("disabled")) {
        toast(item.title || "That action is not available right now", "info", 2500);
        return;
      }
      handleMenuAction(action);
    });
  });

  updateEditMenuState();
  const paste = document.querySelector('.dropdown-item[data-action="paste"]');
  if (paste) paste.classList.add("disabled");
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("visible"));
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("dropdown-overlay").classList.remove("visible");
  state.activeDropdown = null;
}

// Docs + issue tracker live outside the app; the repo is the canonical home of
// both, and openExternal hands them to the OS browser so they work identically
// in dev and in the packaged build (where there is no address bar).
const PROJECT_URL = "https://github.com/harsh11x/unlearnai";
const DOCS_URL = `${PROJECT_URL}#readme`;
const ISSUES_URL = `${PROJECT_URL}/issues/new`;
const SITE_URL = "https://remapstudios.com";

function handleMenuAction(action) {
  switch (action) {
    case "open-file": openFile(); break;
    case "open-folder": openFolder(); break;
    case "recent": openRecentModels(); break;
    case "export": toggleModal("export-overlay"); break;
    case "export-json": exportConfig(); break;
    case "quit": quitApp(); break;
    case "undo": undoLastEdit(); break;
    case "redo": redoLastEdit(); break;
    case "copy": copySelection(); break;
    case "paste": pasteIntoSelection(); break;
    case "select-all": selectAllTensors(); break;
    case "settings": toggleModal("settings-overlay"); break;
    case "shortcuts": toggleModal("shortcuts-overlay"); break;
    case "about": toggleModal("about-overlay"); break;
    case "view-2d": setViewMode("2d"); break;
    case "view-3d": setViewMode("3d"); break;
    case "toggle-3d": setViewMode(state.viewMode === "3d" ? "2d" : "3d"); break;
    case "layout-3d": cycleLayout3D(); break;
    case "colormode-3d": cycleColorMode3D(); break;
    case "autorotate-3d": toggleAutoRotate3D(); break;
    case "reset-3d": resetView3D(); break;
    case "toggle-sidebar": toggleSidebar(); break;
    case "toggle-props": toggleProps(); break;
    case "toggle-terminal": toggleTerminal(); break;
    case "zoom-in": zoomIn(); break;
    case "zoom-out": zoomOut(); break;
    case "zoom-reset": state.zoom = 1; updateZoom(); break;
    case "fullscreen": toggleFullscreen(); break;
    case "start-unlearn": startUnlearn(); break;
    case "stop-unlearn": stopUnlearn(); break;
    case "run-analysis": runModelAnalysis(); break;
    case "benchmark": runModelBenchmark(); break;
    case "docs": openDocumentation(); break;
    case "report-issue": reportIssue(); break;
    default:
      log(`Unhandled menu action: ${action}`, "warning");
      break;
  }
}

// ── File ▸ Recent Models ──
// A real list, newest first, with the entries that no longer exist struck
// through — clicking one of those explains why instead of failing obscurely.
function openRecentModels() {
  const list = recentModels();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const rows = list.length
    ? list.map((m, i) => `
      <button class="recent-row" data-recent-idx="${i}">
        <span class="recent-name">${escapeHtml(m.name || "model")}</span>
        <span class="recent-meta">${m.size ? formatBytes(m.size) : "size unknown"} · ${timeAgo(m.at)}</span>
        <span class="recent-path" title="${escapeHtml(m.path)}">${escapeHtml(m.path)}</span>
      </button>`).join("")
    : '<div class="empty-state"><p class="empty-title">No recent models</p><p class="empty-desc">Models you open are remembered here for one-click access.</p></div>';

  overlay.innerHTML = `
    <div class="modal confirm-modal recent-modal">
      <div class="modal-header"><h3>Recent Models</h3></div>
      <div class="modal-body recent-body">${rows}</div>
      <div class="modal-footer">
        <button class="btn-secondary" data-recent-clear ${list.length ? "" : "disabled"}>Clear list</button>
        <button class="btn-primary" data-recent-open>Open Model…</button>
        <button class="btn-secondary" data-recent-close>Close</button>
      </div>
    </div>`;

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-recent-close]").addEventListener("click", close);
  overlay.querySelector("[data-recent-open]").addEventListener("click", () => { close(); openFile(); });
  overlay.querySelector("[data-recent-clear]").addEventListener("click", () => {
    state.settings.recentModels = [];
    cacheSettings();
    API.setSetting("recentModels", []).catch(() => {});
    close();
    toast("Recent models cleared", "success", 2500);
  });
  overlay.querySelectorAll("[data-recent-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = list[Number(btn.dataset.recentIdx)];
      close();
      if (!entry) return;
      const name = entry.name || String(entry.path).split(/[\\/]/).pop();
      loadModel(entry.path, name, entry.size || 0, false);
    });
  });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
  document.body.appendChild(overlay);
}

function timeAgo(ts) {
  if (!ts) return "earlier";
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

// ── File ▸ Quit ──
// The in-process app:quit handler shuts the backend and the terminal down
// cleanly; window.close() alone leaves detached Python processes behind.
async function quitApp() {
  const { edited, deleted } = pendingEditsIndex();
  const dirty = Object.keys(edited).length + deleted.size;
  const busy = state.currentJobId || dirty > 0;
  if (busy) {
    const ok = await confirmDialog({
      title: "Quit Remap Studios?",
      body: state.currentJobId
        ? "An unlearning job is still running. Quitting stops it and any unsaved progress is lost."
        : `You have ${dirty} unsaved tensor edit${dirty === 1 ? "" : "s"}. Quitting discards them.`,
      confirm: "Quit anyway",
      danger: true,
    });
    if (!ok) return;
  }
  try { await API.quitApp(); } catch (e) { window.close(); }
}

// ── Edit ▸ Undo / Redo ──
// History covers tensor surgery: the only edits in the app that are both
// destructive and laborious to redo by hand (a single slider drag can rewrite
// every element of a 40M-parameter tensor).
const EDIT_HISTORY_LIMIT = 50;

function pushEditHistory(entry) {
  if (!entry) return;
  state.undoStack.push({ ...entry, at: Date.now() });
  if (state.undoStack.length > EDIT_HISTORY_LIMIT) state.undoStack.shift();
  state.redoStack.length = 0;
  updateEditMenuState();
}

function updateEditMenuState() {
  const set = (action, enabled, why) => {
    const item = document.querySelector(`.dropdown-item[data-action="${action}"]`);
    if (!item) return;
    item.classList.toggle("disabled", !enabled);
    item.title = enabled ? "" : (why || "Nothing to do");
  };
  set("undo", state.undoStack.length > 0, "No edits to undo yet");
  set("redo", state.redoStack.length > 0, "Nothing to redo");
}

async function undoLastEdit() {
  const entry = state.undoStack.pop();
  if (!entry) { toast("Nothing to undo", "info", 2000); return; }
  try {
    if (entry.apply) await entry.apply();
    state.redoStack.push(entry);
    updateEditMenuState();
    toast(`Undone: ${entry.label || "edit"}`, "success", 2500);
  } catch (e) {
    toast(`Undo failed: ${e.message}`, "error", 6000);
    state.undoStack.push(entry); // put it back — it did not happen
  }
}

async function redoLastEdit() {
  const entry = state.redoStack.pop();
  if (!entry) { toast("Nothing to redo", "info", 2000); return; }
  try {
    if (entry.redo) await entry.redo();
    state.undoStack.push(entry);
    updateEditMenuState();
    toast(`Redone: ${entry.label || "edit"}`, "success", 2500);
  } catch (e) {
    toast(`Redo failed: ${e.message}`, "error", 6000);
    state.redoStack.push(entry);
  }
}

// ── Edit ▸ Copy / Paste / Select All ──
function copySelection() {
  const sel = selectedTensors();
  if (!sel.length) {
    const name = state.selectedTensor;
    if (!name) { toast("Select a weight first", "warning", 2500); return; }
    return copyToClipboard(name, "Copied tensor name");
  }
  return copyToClipboard(sel.join("\n"), `Copied ${sel.length} tensor name(s)`);
}

// Paste re-applies the last copied edit to the current selection: the common
// real workflow is "edit one tensor, apply the same change to its siblings".
async function pasteIntoSelection() {
  const clip = state.clipboardEdit;
  if (!clip) { toast("Nothing to paste — copy an edit first", "warning", 3000); return; }
  const sel = selectedTensors();
  if (!sel.length) { toast("Select one or more weights to paste into", "warning", 3000); return; }
  const results = await Promise.all(sel.map((name) =>
    API.rpc("tensor_edit", { name, ...clip }).then((r) => ({ name, ok: !(r && r.error), error: r && r.error })).catch((e) => ({ name, ok: false, error: e.message }))));
  const applied = results.filter((r) => r.ok).length;
  toast(`Pasted ${clip.type || "edit"} into ${applied}/${sel.length} tensor(s)`, applied ? "success" : "error", 4000);
  for (const r of results.filter((x) => !x.ok).slice(0, 3)) log(`Paste failed for ${r.name}: ${r.error}`, "error");
  if (applied && state.model) {
    state.tensorCapabilities = null;
    await refreshTensorCapabilities();
    renderWeightList(currentWeightLayer());
  }
}

function selectedTensors() {
  if (Array.isArray(state.multiSelectedTensors) && state.multiSelectedTensors.length) return [...state.multiSelectedTensors];
  return [];
}

function selectAllTensors() {
  const rows = [...document.querySelectorAll("#weight-explorer-body .weight-item")];
  if (!rows.length) { toast("No weights to select — open a model first", "warning", 3000); return; }
  state.multiSelectedTensors = rows.map((r) => r.dataset.tensor).filter(Boolean);
  rows.forEach((r) => r.classList.add("multi-selected"));
  const label = document.getElementById("we-selection-count");
  if (label) label.textContent = `${state.multiSelectedTensors.length} selected`;
  toast(`Selected ${state.multiSelectedTensors.length} weights`, "info", 2000);
}

function setClipboardEdit(edit) {
  state.clipboardEdit = edit;
  const item = document.querySelector('.dropdown-item[data-action="paste"]');
  if (item) item.classList.remove("disabled");
  toast("Edit copied — use Edit ▸ Paste on another weight", "info", 3000);
}

// ── Run ▸ Analysis / Benchmark ──
// Both were log-only stubs. They now do real work against the loaded model and
// report into the activity log, so "Run Analysis" is not a lie.
async function runModelAnalysis() {
  if (!state.model) { toast("Load a model first", "warning", 3000); return; }
  const tensors = state.tensors || [];
  if (!tensors.length) { toast("No tensors to analyse", "warning", 3000); return; }

  log("── Model analysis ─────────────────────", "info");
  const groups = new Map();
  let totalParams = 0;
  for (const t of tensors) {
    const params = t.param_count || 0;
    totalParams += params;
    // Group by the part of the name before the first dot: the standard
    // convention that separates embedding / attention / mlp / norm blocks.
    const key = String(t.name).includes(".") ? String(t.name).split(".")[0] : "(root)";
    const g = groups.get(key) || { count: 0, params: 0, dtypes: new Set() };
    g.count++; g.params += params; g.dtypes.add(t.dtype || "?");
    groups.set(key, g);
  }
  log(`Tensors: ${tensors.length} · parameters: ${totalParams.toLocaleString()}`);
  const ranked = [...groups.entries()].sort((a, b) => b[1].params - a[1].params);
  for (const [name, g] of ranked.slice(0, 12)) {
    const pct = totalParams ? ((g.params / totalParams) * 100).toFixed(1) : "0.0";
    log(`  ${name.padEnd(16)} ${String(g.count).padStart(4)} tensors  ${formatBytes(g.params * 2)}  ${pct}%`);
  }
  if (ranked.length > 12) log(`  …and ${ranked.length - 12} more groups`);

  // Density outliers: a tensor whose values are nearly all zero is the usual
  // unlearning target, so surface the sparsest ones when stats are available.
  const withStats = tensors.filter((t) => typeof t.sparsity === "number");
  if (withStats.length) {
    const sparsest = [...withStats].sort((a, b) => b.sparsity - a.sparsity).slice(0, 5);
    log("Sparsest tensors (most near-zero weights):");
    for (const t of sparsest) log(`  ${(t.sparsity * 100).toFixed(1)}% zeros · ${t.name}`);
  } else {
    log("Per-tensor sparsity not available — open Weight Explorer to compute stats on demand.", "info");
  }
  log("── Analysis complete ──────────────────", "success");
  toast("Analysis written to the activity log", "success", 3000);
}

async function runModelBenchmark() {
  if (!state.model) { toast("Load a model first", "error", 3000); return; }
  log("── Benchmark ──────────────────────────", "info");

  // Round-trip latency for the RPC methods the UI depends on. This measures
  // the real plumbing (IPC + JSON + Python), which is what makes the app feel
  // slow — far more useful than a synthetic FLOP count.
  const methods = [
    ["system_info", {}],
    ["device_info", {}],
    ["model_summary", {}],
    ["model_layers", {}],
    ["weight_list", {}],
  ];
  const results = [];
  for (const [method, params] of methods) {
    const t0 = performance.now();
    try {
      const res = await API.rpc(method, params);
      const ms = performance.now() - t0;
      results.push({ method, ms, ok: !(res && res.error), note: res && res.error ? String(res.error).slice(0, 60) : "" });
    } catch (e) {
      results.push({ method, ms: performance.now() - t0, ok: false, note: e.message });
    }
  }
  for (const r of results) {
    log(`  ${r.method.padEnd(16)} ${r.ms.toFixed(1).padStart(8)} ms  ${r.ok ? "ok" : "fail"}${r.note ? " — " + r.note : ""}`);
  }

  // Canvas rendering throughput, which is the other half of perceived speed.
  if (state.viewMode === "3d" && state.nn3d?.readFps) {
    const fps = state.nn3d.readFps();
    log(`  3D viewport        ${fps ? fps.toFixed(1).padStart(8) + " fps" : "        n/a"}`);
  } else if (state.nn3d?.readScenePixels) {
    const t0 = performance.now();
    const px = state.nn3d.readScenePixels();
    log(`  2D→3D probe        ${(performance.now() - t0).toFixed(1).padStart(8)} ms  (${px ? px.pixels : 0} px)`);
  }

  const slowest = results.reduce((a, b) => (b.ms > a.ms ? b : a), results[0]);
  log(`── Benchmark complete — slowest: ${slowest.method} at ${slowest.ms.toFixed(1)} ms ──`, "success");
  toast(`Benchmark complete — slowest RPC ${slowest.method} (${slowest.ms.toFixed(0)} ms)`, "success", 4000);
}

// ── Help ▸ Documentation / Report Issue ──
function openDocumentation() {
  if (state.docsModalOpen) { closeDocsModal(); return; }
  const overlay = document.getElementById("docs-overlay");
  if (overlay) { overlay.classList.add("visible"); state.docsModalOpen = true; return; }
  // Packaged builds keep working offline: fall back to the OS browser only if
  // the in-app doc modal is missing for some reason.
  API.openExternal(DOCS_URL).catch(() => toast("Could not open the documentation", "warning", 4000));
}

// The auth screen's Terms / Privacy links were `href="#"` — they did nothing at
// all. The site has no /terms or /privacy route, so instead of shipping a link
// to a 404 this states the facts the user is actually agreeing to, taken from
// what the code does: everything local, with cloud calls only for auth,
// subscription and update checks.
function openLegalModal(kind) {
  const existing = document.getElementById("legal-overlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.id = "legal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="modal confirm-modal legal-modal">
      <div class="modal-header"><h3>${kind === "privacy" ? "Privacy" : "Terms"}</h3></div>
      <div class="modal-body">
        <p class="legal-lead">Short version: your models and your edits never leave this computer.</p>
        <h4>What stays local</h4>
        <ul class="legal-list">
          <li>Model files, tensor statistics, heatmaps, weight edits and exports.</li>
          <li>Unlearning runs — all computation happens in the local Python backend.</li>
          <li>The activity log, terminal and command history.</li>
          <li>Settings, which live in a JSON file in this app's data directory.</li>
        </ul>
        <h4>What leaves the machine</h4>
        <ul class="legal-list">
          <li><b>Sign-in</b> — if you sign in (rather than continuing as a guest), credentials are handled by the app's authentication provider.</li>
          <li><b>Subscription</b> — pressing an upgrade button opens the payment provider in your browser. Card details are never entered in this app.</li>
          <li><b>Update check</b> — on launch the app asks a public endpoint for the latest version number.</li>
          <li><b>Model downloads</b> — only when you press Download in the Model Catalog, and only from that model's host.</li>
        </ul>
        <p class="legal-note">Continue as Guest to use every local feature with no account at all.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" data-legal-site>Open remapstudios.com</button>
        <button class="btn-primary" data-legal-close>Close</button>
      </div>
    </div>`;

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-legal-close]").addEventListener("click", close);
  overlay.querySelector("[data-legal-site]").addEventListener("click", () => {
    API.openExternal(kind === "privacy" ? `${SITE_URL}/privacy` : SITE_URL).catch(() => {});
  });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
  document.body.appendChild(overlay);
  overlay.querySelector("[data-legal-close]").focus();
}

function closeDocsModal() {
  document.getElementById("docs-overlay")?.classList.remove("visible");
  state.docsModalOpen = false;
}

function reportIssue() {
  // Prefill what makes a bug report actionable, so users do not have to go
  // hunting for versions.
  const params = new URLSearchParams();
  const body = [
    "### What happened", "", "",
    "### Steps to reproduce", "1. ", "",
    "### Environment",
    `- App: Remap Studios ${state.appVersion || "?"}`,
    `- Platform: ${state.platformName || navigator.platform}`,
    `- Backend: ${state.backendReady ? "ready" : "not running"}${state.backendInfo ? ` (${state.backendInfo.device}, torch ${state.backendInfo.torch})` : ""}`,
    `- Model: ${state.model ? (state.model.model_type || state.model.name || "loaded") : "none"}`,
    `- View: ${state.viewMode}${state.viewMode === "3d" ? ` / ${state.layout3d}` : ""}`,
  ].join("\n");
  params.set("body", body);
  API.openExternal(`${ISSUES_URL}?${params.toString()}`)
    .then(() => log("Opened the issue tracker in your browser", "info"))
    .catch(() => toast("Could not open the issue tracker", "warning", 4000));
}


// ══════════════════════════════════════════
// ACTIVITY BAR
// ══════════════════════════════════════════

function initActivityBar() {
  document.querySelectorAll(".activity-btn[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      // Clicking the already-active panel collapses the sidebar — the same
      // toggle everyone expects from an activity bar.
      const wasActive = btn.classList.contains("active");
      document.querySelectorAll(".activity-btn[data-panel]").forEach(b => b.classList.remove("active"));

      if (wasActive && state.sidebarVisible) {
        toggleSidebar();
        return;
      }
      btn.classList.add("active");
      state.sidebarVisible = true;
      document.getElementById("sidebar").style.display = "flex";
      showSidebarView(panel);

      switch (panel) {
        case "explorer":
          break;
        case "search":
          renderSearchResults(document.getElementById("tensor-search")?.value || "");
          document.getElementById("tensor-search")?.focus();
          break;
        case "models":
          switchTab("models");
          break;
        case "unlearn":
          switchTab("unlearn");
          break;
      }
    });
  });

  document.getElementById("btn-activity-settings")?.addEventListener("click", () => toggleModal("settings-overlay"));
  document.querySelectorAll("[data-legal]").forEach((btn) => {
    btn.addEventListener("click", () => openLegalModal(btn.dataset.legal));
  });
  state.sidebarView = "explorer";
  bindSidebarViewShortcut();
}

// The sidebar hosts two mutually exclusive views: the model tree and the tensor
// search results. Only one is ever in the DOM flow at a time.
function showSidebarView(panel) {
  state.sidebarView = panel === "search" ? "search" : "explorer";
  const tree = document.getElementById("model-tree");
  const search = document.getElementById("sidebar-search");
  if (!tree || !search) return;
  const searching = state.sidebarView === "search";
  tree.classList.toggle("hidden", searching);
  search.classList.toggle("hidden", !searching);
  const header = document.querySelector("#sidebar .panel-title");
  if (header) header.textContent = searching ? "TENSOR SEARCH" : "MODEL EXPLORER";
  // The tree's refresh/collapse actions are meaningless for search results.
  document.querySelectorAll("#sidebar .panel-header-actions .panel-action").forEach((b) => {
    b.classList.toggle("hidden", searching);
  });
}

// ⌘⇧F jumps straight to the search view from anywhere in the app.
function bindSidebarViewShortcut() {
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || !e.shiftKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key !== "f") return;
    e.preventDefault();
    document.querySelector('.activity-btn[data-panel="search"]')?.click();
  });
}

// ══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't capture if typing in an input
    const tag = e.target.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const mod = e.metaKey || e.ctrlKey;
    // With Shift held, e.key for a letter is uppercase ("P"), which never
    // matched the lowercase comparisons below — normalise single characters
    // so Cmd+Shift+P / O / R actually fire on a real keyboard.
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    // Command palette: Cmd+K
    if (mod && key === "k") { e.preventDefault(); openCommandPalette(); return; }

    // If command palette is open, don't process other shortcuts
    if (state.commandPaletteOpen) return;

    // If typing in an input, only handle Escape
    if (isInput && e.key !== "Escape") return;

    // 3D viewport shortcuts (L/C/R/Space/G) — only while the 3D view is live.
    if (handle3DShortcut(e)) { e.preventDefault(); return; }

    // G toggles 2D ↔ 3D from either view, but never while typing.
    if (!mod && !isInput && e.key.toLowerCase() === "g") {
      e.preventDefault();
      setViewMode(state.viewMode === "3d" ? "2d" : "3d");
      return;
    }

    // Cmd+O: Open file
    if (mod && !e.shiftKey && key === "o") { e.preventDefault(); openFile(); return; }
    // Cmd+Shift+O: Open folder
    if (mod && e.shiftKey && key === "o") { e.preventDefault(); openFolder(); return; }
    // Cmd+E: Export
    if (mod && key === "e") { e.preventDefault(); toggleModal("export-overlay"); return; }
    // Cmd+,: Settings
    if (mod && key === ",") { e.preventDefault(); toggleModal("settings-overlay"); return; }
    // Cmd+B: Toggle sidebar
    if (mod && key === "b") { e.preventDefault(); toggleSidebar(); return; }
    // Cmd+Shift+P: Toggle properties
    if (mod && e.shiftKey && key === "p") { e.preventDefault(); toggleProps(); return; }
    // Cmd+`: Toggle terminal
    if (mod && key === "`") { e.preventDefault(); toggleTerminal(); return; }
    // Cmd+Shift+R: Start unlearn
    if (mod && e.shiftKey && key === "r") { e.preventDefault(); startUnlearn(); return; }
    // Cmd+/: Shortcuts
    if (mod && key === "/") { e.preventDefault(); toggleModal("shortcuts-overlay"); return; }
    // Cmd+1-5: Switch tabs
    if (mod && ["1","2","3","4","5"].includes(key)) {
      e.preventDefault();
      const tabs = ["visualization", "weights", "heatmap", "unlearn", "models"];
      switchTab(tabs[parseInt(key) - 1]);
      return;
    }
    // Cmd++/-: Zoom
    if (mod && key === "=") { e.preventDefault(); zoomIn(); return; }
    if (mod && key === "-") { e.preventDefault(); zoomOut(); return; }
    if (mod && key === "0") { e.preventDefault(); state.zoom = 1; updateZoom(); return; }
    // Escape: Close modals
    if (e.key === "Escape") {
      closeAllDropdowns();
      document.querySelectorAll(".modal-overlay.visible").forEach(m => m.classList.remove("visible"));
    }
  });
}

// ══════════════════════════════════════════
// VIEW HELPERS
// ══════════════════════════════════════════

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const handle = document.querySelector('.resize-handle[data-resize="sidebar"]');
  state.sidebarVisible = !state.sidebarVisible;
  sidebar.style.display = state.sidebarVisible ? "flex" : "none";
  handle.style.display = state.sidebarVisible ? "" : "none";
  requestModelCanvasRender();
}

function toggleProps() {
  const props = document.getElementById("properties");
  const propsTop = document.getElementById("props-top");
  const handle = document.querySelector('.resize-handle[data-resize="props-chat"]');
  state.propsVisible = !state.propsVisible;
  // Only the properties list collapses: the AI assistant is fixed below it
  // and must stay visible no matter what, so the panel itself never hides.
  if (propsTop) propsTop.style.display = state.propsVisible ? "flex" : "none";
  if (handle) handle.style.display = state.propsVisible ? "" : "none";
  props?.classList.toggle("props-hidden", !state.propsVisible);
}

// ── Dock panes ──────────────────────────────────────────────
// Output and terminal are the two independent panes in the bottom dock. Each
// one shows/hides on its own (close button, toolbar toggle or ⌘`), and the
// dock as a whole minimises to its header. The AI assistant is deliberately
// NOT a dock pane — it is fixed in the sidebar under Properties.
const DOCK_PANES = ["logs", "terminal"];

function dockPaneEl(pane) {
  return document.querySelector(`#bottom-panel .bp-pane[data-pane="${pane}"]`);
}

function dockPaneVisible(pane) {
  const el = dockPaneEl(pane);
  return !!el && !el.classList.contains("hidden");
}

function setDockPaneVisible(pane, visible) {
  const el = dockPaneEl(pane);
  if (!el) return;
  el.classList.toggle("hidden", !visible);
  // A pane's divider belongs to it — hide them together.
  const handle = document.querySelector(`#bottom-panel .resize-handle[data-resize="${pane}"]`);
  if (handle) handle.classList.toggle("hidden", !visible);
  document.querySelectorAll(`#bottom-panel [data-pane-toggle="${pane}"]`)
    .forEach((btn) => btn.classList.toggle("active", visible));
  if (pane === "terminal") {
    state.terminalExpanded = visible;
    // The terminal absorbs the leftover width while it is open. Once it is
    // closed the output pane must fill the dock, not keep a width from an
    // earlier drag — so stash that width and restore it if the terminal
    // comes back.
    const logs = dockPaneEl("logs");
    if (logs) {
      if (visible) {
        if (logs.dataset.flexBeforeTerminalClose) {
          logs.style.flex = logs.dataset.flexBeforeTerminalClose;
          delete logs.dataset.flexBeforeTerminalClose;
        }
      } else {
        logs.dataset.flexBeforeTerminalClose = logs.style.flex;
        logs.style.flex = "";
      }
    }
  }
  const anyVisible = DOCK_PANES.some(dockPaneVisible);
  document.getElementById("bottom-panel")?.classList.toggle("all-panes-closed", !anyVisible);
  if (visible) requestAnimationFrame(() => requestModelCanvasRender());
}

// The whole dock minimises to its 28px header strip, taking output and
// terminal out of the way in one move. The panes keep their own visibility
// while minimised, so restoring the dock brings back exactly what was open.
function toggleDockMinimized(force) {
  const panel = document.getElementById("bottom-panel");
  if (!panel) return;
  const minimized = typeof force === "boolean" ? force : !panel.classList.contains("minimized");
  panel.classList.toggle("minimized", minimized);
  const btn = document.getElementById("btn-minimize-dock");
  if (btn) btn.title = minimized ? "Restore panel" : "Minimize panel";
  if (!minimized) requestAnimationFrame(() => requestModelCanvasRender());
}

// ⌘` / the toolbar button toggle the terminal pane itself: a minimised dock
// is restored first, and nothing else is touched.
function toggleTerminal() {
  const minimized = !!document.getElementById("bottom-panel")?.classList.contains("minimized");
  if (minimized) toggleDockMinimized(false);
  const wasVisible = dockPaneVisible("terminal");
  setDockPaneVisible("terminal", minimized ? true : !wasVisible);
  if (!wasVisible) {
    setTimeout(() => document.getElementById("terminal-input")?.focus(), 80);
  }
}

function zoomIn() { state.zoom = Math.min(3, state.zoom * 1.1); updateZoom(); }
function zoomOut() { state.zoom = Math.max(0.3, state.zoom * 0.9); updateZoom(); }
function updateZoom() {
  document.getElementById("status-zoom").textContent = `${Math.round(state.zoom * 100)}%`;
  if (state.model) requestModelCanvasRender();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function toggleModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.toggle("visible");
  // Some modals show live model state and must be re-read every time they open
  // — the export dialog's summary said nothing at all until a format was
  // clicked, which made it look like the dialog was ignoring the model.
  if (modal.classList.contains("visible") && typeof state.modalRefresh === "object" && state.modalRefresh[id]) {
    try { state.modalRefresh[id](); } catch (e) { /* a refresh failure must not block the modal */ }
  }
}

// ══════════════════════════════════════════
// EXPORT DIALOG
// ══════════════════════════════════════════

function initExportDialog() {
  document.getElementById("export-close")?.addEventListener("click", () => toggleModal("export-overlay"));
  document.getElementById("export-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "export-overlay") toggleModal("export-overlay");
  });

  document.querySelectorAll(".export-option").forEach(opt => {
    opt.addEventListener("click", () => {
      // Unavailable formats explain themselves instead of silently becoming
      // the selected format and failing at write time.
      if (opt.classList.contains("disabled")) {
        toast(opt.dataset.unavailable || "That format is not supported in this build", "warning", 6000);
        return;
      }
      document.querySelectorAll(".export-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      state.exportFormat = opt.dataset.format;
      updateExportSummary();
    });
  });
  // Refresh the summary whenever the dialog is opened.
  state.modalRefresh = Object.assign(state.modalRefresh || {}, { "export-overlay": updateExportSummary });
  document.getElementById("export-precision")?.addEventListener("change", updateExportSummary);
  document.getElementById("export-verify")?.addEventListener("change", updateExportSummary);

  document.getElementById("btn-do-export")?.addEventListener("click", async () => {
    if (!state.model) { log("No model loaded to export", "error"); return; }
    const path = await API.saveFile();
    if (!path) return;

    const precision = document.getElementById("export-precision")?.value || "float16";
    const verify = document.getElementById("export-verify")?.checked !== false;

    // Weight-surgery edits live in the editor's edit log, not in the file, so
    // a plain model_export would silently drop them. Route through the tensor
    // export that replays the edits when there is anything pending.
    const pending = await API.rpc("tensor_pending").catch(() => null);
    const edits = (pending?.edit_count || 0) + (pending?.delete_count || 0);
    // Quantized GGUF models have no live state dict, so a plain model_export
    // cannot work — tensor_export is their only export path, and it also
    // converts the checkpoint to trainable Safetensors.
    const isGguf = String(state.model?.metadata?.format || "").toLowerCase() === "gguf";
    if (edits > 0 || isGguf) {
      if (edits > 0) {
        log(`Including ${pending.edit_count || 0} edit(s) and ${pending.delete_count || 0} deletion(s) in the export.`, "info");
      }
      if (isGguf && precision === "float32") log("Converting quantized tensors at float32 precision", "info");
      await exportModelWithEdits(path, { allowEmpty: isGguf, dtype: precision, verify });
      toggleModal("export-overlay");
      return;
    }

    log(`Exporting model as ${state.exportFormat} to ${path}...`, "info");
    try {
      const result = await API.rpc("model_export", { path, format: state.exportFormat, verify });
      if (result.error) throw new Error(result.error);
      const v = result.verification;
      if (v && v.ok && !v.skipped) log(`Verified: ${v.tensor_count} tensors readable (${formatBytes(v.size_bytes)})`, "success");
      else if (v && v.skipped) log(`Written (${formatBytes(v.size_bytes)}); header verification is safetensors-only`, "info");
      log(`Export complete: ${path}`, "success");
      toast(`Exported to ${path.split(/[\\/]/).pop()}`, "success", 3500, {
        action: "Copy path",
        onAction: () => copyToClipboard(path, "Copied export path"),
      });
      toggleModal("export-overlay");
    } catch (e) {
      log(`Export failed: ${e.message}`, "error");
      toast(`Export failed: ${e.message}`, "error", 8000);
    }
  });
}

// Show what the current selection will actually produce, including the things
// that are easy to get wrong: where pending edits go, and the file size at the
// chosen precision.
function updateExportSummary() {
  const host = document.getElementById("export-summary");
  if (!host) return;
  if (!state.model) {
    host.innerHTML = '<div class="export-summary-empty">Open a model to export it</div>';
    return;
  }
  const precision = document.getElementById("export-precision")?.value || "float16";
  const fmt = state.exportFormat === "pt" ? "pytorch" : state.exportFormat;
  const isGguf = String(state.model?.metadata?.format || "").toLowerCase() === "gguf";
  const roundTrip = isGguf || fmt !== String(state.model?.metadata?.format || "").toLowerCase();
  const size = state.model?.size || 0;
  // float16 is half the bytes of float32 for the converted path.
  const estimate = roundTrip && size ? (precision === "float32" ? size : size * 0.5) : size;
  host.innerHTML = `
    <div class="export-summary-row"><span>Format</span><b>${escapeHtml(state.exportFormat)}</b></div>
    ${roundTrip ? `<div class="export-summary-row"><span>Converted to</span><b>Safetensors (${escapeHtml(precision)})</b></div>` : ""}
    ${estimate ? `<div class="export-summary-row"><span>Estimated size</span><b>~${formatBytes(estimate)}</b></div>` : ""}
    <div class="export-summary-note">${roundTrip
      ? "Quantized tensors are dequantized and re-written, so every element is converted. This can take a while for large models."
      : "Written in the model's own precision."}</div>`;
}

function exportConfig() {
  if (!state.model) { log("No model loaded", "error"); return; }
  const config = {
    model: state.model.name,
    format: state.model.metadata?.format,
    unlearn: {
      target: document.getElementById("unlearn-target")?.value,
      method: document.getElementById("unlearn-method")?.value,
      steps: parseInt(document.getElementById("unlearn-steps")?.value || "200"),
      learningRate: Math.pow(10, parseFloat(document.getElementById("unlearn-lr")?.value || "-5")),
      retainWeight: parseFloat(document.getElementById("unlearn-retain")?.value || "2.0"),
    },
  };
  const json = JSON.stringify(config, null, 2);
  log("Config exported to console", "info");
  console.log(json);
}

// ══════════════════════════════════════════
// SETTINGS PANEL
// ══════════════════════════════════════════

function initSettingsPanel() {
  document.getElementById("settings-close")?.addEventListener("click", () => toggleModal("settings-overlay"));
  document.getElementById("settings-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "settings-overlay") toggleModal("settings-overlay");
  });
  document.getElementById("shortcuts-close")?.addEventListener("click", () => toggleModal("shortcuts-overlay"));
  document.getElementById("shortcuts-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "shortcuts-overlay") toggleModal("shortcuts-overlay");
  });
  document.getElementById("about-close")?.addEventListener("click", () => toggleModal("about-overlay"));
  document.getElementById("about-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "about-overlay") toggleModal("about-overlay");
  });

  // Settings navigation
  document.querySelectorAll(".settings-nav-item").forEach(item => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".settings-nav-item").forEach(i => i.classList.remove("active"));
      document.querySelectorAll(".settings-section-page").forEach(s => s.classList.remove("active"));
      item.classList.add("active");
      const sectionId = `settings-section-${item.dataset.settingsSection}`;
      document.getElementById(sectionId)?.classList.add("active");
      // Refresh live data when entering the backend page
      if (item.dataset.settingsSection === "backend") refreshBackendStatusCard();
    });
  });

  // Backend status card + restart button
  refreshBackendStatusCard();
  document.getElementById("btn-backend-restart")?.addEventListener("click", async () => {
    const card = document.getElementById("backend-status-card");
    if (card) card.textContent = "Restarting backend…";
    try { await API.restartBackend(); } catch (e) { if (card) card.textContent = `Restart failed: ${e.message}`; }
    setTimeout(refreshBackendStatusCard, 1500);
  });

  // Install / repair Python packages (same flow the launch dialog offers).
  const repair = async () => {
    const card = document.getElementById("backend-env-card");
    if (card) card.textContent = "Checking Python packages…";
    try { const s = await API.checkDeps(); renderDependencyGate(s); } catch (e) { if (card) card.textContent = `Check failed: ${e.message}`; }
    setTimeout(refreshBackendStatusCard, 500);
  };
  document.getElementById("btn-backend-deps")?.addEventListener("click", repair);
  document.getElementById("btn-backend-check")?.addEventListener("click", repair);

  wireSettingsControls();

  // Initialize settings user info
  updateSettingsUserInfo();
}

// ── Settings controls ────────────────────────────────────────────────────────
// Every preference in SETTINGS_SPEC gets a live control here. These used to be
// markup-only: the toggles flipped in the DOM and nothing anywhere read them,
// so the app behaved identically whichever way they were set.
function wireSettingsControls() {
  const toggle = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = state.settings[key] !== false;
    el.addEventListener("change", () => {
      setSetting(key, el.checked);
      // GPU acceleration is a special case: it routes through the device pin.
      if (key === "gpu" && el.checked) {
        const deviceSel = document.getElementById("setting-device");
        if (deviceSel && deviceSel.value === "cpu") {
          deviceSel.value = "auto";
          setSetting("device", "auto", { announce: false });
        }
      }
    });
  };
  const select = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state.settings[key];
    el.addEventListener("change", () => {
      setSetting(key, el.value);
      if (key === "device" && el.value !== "auto") {
        const gpu = document.getElementById("setting-gpu");
        if (gpu && el.value === "cpu" && gpu.checked) {
          gpu.checked = false;
          setSetting("gpu", false, { quiet: true, announce: false });
        } else if (gpu && el.value !== "cpu" && !gpu.checked) {
          gpu.checked = true;
          setSetting("gpu", true, { quiet: true, announce: false });
        }
      }
    });
  };

  toggle("setting-autoload", "autoload");
  toggle("setting-welcome", "welcome");
  toggle("setting-gpu", "gpu");
  toggle("setting-connections", "connections");
  toggle("setting-autosave", "autosave");
  select("setting-anim-speed", "animSpeed");
  select("setting-default-method", "defaultMethod");
  select("setting-device", "device");

  // ── Preferred interpreter ──
  const pyInput = document.getElementById("setting-python");
  if (pyInput) {
    pyInput.value = state.settings.pythonPath || "";
    // Commit on blur/Enter rather than per keystroke: changing the interpreter
    // re-runs the dependency probe, which is far too heavy to trigger on every
    // character typed.
    const commit = () => {
      const next = pyInput.value.trim();
      if (next === (state.settings.pythonPath || "")) return;
      setSetting("pythonPath", next, { announce: true });
    };
    pyInput.addEventListener("blur", commit);
    pyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); pyInput.blur(); }
      if (e.key === "Escape") { pyInput.value = state.settings.pythonPath || ""; pyInput.blur(); }
    });
  }
  document.getElementById("btn-python-browse")?.addEventListener("click", async () => {
    try {
      const res = await API.openFile();
      const picked = res && (res.path || (Array.isArray(res.filePaths) && res.filePaths[0]));
      if (!picked) return; // user cancelled
      if (pyInput) pyInput.value = picked;
      setSetting("pythonPath", picked);
    } catch (e) {
      toast(`Could not choose an interpreter: ${e.message}`, "warning", 6000);
    }
  });
  document.getElementById("btn-python-reset")?.addEventListener("click", () => {
    if (pyInput) pyInput.value = "";
    setSetting("pythonPath", "");
  });

  // ── Reset everything ──
  document.getElementById("btn-settings-reset")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Reset all settings?",
      body: "Every preference goes back to its default. Models, edits and the Python environment are untouched.",
      confirm: "Reset settings",
      danger: true,
    });
    if (!ok) return;
    try { await API.resetSettings(); } catch (e) { /* fall through to local reset */ }
    state.settings = defaultSettings();
    cacheSettings();
    applyAllSettings({ initial: true });
    syncSettingsControls();
    toast("Settings reset to defaults", "success");
  });

  wireSettingsSearch();
}

// Settings search: filters rows across every page and jumps to the first hit,
// so the five-page panel is searchable instead of click-through.
function wireSettingsSearch() {
  const input = document.getElementById("settings-search");
  const hint = document.getElementById("settings-search-hint");
  if (!input) return;

  const rows = () => [...document.querySelectorAll(".settings-section-page .settings-row")];

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let hits = 0;
    rows().forEach((row) => {
      const text = (row.textContent || "").toLowerCase();
      const match = !q || text.includes(q);
      row.classList.toggle("settings-row-hidden", !match);
      if (match) hits++;
    });
    // Hide group titles whose whole group is filtered out.
    document.querySelectorAll(".settings-section-page .settings-section").forEach((section) => {
      const anyVisible = [...section.querySelectorAll(".settings-row")].some((r) => !r.classList.contains("settings-row-hidden"));
      section.classList.toggle("settings-row-hidden", q && !anyVisible);
    });
    document.querySelectorAll(".settings-nav-item").forEach((item) => {
      const page = document.getElementById(`settings-section-${item.dataset.settingsSection}`);
      const anyVisible = page && [...page.querySelectorAll(".settings-row")].some((r) => !r.classList.contains("settings-row-hidden"));
      item.classList.toggle("settings-nav-dim", Boolean(q) && !anyVisible);
    });

    if (hint) hint.textContent = q ? `${hits} match${hits === 1 ? "" : "es"}` : "";

    // With an active query, reveal the first page that still has hits so the
    // user is not left staring at a filtered-out page.
    if (q) {
      const navItems = [...document.querySelectorAll(".settings-nav-item")];
      const target = navItems.find((i) => !i.classList.contains("settings-nav-dim"));
      if (target && !target.classList.contains("active")) target.click();
    }
  };

  input.addEventListener("input", apply);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.stopPropagation();
      input.value = "";
      apply();
    }
  });
  state.applySettingsSearch = apply;
}

async function refreshBackendStatusCard() {
  const card = document.getElementById("backend-status-card");
  if (!card || !API.getBackendStatus) return;
  try {
    const s = await API.getBackendStatus();
    if (s.ready) {
      card.innerHTML = `<span style="color:#22c55e">● Ready</span> — python: <b>${s.python || "python3"}</b><br><span style="color:var(--text-subtle)">Script: ${s.script || "?"}</span>`;
    } else if (s.lastError) {
      card.innerHTML = `<span style="color:var(--danger)">● Offline</span> — ${s.lastError}<br><span style="color:var(--text-subtle)">Interpreter: ${s.python || "python3"}</span>`;
    } else {
      card.innerHTML = `<span style="color:var(--warning)">● Starting…</span><br><span style="color:var(--text-subtle)">Interpreter: ${s.python || "python3"}</span>`;
    }
  } catch (e) {
    card.textContent = `Status unavailable: ${e.message}`;
  }

  const env = document.getElementById("backend-env-card");
  if (env && API.getDepsStatus) {
    try {
      const d = await API.getDepsStatus();
      const missing = Array.isArray(d.missing) ? d.missing : [];
      const kind = d.envKind === "app-env" ? "app-managed environment"
        : d.envKind === "target-dir" ? "app-managed package directory"
        : d.envKind === "system" ? "system Python (all packages present)" : "not created yet";
      env.innerHTML = [
        `Environment: <b>${kind}</b>`,
        d.envPath || d.plannedEnvPath ? `Path: ${d.envPath || d.plannedEnvPath}` : null,
        d.python ? `Interpreter: ${d.python}${d.pythonVersion ? ` (Python ${d.pythonVersion})` : ""}` : null,
        d.requirementCount ? `Requirements checked: ${d.requirementCount}` : null,
        missing.length
          ? `<span style="color:var(--warning)">Missing ${missing.length}: ${missing.map((m) => m.name).join(", ")}</span>`
          : (d.status === "ok" ? `<span style="color:#22c55e">All packages installed</span>` : null),
      ].filter(Boolean).join("<br>");
    } catch (e) {
      env.textContent = `Package status unavailable: ${e.message}`;
    }
  }
}

function updateSettingsUserInfo() {
  const nameEl = document.getElementById("settings-user-name");
  const emailEl = document.getElementById("settings-user-email");
  const avatarEl = document.getElementById("settings-user-avatar");
  const planEl = document.getElementById("settings-user-plan");

  if (currentUser) {
    if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
    if (emailEl) emailEl.textContent = currentUser.email || "";
    if (avatarEl) {
      if (currentUser.photoURL) {
        avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`;
      } else {
        const initials = (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase();
        avatarEl.innerHTML = `<span style="font-size:20px;font-weight:700;color:var(--bg)">${initials}</span>`;
      }
    }
    if (planEl) planEl.textContent = currentUser.isGuest ? "Guest" : planEl.textContent;
    // Guests have no server account — skip subscription fetch entirely.
    if (!currentUser.isGuest) {
      loadSubscriptionInfo();
    }
  } else {
    if (nameEl) nameEl.textContent = "Not signed in";
    if (emailEl) emailEl.textContent = "";
    if (planEl) planEl.textContent = "—";
  }
}

// ══════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ══════════════════════════════════════════

let currentSubscription = null;

async function loadSubscriptionInfo() {
  try {
    // First, sync subscription status from Razorpay (polling fallback for no-webhook setups)
    try {
      await serverAPI("/api/subscription/sync", { method: "POST" });
    } catch (syncErr) {
      // Sync endpoint might not exist yet or Razorpay not configured — that's OK
      console.debug("[Subscription] Sync skipped:", syncErr.message);
    }
    // Then load the (now-updated) subscription
    const data = await serverAPI("/api/subscription");
    currentSubscription = data;
    updateSubscriptionUI(data);
  } catch (e) {
    console.warn("[Subscription] Failed to load:", e.message);
  }
}

function updateSubscriptionUI(sub) {
  const planEl = document.getElementById("settings-user-plan");
  const planNameEl = document.getElementById("settings-plan-name");
  const featuresEl = document.getElementById("settings-plan-features");
  const upgradeProBtn = document.getElementById("btn-upgrade-pro");
  const upgradeBizBtn = document.getElementById("btn-upgrade-business");
  const cancelBtn = document.getElementById("btn-cancel-subscription");
  const billingInfo = document.getElementById("settings-subscription-info");
  const billingDate = document.getElementById("settings-billing-date");
  const billingAmount = document.getElementById("settings-billing-amount");

  const plan = sub.plan || "free";
  const planNames = { free: "Free Plan", pro: "Pro Plan", business: "Business Plan" };
  const planPrices = { free: "", pro: "₹999/month", business: "₹2,999/month" };

  // Update badge
  if (planEl) {
    planEl.textContent = planNames[plan] || "Free Plan";
    planEl.style.background = plan === "free" ? "var(--bg-secondary)" : plan === "pro" ? "var(--accent)" : "#8b5cf6";
    planEl.style.color = plan === "free" ? "var(--text-secondary)" : "white";
  }

  // Update plan name
  if (planNameEl) planNameEl.textContent = planNames[plan] || "Free Plan";

  // Update features list
  if (featuresEl && sub.features) {
    featuresEl.innerHTML = sub.features.map((f, i) => {
      const locked = i >= (plan === "free" ? 2 : sub.features.length);
      return `<div class="settings-plan-feature ${locked ? "locked" : ""}">
        <span class="settings-plan-feature-icon">${locked ? "✗" : "✓"}</span>
        <span>${f}</span>
      </div>`;
    }).join("");
  }

  // Show/hide upgrade buttons based on current plan
  if (upgradeProBtn) {
    upgradeProBtn.style.display = plan === "free" ? "" : "none";
  }
  if (upgradeBizBtn) {
    upgradeBizBtn.style.display = plan === "pro" ? "" : "none";
  }

  // Show/hide cancel button
  if (cancelBtn) {
    cancelBtn.style.display = plan === "free" ? "none" : "";
  }

  // Show billing info for paid plans
  if (billingInfo && plan !== "free") {
    billingInfo.style.display = "";
    if (billingDate && sub.currentPeriodEnd) {
      billingDate.textContent = new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
      });
    }
    if (billingAmount) {
      billingAmount.textContent = planPrices[plan] || "—";
    }
  } else if (billingInfo) {
    billingInfo.style.display = "none";
  }
}

// Global functions for HTML onclick
window.openUpgrade = async function(planKey) {
  try {
    log(`Starting ${planKey} subscription...`, "info");
    const data = await serverAPI("/api/subscription/create", {
      method: "POST",
      body: JSON.stringify({ plan: planKey }),
    });

    if (data.error) throw new Error(data.error);

    // Open Razorpay checkout in system browser
    // The user will complete payment there, and webhooks will update the subscription
    const options = {
      subscription_id: data.subscriptionId,
      key: data.razorpayKeyId,
      amount: data.amount,
      currency: data.currency,
      name: "Remap Studios",
      description: `${planKey === "pro" ? "Pro" : "Business"} Plan — Monthly Subscription`,
      handler: function(response) {
        log("Payment successful! Subscription activated.", "success");
        loadSubscriptionInfo();
      },
      prefill: {
        email: currentUser?.email || "",
        name: currentUser?.displayName || "",
      },
      theme: {
        color: "#6366f1",
      },
      modal: {
        ondismiss: function() {
          log("Payment cancelled", "warning");
        },
      },
    };

    // Try to use Razorpay checkout
    if (typeof Razorpay !== "undefined") {
      const rzp = new Razorpay(options);
      rzp.open();
    } else {
      // Fallback: open Razorpay hosted checkout page
      log("Opening payment page...", "info");
      // Create a form and submit to Razorpay
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://api.razorpay.com/v1/checkout/embedded`;
      form.target = "_blank";

      const fields = {
        subscription_id: data.subscriptionId,
        key_id: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: "Remap Studios",
        description: `${planKey === "pro" ? "Pro" : "Business"} Plan`,
        handler: window.location.origin + "/payment-success",
      };

      for (const [k, v] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    }
  } catch (e) {
    log(`Subscription error: ${e.message}`, "error");
  }
};

window.cancelSubscription = async function() {
  if (!confirm("Are you sure you want to cancel? Your subscription will remain active until the end of the billing period.")) {
    return;
  }

  try {
    const result = await serverAPI("/api/subscription/cancel", {
      method: "POST",
    });
    log(result.message || "Subscription cancelled", "info");
    loadSubscriptionInfo();
  } catch (e) {
    log(`Cancel error: ${e.message}`, "error");
  }
};

function logoutUser() {
  const confirmBtn = document.getElementById("settings-logout-btn");
  const resetBtn = () => {
    if (confirmBtn) {
      confirmBtn.textContent = "Sign Out";
      confirmBtn.disabled = false;
    }
  };

  // Guest sessions are local-only — just clear and return to login.
  if (currentUser && currentUser.isGuest) {
    currentUser = null;
    localStorage.removeItem("remap_user");
    showAuthScreen();
    resetBtn();
    return;
  }

  if (!firebaseAuth) { resetBtn(); return; }
  if (confirmBtn) {
    confirmBtn.textContent = "Signing out...";
    confirmBtn.disabled = true;
  }
  firebaseAuth.signOut()
    .then(() => {
      console.log("Auth: user signed out");
      currentUser = null;
      localStorage.removeItem("remap_user");
      showAuthScreen();
      resetBtn();
    })
    .catch((e) => {
      console.error("Sign out error:", e);
      resetBtn();
    });
}

// ══════════════════════════════════════════
// CONTEXT MENU
// ══════════════════════════════════════════

function initContextMenu() {
  const menu = document.getElementById("context-menu");
  if (!menu) return;

  // Right-click works on tree nodes (layers) and weight rows. Both carry the
  // name the menu acts on, so every action below has a real target — the
  // previous version fired "Copied to clipboard" at nothing at all.
  document.addEventListener("contextmenu", (e) => {
    const target = e.target.closest(".tree-node, .weight-item");
    if (!target) return;
    e.preventDefault();

    const tensorName = target.dataset.tensor || target.dataset.name || target.querySelector("[data-tensor]")?.dataset.tensor || null;
    // Layer rows are not tensors: "View Heatmap" / "Export Tensor" make no
    // sense for them, so disable rather than silently doing the wrong thing.
    state.contextTarget = {
      name: tensorName,
      path: state.model && state.model.path ? state.model.path : (state.modelPath || null),
      isTensor: Boolean(tensorName),
    };

    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      const needsTensor = ["view-heatmap", "view-properties", "export-tensor", "copy-name"].includes(item.dataset.action);
      const disabled = needsTensor && !tensorName;
      item.classList.toggle("disabled", disabled);
      item.title = disabled ? "Right-click a specific weight" : "";
    });

    // Flip the menu before it runs off the viewport edge.
    menu.classList.add("visible");
    const rect = menu.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - rect.width - 8);
    const y = Math.min(e.clientY, window.innerHeight - rect.height - 8);
    menu.style.top = `${Math.max(8, y)}px`;
    menu.style.left = `${Math.max(8, x)}px`;
    menu.querySelector(".context-menu-item:not(.disabled)")?.focus();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#context-menu")) menu.classList.remove("visible");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("visible")) {
      e.stopPropagation();
      menu.classList.remove("visible");
    }
  });

  menu.querySelectorAll(".context-menu-item").forEach((item) => {
    item.setAttribute("tabindex", "0");
    const run = () => {
      if (item.classList.contains("disabled")) return;
      menu.classList.remove("visible");
      handleContextAction(item.dataset.action, state.contextTarget || {});
    };
    item.addEventListener("click", run);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); run(); }
      if (e.key === "ArrowDown") { e.preventDefault(); item.nextElementSibling?.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); item.previousElementSibling?.focus(); }
    });
  });
}

async function handleContextAction(action, target) {
  const name = target.name;
  switch (action) {
    case "copy-name":
      await copyToClipboard(name, "Copied tensor name");
      break;
    case "copy-path":
      await copyToClipboard(target.path || "(no model path)", "Copied model path");
      break;
    case "view-properties":
      // Reveal the weight in the explorer and focus the properties panel, so
      // "view properties" actually shows them instead of assuming they are up.
      state.pendingTensorSelection = name;
      switchTab("weights");
      selectTensor(name);
      if (!state.propsVisible) toggleProps();
      toast(`Properties: ${name}`, "info", 2200);
      break;
    case "view-heatmap":
      switchTab("heatmap");
      {
        const picker = document.getElementById("heatmap-layer-select");
        if (picker && [...picker.options].some((o) => o.value === name)) {
          picker.value = name;
          picker.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          // The picker only lists sampled tensors; fall back to the generic
          // render path so the tab still shows the right tensor.
          renderHeatmap({ tensor: name });
        }
      }
      break;
    case "export-tensor":
      await exportSingleTensor(name);
      break;
    default:
      log(`Unhandled context action: ${action}`, "warning");
  }
}// ══════════════════════════════════════════
// SEARCH PANEL
// ══════════════════════════════════════════
// The activity bar's magnifier used to open the explorer ("TODO: Search panel").
// This is a real cross-model tensor search: name, shape, dtype and layer, with
// fuzzy scoring so "attn k" finds blk.0.attn_k.weight without the exact spelling.
function initSearchPanel() {
  const btn = document.querySelector('.activity-btn[data-panel="search"]');
  const input = document.getElementById("tensor-search");
  if (input) {
    input.addEventListener("input", () => renderSearchResults(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) { e.stopPropagation(); input.value = ""; renderSearchResults(""); return; }
      if (e.key === "Enter") {
        const first = document.querySelector("#tensor-search-results .search-hit");
        first?.click();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const hits = [...document.querySelectorAll("#tensor-search-results .search-hit")];
        const idx = hits.findIndex((h) => h === document.activeElement);
        const next = e.key === "ArrowDown" ? Math.min(hits.length - 1, idx + 1) : Math.max(0, idx - 1);
        (hits[next] || hits[0])?.focus();
      }
    });
  }
  btn && renderSearchResults("");
}

function searchTensors(query) {
  const q = String(query || "").trim().toLowerCase();
  const tensors = state.tensors || [];
  if (!q) return tensors.slice(0, 40).map((t) => ({ tensor: t, score: 0 }));

  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const t of tensors) {
    const name = String(t.name || "").toLowerCase();
    const hay = `${name} ${t.dtype || ""} ${(t.shape || []).join("x")}`.toLowerCase();
    let score = 0;
    let all = true;
    for (const term of terms) {
      const at = hay.indexOf(term);
      if (at === -1) { all = false; break; }
      // Prefix and word-boundary hits rank above scattered substrings, and a
      // hit in the name beats one in the shape string.
      score += 100 - Math.min(at, 99);
      if (name.startsWith(term)) score += 60;
      if (new RegExp(`[.\-_/]${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) score += 40;
    }
    if (!all) continue;
    score += Math.max(0, 30 - name.length / 8);
    scored.push({ tensor: t, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 200);
}

function renderSearchResults(query) {
  const host = document.getElementById("tensor-search-results");
  if (!host) return;
  if (!state.tensors || !state.tensors.length) {
    host.innerHTML = '<div class="empty-state"><p class="empty-title">No model loaded</p><p class="empty-desc">Open a model to search its weights</p></div>';
    return;
  }
  const hits = searchTensors(query);
  const count = document.getElementById("tensor-search-count");
  if (count) count.textContent = `${hits.length}${query ? " match" + (hits.length === 1 ? "" : "es") : " tensors"}`;

  if (!hits.length) {
    host.innerHTML = `<div class="empty-state"><p class="empty-title">No matches</p><p class="empty-desc">Nothing matches “${escapeHtml(query)}”. Try a layer name, dtype or shape.</p></div>`;
    return;
  }

  host.innerHTML = hits.map(({ tensor: t }) => {
    const shape = (t.shape || []).join(" × ") || "scalar";
    return `
      <button class="search-hit" data-tensor="${escapeHtml(t.name)}" tabindex="0">
        <span class="search-hit-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
        <span class="search-hit-meta">
          <span>${escapeHtml(shape)}</span>
          <span>${escapeHtml(t.dtype || "?")}</span>
          ${t.param_count ? `<span>${formatParams(t.param_count)}</span>` : ""}
        </span>
      </button>`;
  }).join("");

  host.querySelectorAll(".search-hit").forEach((el) => {
    el.addEventListener("click", () => {
      const name = el.dataset.tensor;
      // Reveal it in the explorer AND focus it, so the properties panel fills in.
      switchTab("weights");
      selectTensor(name);
      log(`Located ${name}`, "info");
    });
  });
}

// ══════════════════════════════════════════
// WEIGHT MULTI-SELECT
// ══════════════════════════════════════════
// Cmd/Ctrl-click and Shift-click build a selection set, which Edit ▸ Copy and
// Edit ▸ Paste operate on — the "apply this same edit to these 12 tensors"
// workflow that otherwise means twelve round trips.
function initWeightMultiSelect() {
  const body = document.getElementById("weight-explorer-body");
  if (!body) return;
  let lastIdx = -1;

  body.addEventListener("click", (e) => {
    const row = e.target.closest(".weight-item");
    if (!row) return;
    const meaningful = e.metaKey || e.ctrlKey || e.shiftKey;
    if (!meaningful) {
      // A plain click clears any multi-selection.
      if (state.multiSelectedTensors.length) {
        state.multiSelectedTensors = [];
        body.querySelectorAll(".multi-selected").forEach((r) => r.classList.remove("multi-selected"));
        updateSelectionCount();
      }
      lastIdx = -1;
      return;
    }

    const rows = [...body.querySelectorAll(".weight-item")];
    const idx = rows.indexOf(row);
    if (e.shiftKey && lastIdx >= 0) {
      const [a, b] = [Math.min(lastIdx, idx), Math.max(lastIdx, idx)];
      for (let i = a; i <= b; i++) addToSelection(rows[i]);
    } else {
      toggleSelection(row);
      lastIdx = idx;
    }
    updateSelectionCount();
  });
}

function addToSelection(row) {
  if (!row) return;
  const name = row.dataset.tensor;
  if (!name) return;
  row.classList.add("multi-selected");
  if (!state.multiSelectedTensors.includes(name)) state.multiSelectedTensors.push(name);
}

function toggleSelection(row) {
  const name = row.dataset.tensor;
  if (!name) return;
  const at = state.multiSelectedTensors.indexOf(name);
  if (at === -1) { state.multiSelectedTensors.push(name); row.classList.add("multi-selected"); }
  else { state.multiSelectedTensors.splice(at, 1); row.classList.remove("multi-selected"); }
}

function updateSelectionCount() {
  const el = document.getElementById("we-selection-count");
  const n = state.multiSelectedTensors.length;
  if (el) {
    el.textContent = n ? `${n} selected` : "";
    el.classList.toggle("hidden", n === 0);
  }
  const paste = document.querySelector('.dropdown-item[data-action="paste"]');
  if (paste) paste.classList.toggle("disabled", !state.clipboardEdit);
  const copy = document.querySelector('.dropdown-item[data-action="copy"]');
  if (copy) copy.classList.toggle("disabled", n === 0 && !state.selectedTensor);
}

// ══════════════════════════════════════════
// STATUS BAR
// ══════════════════════════════════════════
// The status bar was read-only text. Each segment now does the obvious thing
// when clicked, which is what everyone tries first.
function initStatusBarActions() {
  const clickable = (id, title, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("status-clickable");
    el.title = title;
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", fn);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  clickable("status-model", "Open a model (⌘O)", () => openFile());
  clickable("status-zoom", "Reset zoom to 100% (⌘0)", () => { state.zoom = 1; updateZoom(); });
  clickable("status-platform", "Compute device — open Backend settings", () => {
    toggleModal("settings-overlay");
    document.querySelector('.settings-nav-item[data-settings-section="backend"]')?.click();
  });
  clickable("status-rams", "Open the resource monitor", () => {});
  const ram = document.getElementById("status-ram");
  if (ram) {
    ram.classList.add("status-clickable");
    ram.title = "Live memory — click for details";
    ram.addEventListener("click", () => {
      const hw = state.hardware;
      const info = state.backendInfo;
      log("── Memory ─────────────────────────────", "info");
      if (info) log(`Backend: ${info.ram_available_gb}GB free of ${info.ram_total_gb}GB`);
      if (hw) log(`CPU: ${hw.cpuCount} cores · ${hw.platformName}`);
      log(`Heap (renderer): ${(performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + "MB" : "unknown")}`);
    });
  }
  const params = document.getElementById("status-params");
  if (params) {
    params.classList.add("status-clickable");
    params.title = "Copy the parameter count";
    params.addEventListener("click", () => copyToClipboard(params.textContent, "Copied"));
  }
  const format = document.getElementById("status-format");
  if (format) {
    format.classList.add("status-clickable");
    format.title = "Copy the model format";
    format.addEventListener("click", () => copyToClipboard(format.textContent, "Copied"));
  }
  updateSelectionCount();
}

// ══════════════════════════════════════════
// DOCS MODAL
// ══════════════════════════════════════════
// Help ▸ Documentation opens this instead of a dead log line: it is fully
// offline, so it works in the packaged app with no browser and no network.
function initDocsModal() {
  document.getElementById("docs-close")?.addEventListener("click", closeDocsModal);
  document.getElementById("docs-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "docs-overlay") closeDocsModal();
  });
  document.querySelectorAll("#docs-overlay [data-docs-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#docs-overlay [data-docs-nav]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.docsNav;
      document.querySelectorAll("#docs-overlay .docs-section").forEach((s) => {
        s.classList.toggle("hidden", s.dataset.docsSection !== target);
      });
    });
  });
  document.getElementById("docs-open-readme")?.addEventListener("click", () => {
    API.openExternal(PROJECT_URL).catch(() => toast("Could not open the project page", "warning", 4000));
  });
}

// Export one tensor to its own file (Edit ▸ context menu). Reuses the backend's
// tensor_export so quantised models work too — no full-model materialisation.
async function exportSingleTensor(name) {
  if (!name) { toast("Right-click a specific weight to export it", "warning", 3000); return; }
  try {
    const target = await API.saveFile();
    const path = target && (target.path || (Array.isArray(target.filePaths) && target.filePaths[0]));
    if (!path) return; // cancelled
    toast(`Exporting ${name}…`, "info", 2500);
    const res = await API.rpc("tensor_export_one", { name, path });
    if (res && res.error) { toast(`Export failed: ${res.error}`, "error", 7000); return; }
    log(`Exported ${name} → ${path}${res && res.size_bytes ? ` (${formatBytes(res.size_bytes)})` : ""}`, "success");
    toast(`Exported ${name}`, "success", 3000, {
      action: "Show in log",
      onAction: () => log(`Last export: ${path}`),
    });
  } catch (e) {
    toast(`Export failed: ${e.message}`, "error", 7000);
  }
}

// ══════════════════════════════════════════
// BOTTOM PANEL TABS
// ══════════════════════════════════════════

function initBottomPanelTabs() {
  document.querySelectorAll(".bottom-panel-tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".bottom-panel-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      // The tabs drive the output pane — restore the dock and bring it back
      // if it was closed.
      toggleDockMinimized(false);
      setDockPaneVisible("logs", true);
    });
  });

  // Header toggles: one per pane, so a closed pane is always one click away.
  document.querySelectorAll("#bottom-panel [data-pane-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pane = btn.dataset.paneToggle;
      const minimized = !!document.getElementById("bottom-panel")?.classList.contains("minimized");
      // A pane toggle also restores a minimised dock — otherwise showing a
      // pane while the panel is a header strip would look like a no-op.
      if (minimized) {
        toggleDockMinimized(false);
        setDockPaneVisible(pane, true);
      } else {
        setDockPaneVisible(pane, !dockPaneVisible(pane));
      }
    });
  });

  // Per-pane close buttons — output and terminal each close on their own.
  document.querySelectorAll("#bottom-panel [data-pane-close]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setDockPaneVisible(btn.dataset.paneClose, false);
    });
  });

  // Minimise / restore the dock: the chevron button, or a click anywhere on
  // the header strip that is not a tab or an action button.
  document.getElementById("btn-minimize-dock")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDockMinimized();
  });
  document.getElementById("bottom-panel-toggle")?.addEventListener("click", () => toggleDockMinimized());

  document.getElementById("btn-clear-terminal")?.addEventListener("click", (e) => {
    e.stopPropagation();
    ["terminal-output", "terminal-log"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    log("Terminal cleared", "info");
  });

  // Restart the shell. The only way to recover a wedged session used to be to
  // type `exit` and hope — and there was no way at all when a command was
  // hogging the session. API.terminalRestart force-kills and respawns it.
  document.getElementById("btn-restart-terminal")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const busy = state.currentJobId;
    const ok = await confirmDialog({
      title: "Restart the shell?",
      body: busy
        ? "Anything running in the terminal is killed. The unlearning job keeps running — that is handled by the Python backend, not the shell."
        : "The current shell session is killed and a fresh one is started in your home directory. Scrollback in the terminal is lost.",
      confirm: "Restart shell",
    });
    if (!ok) return;
    try {
      await API.terminalRestart();
      toast("Shell restarted", "success", 2500);
    } catch (err) {
      toast(`Could not restart the shell: ${err.message}`, "error", 6000);
    }
  });

  document.getElementById("btn-toggle-terminal")?.addEventListener("click", toggleTerminal);
}

// ══════════════════════════════════════════
// SYSTEM TERMINAL
// ══════════════════════════════════════════
// The terminal pane is attached to the user's real shell (the process lives in
// main.js). App commands are handled here; every other line is written into
// the shell exactly as if it had been typed in a system terminal, and the
// shell's output streams back over IPC.
//
// Interactive shells print prompts to stderr. The prompt we inject carries a
// __REMAP_CWD__…__END__ marker, so the header shows the live working directory
// and the prompt itself is stripped instead of filling the log with shell
// escape-sequence noise.

const TERMINAL_LINE_LIMIT = 3000;
const TERMINAL_CWD_MARKER = /__REMAP_CWD__([\s\S]*?)__END__/g;
// Marker-free prompt leftovers (zsh "% ", bash "$ ", …) carry no information.
const TERMINAL_PROMPT_TAIL = /^[\s%$#>❯·]*$/;
const TERMINAL_DIAGNOSTIC = /(error|not found|no such file|cannot|denied|failed)/i;

const terminalState = {
  shell: "",
  cwd: "",
  markerSeen: false,
  pending: "",          // partial line — prompts arrive without a newline
  pendingBuffer: [],    // startup noise held until the prompt marker appears
  fallbackTimer: null,
  started: false,
};

// /Users/name/x → ~/x (and /home/name/x on Linux)
function termShortCwd(cwd) {
  if (!cwd) return "";
  return cwd.replace(/^(\/Users\/[^/]+|\/home\/[^/]+)(?=\/|$)/, "~");
}

function setTerminalCwd(cwd) {
  terminalState.cwd = cwd || "";
  const label = document.getElementById("terminal-cwd");
  if (label) label.textContent = termShortCwd(terminalState.cwd);
}

function stripAnsi(text) {
  return text
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "")
    .replace(/[\u0007\u0008]/g, "");
}

function extractCwdMarker(text) {
  let cwd = "";
  const clean = text.replace(TERMINAL_CWD_MARKER, (_match, value) => {
    cwd = String(value).trim();
    return "";
  });
  return { clean, cwd };
}

function termAppendShellLine(text, cls) {
  const el = document.getElementById("terminal-log");
  if (!el) return;
  const line = document.createElement("div");
  line.className = "terminal-line";
  if (text !== "") {
    const span = document.createElement("span");
    span.className = "terminal-text" + (cls ? " " + cls : "");
    span.textContent = text;
    line.appendChild(span);
  }
  el.appendChild(line);
  while (el.childElementCount > TERMINAL_LINE_LIMIT) el.removeChild(el.firstElementChild);
  el.scrollTop = el.scrollHeight;
}

function flushTerminalPendingBuffer(cls) {
  for (const text of terminalState.pendingBuffer) termAppendShellLine(text, cls);
  terminalState.pendingBuffer = [];
}

function termHandleShellLine(rawLine, stream) {
  const { clean, cwd } = extractCwdMarker(stripAnsi(rawLine));
  if (cwd) {
    setTerminalCwd(cwd);
    if (!terminalState.markerSeen) {
      terminalState.markerSeen = true;
      // Anything held back was the shell's own startup prompt — drop it.
      terminalState.pendingBuffer = [];
    }
    if (terminalState.fallbackTimer) {
      clearTimeout(terminalState.fallbackTimer);
      terminalState.fallbackTimer = null;
    }
  }

  const text = clean;
  if (text.trim() === "") return;
  if (terminalState.markerSeen && TERMINAL_PROMPT_TAIL.test(text)) return;

  // Before the marker appears (or in shells that never honour it) stderr is a
  // mix of rc-file prompts and real errors; keep the errors, hold the rest.
  if (!terminalState.markerSeen && stream === "stderr" && !TERMINAL_DIAGNOSTIC.test(text)) {
    terminalState.pendingBuffer.push(text);
    return;
  }
  termAppendShellLine(text, stream === "stderr" ? "error" : "");
}

function termHandleShellChunk(chunk, stream) {
  terminalState.pending += chunk;
  const lines = terminalState.pending.split("\n");
  terminalState.pending = lines.pop();

  for (const rawLine of lines) {
    // \r = "redraw this line" (progress output): keep the last segment only.
    let line = rawLine;
    if (line.includes("\r")) {
      const segments = line.split("\r").filter((s) => s !== "");
      line = segments.length ? segments[segments.length - 1] : "";
    }
    termHandleShellLine(line, stream);
  }

  // Prompts have no trailing newline: process a marker in the tail right away
  // so the cwd label updates without waiting for the next command.
  if (terminalState.pending.includes("__REMAP_CWD__")) {
    const { clean, cwd } = extractCwdMarker(stripAnsi(terminalState.pending));
    if (cwd) {
      setTerminalCwd(cwd);
      terminalState.markerSeen = true;
      if (terminalState.fallbackTimer) { clearTimeout(terminalState.fallbackTimer); terminalState.fallbackTimer = null; }
    }
    terminalState.pending = TERMINAL_PROMPT_TAIL.test(clean) ? "" : clean;
  }
}

function armTerminalFallback() {
  clearTimeout(terminalState.fallbackTimer);
  terminalState.fallbackTimer = setTimeout(() => {
    // A shell whose prompt ignores the injection (fish, a custom precmd, …):
    // stop holding stderr back and show everything from here on.
    if (terminalState.markerSeen) return;
    terminalState.markerSeen = true;
    flushTerminalPendingBuffer("muted");
  }, 1500);
}

// App-level commands. Everything else goes to the real shell, so `ls`, `cd`,
// `git`, `npm`, `python`, … behave exactly like the system terminal.
function runAppTerminalCommand(cmd) {
  if (cmd === "clear") {
    ["terminal-output", "terminal-log"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    return true;
  }
  if (cmd === "help") {
    termLog("App commands: clear, help, status, layers, tensors, export, open <path>, unlearn", "info");
    termLog("Everything else runs in your system shell.", "muted");
    return true;
  }
  if (cmd === "status") {
    if (state.model) termLog(`Model: ${state.model.name} | ${state.layers.length} layers | ${state.tensors.length} tensors`, "info");
    else termLog("No model loaded", "warning");
    return true;
  }
  if (cmd === "layers") {
    if (state.layers.length === 0) { termLog("No model loaded", "warning"); return true; }
    state.layers.forEach(l => termLog(`  ${l.name} — ${formatParams(l.total_params)} params`));
    return true;
  }
  if (cmd === "tensors") {
    if (state.tensors.length === 0) { termLog("No model loaded", "warning"); return true; }
    state.tensors.slice(0, 20).forEach(t => termLog(`  ${t.name} [${t.shape.join("x")}] ${t.dtype} ${formatBytes(t.byte_count)}`));
    if (state.tensors.length > 20) termLog(`  ... +${state.tensors.length - 20} more`, "info");
    return true;
  }
  if (cmd.startsWith("open ")) {
    const p = cmd.slice(5).trim();
    if (p) { termLog(`Opening ${p}…`, "info"); loadModel(p, p.split("/").pop(), 0); }
    else termLog("Usage: open <path>", "error");
    return true;
  }
  if (cmd === "export") { termLog("Opening export dialog…"); toggleModal("export-overlay"); return true; }
  if (cmd === "unlearn") { termLog("Opening the unlearn panel…"); switchTab("unlearn"); return true; }
  return false;
}

function initSystemTerminal(termInput, termSend) {
  if (!termInput || !API.terminalStart) return;

  API.onTerminalReady((info) => {
    terminalState.shell = info.shell || "shell";
    terminalState.markerSeen = false;
    terminalState.pending = "";
    terminalState.pendingBuffer = [];
    terminalState.started = true;
    setTerminalCwd(info.cwd);
    termLog(`${terminalState.shell} — system shell · ${termShortCwd(info.cwd || "")}`, "info");
    armTerminalFallback();
  });

  API.onTerminalExit((info) => {
    terminalState.started = false;
    setTerminalCwd("");
    if (info.error) termLog(info.error, "error");
    else termLog(`[${terminalState.shell || "shell"} exited${typeof info.code === "number" ? ` with code ${info.code}` : ""}] Type a command to start a new session.`, "warning");
  });

  API.onTerminalData((payload) => termHandleShellChunk(payload.chunk || "", payload.stream || "stdout"));

  const sendCommand = () => {
    const cmd = termInput.value.trim();
    if (!cmd) return;
    termInput.value = "";
    // Commands and their results live in the terminal pane; the application
    // log keeps its own stream in the OUTPUT pane next to it.
    termLog(`$ ${cmd}`, "user-cmd");
    if (runAppTerminalCommand(cmd)) return;
    if (!terminalState.started) {
      termLog("Starting system shell…", "muted");
      terminalState.started = true;
    }
    API.terminalSend(cmd + "\n");
  };

  if (termSend) termSend.addEventListener("click", sendCommand);
  termInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") { e.preventDefault(); sendCommand(); return; }
    // Ctrl+C interrupts the running command (process-group SIGINT on macOS and
    // Linux; Windows pipes cannot deliver Ctrl+C, so the pane says so).
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      const result = await API.terminalInterrupt();
      if (result && result.ok) termLog("^C", "user-cmd");
      else termLog("Stopping a running command with Ctrl+C is not supported on Windows in this build.", "muted");
    }
  });

  // The terminal pane is visible by default: bring the shell up with the app
  // so the first command runs instantly.
  terminalState.started = true;
  API.terminalStart().catch(() => {});
}

// ══════════════════════════════════════════
// BOTTOM PANEL
// ══════════════════════════════════════════

function initBottomPanel() {
  const termInput = document.getElementById("terminal-input");
  const termSend = document.getElementById("terminal-send");

  // Both panes start open and the dock starts expanded; it can be minimised
  // from its header and restored the same way.
  DOCK_PANES.forEach((pane) => setDockPaneVisible(pane, true));

  // Escape closes only the terminal pane while typing in it — the output
  // pane keeps whatever state the user gave it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dockPaneVisible("terminal")) {
      // An open dialog owns Escape; closing the terminal as well would be
      // surprising (the input can keep focus behind a modal).
      if (document.querySelector(".modal-overlay.visible, .command-palette-overlay.visible")) return;
      const active = document.activeElement;
      if (active && (active.id === "terminal-input" || active.closest(".bp-terminal"))) {
        setDockPaneVisible("terminal", false);
      }
    }
  });

  // System terminal: attach the pane to the user's real shell (see main.js).
  initSystemTerminal(termInput, termSend);

  // ── Backend restart / settings helpers (also used by error cards) ──
  window.restartBackend = async () => {
    log("Restarting Python backend...", "info");
    try { await API.restartBackend(); } catch (e) { log(`Restart failed: ${e.message}`, "error"); }
  };
  window.openBackendSettings = () => {
    toggleModal("settings-overlay");
    document.querySelector('.settings-nav-item[data-settings-section="backend"]')?.click();
  };
}

// ══════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════

function initDragDrop() {
  const body = document.body;
  let dragCounter = 0;

  body.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      body.classList.add("drag-active");
      // Haptic-like visual feedback
      body.style.transition = "background 0.15s ease";
    }
  });

  body.addEventListener("dragover", (e) => {
    e.preventDefault();
    // Show which panel the file is being dragged over
    const center = document.getElementById("center");
    const rect = center?.getBoundingClientRect();
    if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      body.classList.add("drag-over-center");
    }
  });

  body.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      body.classList.remove("drag-active");
      body.classList.remove("drag-over-center");
    }
  });

  body.addEventListener("drop", (e) => {
    e.preventDefault();
    body.classList.remove("drag-active");
    body.classList.remove("drag-over-center");
    dragCounter = 0;

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const resolved = API.fileFromDrop ? API.fileFromDrop(file) : { path: file.path, name: file.name, size: file.size };

      // Look up model info from catalog by filename for nicer display
      const catalogMatch = MODEL_CATALOG.find(m =>
        resolved.name.toLowerCase().includes(m.filename.toLowerCase()) ||
        resolved.name.toLowerCase().includes(m.name.toLowerCase())
      );

      const displayName = catalogMatch ? catalogMatch.name : resolved.name;
      log(`Drop detected: ${displayName}`, "info");

      loadModel(resolved.path || resolved.name, displayName, resolved.size);
    }
  });
}

// ══════════════════════════════════════════
// MODEL OPENERS
// ══════════════════════════════════════════

async function openFile() {
  const file = await API.openFile();
  if (!file) return;
  loadModel(file.path, file.name, file.size);
}

async function openFolder() {
  const result = await API.openFolder();
  if (!result) return;
  loadModel(result.path, result.name, 0, true);
}

function initModelOpeners() {
  document.getElementById("btn-open-model")?.addEventListener("click", openFile);
  document.getElementById("btn-open-model-empty")?.addEventListener("click", openFile);
  document.getElementById("btn-open-welcome")?.addEventListener("click", openFile);
  document.getElementById("btn-open-folder")?.addEventListener("click", openFolder);
  document.getElementById("btn-open-folder-empty")?.addEventListener("click", openFolder);
  document.getElementById("btn-open-welcome-folder")?.addEventListener("click", openFolder);
  document.getElementById("btn-export")?.addEventListener("click", () => toggleModal("export-overlay"));
  document.getElementById("btn-settings")?.addEventListener("click", () => toggleModal("settings-overlay"));
}

// Model-explorer header actions. Refresh and Collapse All used to be pure
// decoration — they had no listeners at all, so clicking them did nothing.
function initExplorerActions() {
  document.getElementById("btn-refresh-tree")?.addEventListener("click", () => {
    if (!state.model) { log("Load a model first", "warning"); return; }
    updateModelTree();
    log("Model tree refreshed", "info");
  });
  document.getElementById("btn-collapse-all")?.addEventListener("click", collapseAllTreeGroups);
}

function collapseAllTreeGroups() {
  if (!state.model) return;
  const groups = new Set(
    state.tensors.map((t) => (t.name.includes(".") ? t.name.split(".")[0] : "root"))
  );
  state.expandedTreeGroups.clear();
  state.collapsedTreeGroups = groups;
  updateModelTree();
}

async function loadModel(filePath, fileName, fileSize, isDirectory = false, opts = {}) {
  // Retry backend readiness a few times — the poller in initBackendListeners
  // can take up to 1s to fire, but users clicking "Open" want instant feedback.
  let retries = 0;
  while (!state.backendReady && retries < 10) {
    log("Waiting for backend...", "info");
    await new Promise(r => setTimeout(r, 300));
    retries++;
  }
  if (!state.backendReady) {
    log("Python backend not ready. Trying anyway...", "warning");
  }

  log(`Loading model: ${fileName}`, "info");
  log(`Path: ${filePath}`);

  // Remember it immediately so a crash mid-load still leaves a useful Recent
  // list, and so the next launch can auto-restore it.
  rememberRecentModel(filePath, fileName, fileSize);
  state.modelSize = fileSize || state.modelSize || 0;
  state.modelIsDirectory = isDirectory === true;

  const overlay = document.getElementById("canvas-overlay");
  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="welcome-screen load-screen">
      <div class="welcome-icon" style="animation: spin 1s linear infinite;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#333" stroke-width="3"/>
          <path d="M24 4a20 20 0 0 1 20 20" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="welcome-title">Loading ${escapeHtml(fileName)}…</h2>
      <p class="welcome-desc" id="load-phase-text">Reading the file header</p>
      <div class="load-skeleton">
        <div class="load-skeleton-row"></div>
        <div class="load-skeleton-row"></div>
        <div class="load-skeleton-row wide"></div>
      </div>
    </div>
  `;
  // Narrate the wait: a 30 s spinner with no explanation reads as a hang.
  const phases = isDirectory
    ? ["Scanning the folder for weight files", "Reading tensor index", "Computing per-tensor statistics", "Building the layer graph"]
    : ["Reading the file header", "Parsing the tensor index", "Computing per-tensor statistics", "Building the layer graph"];
  let phaseIdx = 0;
  const phaseTimer = setInterval(() => {
    phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
    const el = document.getElementById("load-phase-text");
    if (el) el.textContent = phases[phaseIdx];
  }, 1800);
  const stopPhases = () => clearInterval(phaseTimer);

  try {
    const result = await API.rpc(
      isDirectory ? "model_load_folder" : "model_load",
      { path: filePath },
    ).finally(stopPhases);
    // Only treat the response as fatal when the backend flagged a real failure.
    // A GGUF load returns an *informational* `error` string ("visualization
    // works, but statistics/heatmaps/unlearning need real weight data") alongside
    // fully built layers/tensors/summary. Throwing on that string was exactly why
    // quantized models never reached the canvas.
    const hasStructure = Boolean(
      result.format || result.config || result.tensors ||
      result.layer_groups || result.layers || result.summary,
    );
    const isFatal =
      result.file_not_found === true ||
      result.parse_error === true ||
      result.missing_dependencies === true ||
      !hasStructure;
    if (isFatal) {
      throw new Error(result.error || "The selected file did not contain a visualizable model.");
    }
    if (result.error) {
      // Non-fatal advisory (GGUF quantization notice, degraded mode, ...).
      log(result.error, "warning");
    }

    state.model = { path: filePath, name: fileName, size: fileSize, metadata: result };

    // Prefer structure that shipped with the load response. GGUF has no live
    // tensors, so the RPCs below would fail and the canvas would stay empty.
    state.layers = Array.isArray(result.layers) ? result.layers : [];
    state.tensors = Array.isArray(result.tensors) ? result.tensors : [];
    state.modelSummary = result.summary || {};

    // Try to get layers — may fail for GGUF where current_model is null
    try {
      const layersResult = await API.rpc("model_layers");
      if (layersResult && !layersResult.error && Array.isArray(layersResult.layers) && layersResult.layers.length > 0) {
        state.layers = layersResult.layers;
      }
    } catch (e) { log(`Layers not available: ${e.message}`, "warning"); }

    // Try to get tensors — may fail for GGUF
    try {
      const tensorsResult = await API.rpc("weight_list");
      if (tensorsResult && !tensorsResult.error && Array.isArray(tensorsResult.tensors) && tensorsResult.tensors.length > 0) {
        state.tensors = tensorsResult.tensors;
      }
    } catch (e) { log(`Tensors not available: ${e.message}`, "warning"); }

    // Try to get summary — may fail for GGUF
    try {
      const summaryResult = await API.rpc("model_summary");
      if (summaryResult && !summaryResult.error && summaryResult.total_params) {
        state.modelSummary = summaryResult;
      }
    } catch (e) { log(`Summary not available: ${e.message}`, "warning"); }

    // A new model may support a different set of edits — drop every cached
    // capability and seed the new one immediately, so the very first click on
    // a node already shows the real (editable) surgery controls instead of the
    // read-only "cannot be edited yet" fallback.
    state.tensorCapabilities = null;
    state.expandedTreeGroups.clear();
    state.collapsedTreeGroups.clear();
    state.heatmapZoom = 1;
    // Start each freshly loaded model on the fast heatmap default (a small
    // 2-D tensor); a selection from the previous model may not even exist in
    // the new one, and matching names can silently choose a 136M embedding.
    const heatmapSelect = document.getElementById("heatmap-layer-select");
    if (heatmapSelect) heatmapSelect.value = "";
    refreshTensorCapabilities().then(() => {
      if (state.selectedTensor) selectTensor(state.selectedTensor);
    });

    updateBreadcrumb();
    updateStatusBar();
    updateModelTree();
    updateWeightExplorer();
    updateUnlearnButton();
    overlay.classList.add("hidden");
    renderModelCanvas();

    // Keep the 3D scene in step with the freshly loaded model.
    if (state.viewMode === "3d") {
      syncModelTo3D();
      state.nn3d?.start();
    } else if (state.nn3d) {
      syncModelTo3D();
    }
    // Fresh model → fresh stage captions and unlearning marks.
    updateStageLabels();
    syncUnlearnMarks3D();

    // Hide sidebar empty state
    const sidebarEmpty = document.querySelector("#sidebar .empty-state");
    if (sidebarEmpty) { sidebarEmpty.style.display = "none"; sidebarEmpty.classList.add("hidden"); }

    log(`Loaded ${fileName}`, "success");
    log(`${state.layers.length} layers · ${state.tensors.length} tensors`);
    log(`Format: ${result.format} | Size: ${formatBytes(result.size_bytes)}`);

    // Show GGUF-specific info prominently — the model IS visualized, it is
    // just not trainable until converted.
    if (result.format === "gguf" && result.error) {
      const quantName = state.modelSummary?.quantization || result.file_type_name || "quantized";
      toast(`GGUF model visualized (${quantName}). Unlearning needs a Safetensors conversion.`, "warning", 6000);
      log(result.error, "warning");
    }

  } catch (e) {
    log(`Error loading model: ${e.message}`, "error");
    // Still set empty arrays so nothing crashes
    state.layers = state.layers || [];
    state.tensors = state.tensors || [];
    state.modelSummary = state.modelSummary || {};

    // Classify the failure so the user gets an actionable screen instead of a
    // dead canvas — the old UI just said "Failed to load model".
    const msg = e.message || "Unknown error";
    let helpHtml = "";
    if (/backend not available|not ready/i.test(msg)) {
      helpHtml = `
        <p class="welcome-desc" style="color:var(--warning)">The Python backend is not running. It needs Python 3 with torch, safetensors and psutil installed.</p>
        <button class="btn-primary" onclick="restartBackend()">Restart Backend</button>
        <button class="btn-secondary" onclick="openBackendSettings()">Open Backend Settings</button>`;
    } else if (/file not found/i.test(msg)) {
      helpHtml = `
        <p class="welcome-desc">The file moved or is on a drive that is no longer mounted. Try opening it again from File → Open Model.</p>
        <button class="btn-primary" onclick="openFile()">Choose Another File</button>`;
    } else if (/unsupported|unknown file|did not contain/i.test(msg)) {
      helpHtml = `
        <p class="welcome-desc">Supported: .safetensors, .pt, .pth, .bin, .ckpt, .gguf, .onnx, .h5, folders and more.</p>
        <button class="btn-primary" onclick="openFile()">Try Another File</button>`;
    } else if (/memory|out of memory|ram/i.test(msg)) {
      helpHtml = `
        <p class="welcome-desc">Your Mac ran out of memory while loading. Try a smaller/quantized model, or close other apps first.</p>
        <button class="btn-primary" onclick="document.getElementById('canvas-overlay').classList.add('hidden')">Dismiss</button>`;
    } else {
      helpHtml = `
        <button class="btn-primary" onclick="document.getElementById('canvas-overlay').classList.add('hidden')">Dismiss</button>
        <button class="btn-secondary" onclick="restartBackend()">Restart Backend</button>`;
    }
    const overlayEl = document.getElementById("canvas-overlay");
    if (overlayEl) {
      overlayEl.classList.remove("hidden");
      overlayEl.innerHTML = `
        <div class="welcome-screen">
          <h2 class="welcome-title">Failed to load model</h2>
          <p class="welcome-desc" style="max-width:560px;word-break:break-word">${msg}</p>
          <div style="display:flex;gap:10px;margin-top:12px">${helpHtml}</div>
        </div>
      `;
    }
    toast("Model failed to load — see canvas for details", "error");
  }
}

// ══════════════════════════════════════════
// CANVAS RENDERING
// ══════════════════════════════════════════

// PERF: renderModelCanvas used to run synchronously on EVERY mousemove,
// reallocating the canvas backing store each time — the #1 cause of lag once
// a model was loaded. Now: resizing the backing store is throttled (only when
// the container actually changes size) and redraws are coalesced to one per
// animation frame. Same visual result, a fraction of the work.
let _canvasLastW = 0, _canvasLastH = 0;
let _modelCanvasRaf = 0;
let _modelCanvasPending = false;

function requestModelCanvasRender() {
  _modelCanvasPending = true;
  if (_modelCanvasRaf) return;
  _modelCanvasRaf = requestAnimationFrame(() => {
    _modelCanvasRaf = 0;
    if (_modelCanvasPending) {
      _modelCanvasPending = false;
      renderModelCanvas();
    }
  });
}

function renderModelCanvas() {
  const canvas = document.getElementById("model-canvas");
  if (!canvas) return;
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Only touch canvas.width/height (which CLEARS the canvas and reallocates
  // memory) when the size actually changed, not on every redraw.
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    _canvasLastW = rect.width;
    _canvasLastH = rect.height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Apply pan transform
  ctx.save();
  ctx.translate(state.pan.x, state.pan.y);

  const W = rect.width, H = rect.height;
  const pad = { top: 60, bottom: 60, left: 80, right: 80 };

  if (state.layers.length === 0) return;

  const maxCols = Math.min(12, state.layers.length);
  const groupSize = Math.max(1, Math.ceil(state.layers.length / maxCols));
  const groups = [];
  for (let i = 0; i < state.layers.length; i += groupSize) groups.push(state.layers.slice(i, i + groupSize));

  const colSpacing = (W - pad.left - pad.right) / Math.max(1, groups.length - 1);

  const groupData = groups.map((group, gi) => {
    const x = pad.left + gi * colSpacing;
    const maxParams = Math.max(...group.map((l) => l.total_params));
    return {
      x,
      nodes: group.map((layer, li) => {
        const y = pad.top + ((H - pad.top - pad.bottom) / (group.length + 1)) * (li + 1);
        const paramRatio = maxParams > 0 ? layer.total_params / maxParams : 0.5;
        const radius = 4 + paramRatio * 8;
        return { x, y, radius, layer };
      }),
    };
  });

  // Draw connections
  for (let gi = 0; gi < groupData.length - 1; gi++) {
    const from = groupData[gi], to = groupData[gi + 1];
    from.nodes.forEach((fn) => {
      to.nodes.forEach((tn) => {
        ctx.beginPath();
        ctx.moveTo(fn.x + fn.radius + 1, fn.y);
        ctx.lineTo(tn.x - tn.radius - 1, tn.y);
        ctx.strokeStyle = "rgba(82, 82, 82, 0.12)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    });
  }

  // Draw connection lines with gradient fade
  for (let gi = 0; gi < groupData.length - 1; gi++) {
    const from = groupData[gi], to = groupData[gi + 1];
    from.nodes.forEach((fn) => {
      to.nodes.forEach((tn) => {
        const grad = ctx.createLinearGradient(fn.x + fn.radius, fn.y, tn.x - tn.radius, tn.y);
        grad.addColorStop(0, "rgba(59, 130, 246, 0.08)");
        grad.addColorStop(0.5, "rgba(59, 130, 246, 0.04)");
        grad.addColorStop(1, "rgba(59, 130, 246, 0.01)");
        ctx.beginPath();
        ctx.moveTo(fn.x + fn.radius + 1, fn.y);
        ctx.lineTo(tn.x - tn.radius - 1, tn.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });
    });
  }

  // Draw ambient glow behind large nodes
  groupData.forEach((gd) => {
    gd.nodes.forEach((node) => {
      if (node.radius > 8) {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius + 12);
        glow.addColorStop(0, "rgba(59, 130, 246, 0.04)");
        glow.addColorStop(1, "rgba(59, 130, 246, 0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 12, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }
    });
  });

  // Draw nodes with smooth hover glow effect
  const hoverNode = _hoverData ? groupData.flatMap(gd => gd.nodes).find(node => {
    const dx = _hoverData.x - node.x;
    const dy = _hoverData.y - node.y;
    return Math.sqrt(dx*dx + dy*dy) < node.radius + 6;
  }) : null;

  groupData.forEach((gd) => {
    gd.nodes.forEach((node) => {
      const isHovered = node === hoverNode;

      // Outer glow for hovered node
      if (isHovered) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
        ctx.fill();
        ctx.restore();
      }

      // Node body
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      const brightness = 0.45 + (node.radius / 12) * 0.55;

      if (isHovered) {
        // Smooth gradient for hovered node
        const grad = ctx.createRadialGradient(
          node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
          node.x, node.y, node.radius
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${brightness + 0.2})`);
        grad.addColorStop(1, `rgba(229, 229, 229, ${brightness})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = `rgba(229, 229, 229, ${brightness})`;
      }
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = isHovered ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = isHovered ? 1.2 : 0.5;
      ctx.stroke();

      // Hover ring animation
      if (isHovered) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 4 + pulse * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  });

  // Column labels
  groups.forEach((group, gi) => {
    const x = pad.left + gi * colSpacing;
    ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
    ctx.font = '10px "SF Mono", monospace';
    ctx.textAlign = "center";
    let label = group[0].name;
    if (label.length > 14) label = "…" + label.slice(-13);
    ctx.fillText(label, x, H - 20);
    if (group.length > 1) ctx.fillText(`+${group.length - 1}`, x, H - 8);
  });

  // Title
  ctx.fillStyle = "rgba(229, 229, 229, 0.85)";
  ctx.font = 'bold 13px "SF Pro Display", -apple-system, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(state.model?.name || "Model Architecture", pad.left, 30);
  ctx.fillStyle = "rgba(115, 115, 115, 0.6)";
  ctx.font = '11px "SF Mono", "Cascadia Code", monospace';
  ctx.fillText(`${state.layers.length} layers · ${state.modelSummary?.format_params || "?"} params`, pad.left, 48);

  ctx.restore();
}

// ══════════════════════════════════════════
// HEATMAP
// ══════════════════════════════════════════

// Dequantizing a tensor takes a moment, so the panel says what it is doing.
// The overlay is a sibling of the canvas — replacing the body's HTML would
// destroy the canvas element and every later render would silently no-op.
function setHeatmapStatus(body, text) {
  if (!body) return;
  let el = body.querySelector(".heatmap-status");
  if (!text) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.className = "heatmap-status";
    el.innerHTML = `<div class="prop-spinner"></div><span></span>`;
    body.appendChild(el);
  }
  const span = el.querySelector("span");
  if (span) span.textContent = text;
}

// Pick a tensor whose heatmap appears instantly. The embeddings are 136M
// parameters each, so defaulting to state.tensors[0] made the panel look
// broken for several seconds on every visit.
function pickDefaultHeatmapTensor() {
  const tensors = state.tensors || [];
  if (!tensors.length) return null;
  const score = (t) => t.param_count || 0;
  const twoD = tensors
    .filter((t) => score(t) >= 512 && Array.isArray(t.shape) && t.shape.length >= 2)
    .sort((a, b) => score(a) - score(b));
  if (twoD.length) return twoD[0].name;
  return [...tensors].sort((a, b) => score(a) - score(b))[0]?.name || tensors[0].name;
}

// A heatmap is only readable if its palette is. These are the anchor stops of
// each ramp, interpolated to 256 colours on first use. The Settings "Heatmap
// color scheme" select used to have no effect at all: renderHeatmap() always
// wrote R=G=B, so every scheme looked identical.
const HEATMAP_SCHEMES = {
  grayscale: [[0, 0, 0], [255, 255, 255]],
  viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
            [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
  magma: [[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122],
          [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]],
  inferno: [[0, 0, 4], [22, 11, 57], [66, 10, 104], [106, 23, 110], [147, 38, 103],
            [188, 55, 84], [221, 81, 58], [243, 120, 25], [252, 165, 10], [246, 215, 70], [252, 255, 164]],
  // Weights are signed, so a diverging ramp puts zero in the middle of the
  // scale instead of at the bottom — negative and positive become directly
  // comparable at a glance.
  coolwarm: [[59, 76, 192], [98, 130, 234], [141, 176, 254], [184, 208, 249], [221, 221, 221],
             [246, 219, 199], [244, 179, 153], [222, 130, 106], [180, 4, 38]],
};
const HEATMAP_DIVERGING = new Set(["coolwarm"]);
const _heatmapLutCache = {};

function heatmapLut(scheme) {
  const name = HEATMAP_SCHEMES[scheme] ? scheme : "grayscale";
  if (_heatmapLutCache[name]) return _heatmapLutCache[name];
  const anchors = HEATMAP_SCHEMES[name];
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (anchors.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(anchors.length - 1, lo + 1);
    const f = t - lo;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(anchors[lo][c] + (anchors[hi][c] - anchors[lo][c]) * f);
  }
  _heatmapLutCache[name] = lut;
  return lut;
}

function heatmapScheme() {
  return document.getElementById("setting-heatmap-color")?.value || "grayscale";
}

// The backend normalizes on a robust 1–99% window (plain min–max collapsed the
// whole tensor into one shade of grey). Diverging ramps need that window to
// straddle zero so the neutral colour lands exactly on w = 0.
function heatmapDisplayRange(result) {
  let lo = Number.isFinite(result.display_min) ? result.display_min : result.min;
  let hi = Number.isFinite(result.display_max) ? result.display_max : result.max;
  if (HEATMAP_DIVERGING.has(heatmapScheme())) {
    const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
    lo = -m; hi = m;
  }
  return { lo, hi, span: (hi - lo) || 1 };
}

function fmtWeight(v) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e4)) return v.toExponential(2);
  return v.toFixed(4);
}

// Tensor dimensions from the ggml shape (fastest-first) plus what the backend
// actually sampled, so a hovered pixel can be reported in tensor coordinates.
function heatmapTensorGrid(result) {
  const dims = result.shape || [];
  const cols = dims[0] || result.size || 1;
  const total = result.param_count || cols;
  const rows = cols ? Math.max(1, Math.round(total / cols)) : 1;
  const grid = result.grid || { rows: result.size || 1, cols: result.size || 1 };
  return { cols, rows, gridRows: grid.rows || 1, gridCols: grid.cols || 1 };
}

function paintHeatmapHead(result, scheme) {
  const head = document.getElementById("heatmap-head");
  if (!head) return;
  const { cols, rows } = heatmapTensorGrid(result);
  const dimsLabel = (result.shape || []).length >= 2 ? `${rows} × ${cols}` : `${cols}`;
  const clipped = (result.clipped_below_pct || 0) + (result.clipped_above_pct || 0);
  const peak = result.peak;
  head.innerHTML = `
    <span class="heatmap-name" title="${escapeHtml(result.tensor)}">${escapeHtml(result.tensor)}</span>
    <span class="heatmap-chip">${escapeHtml(result.quant_type || "float32")}</span>
    <span class="heatmap-chip">${dimsLabel}</span>
    <span class="heatmap-chip">${formatParams(result.param_count || cols * rows)} params</span>
    <span class="heatmap-chip">${(result.grid && result.grid.rows) || "?"}×${(result.grid && result.grid.cols) || "?"} sampled</span>
    <span class="heatmap-chip accent">${escapeHtml(scheme)}</span>
    ${peak && Number.isFinite(peak.value) ? `<span class="heatmap-chip" title="largest magnitude in the sample">peak ${fmtWeight(peak.value)} @ [${peak.row}, ${peak.col}]</span>` : ""}
    ${clipped > 0.05 ? `<span class="heatmap-chip warn" title="values outside the 1–99% display window are clamped to the ends of the ramp">clamped ${clipped.toFixed(1)}%</span>` : ""}
  `;
}

function paintHeatmapLegend(lut, lo, hi, result) {
  const legend = document.getElementById("heatmap-legend");
  const canvas = document.getElementById("heatmap-legend-canvas");
  const ticks = document.getElementById("heatmap-legend-ticks");
  if (!legend || !canvas || !ticks) return;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const stop = 255 - Math.round((y / Math.max(1, h - 1)) * 255);   // top = high end
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = lut[stop * 3];
      img.data[i + 1] = lut[stop * 3 + 1];
      img.data[i + 2] = lut[stop * 3 + 2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const diverging = HEATMAP_DIVERGING.has(heatmapScheme());
  ticks.innerHTML = `<span>${fmtWeight(hi)}</span>${diverging ? "<span>0</span>" : ""}<span>${fmtWeight(lo)}</span>`;
  legend.title = result.robust
    ? `display window ${fmtWeight(lo)} … ${fmtWeight(hi)} (percentile-normalized)`
    : `value range ${fmtWeight(lo)} … ${fmtWeight(hi)}`;
  legend.hidden = false;
}

function paintHeatmap(result) {
  const canvas = document.getElementById("heatmap-canvas");
  if (!canvas || !result) return;
  const size = result.size || 128;
  const lut = heatmapLut(heatmapScheme());
  const { lo, hi, span } = heatmapDisplayRange(result);
  const dlo = Number.isFinite(result.display_min) ? result.display_min : result.min;
  const dhi = Number.isFinite(result.display_max) ? result.display_max : result.max;

  canvas.width = size;
  canvas.height = size;
  applyHeatmapZoom();

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  const px = imageData.data;
  const data = result.data || [];
  for (let i = 0; i < data.length; i++) {
    // data is normalized on the percentile window; re-project onto the range
    // being displayed (identical unless the ramp is diverging).
    const raw = dlo + data[i] * (dhi - dlo);
    const t = Math.max(0, Math.min(255, Math.round(((raw - lo) / span) * 255)));
    px[i * 4] = lut[t * 3];
    px[i * 4 + 1] = lut[t * 3 + 1];
    px[i * 4 + 2] = lut[t * 3 + 2];
    px[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  paintHeatmapHead(result, heatmapScheme());
  paintHeatmapLegend(lut, lo, hi, result);

  // The label keeps the tensor's real min/max/mean — independent of how the
  // display window was chosen.
  const label = document.getElementById("heatmap-label");
  if (label) {
    label.textContent = `${result.tensor} | min=${result.min.toFixed(4)} max=${result.max.toFixed(4)} mean=${result.mean.toFixed(4)}`
      + (result.robust ? ` | display=${fmtWeight(dlo)}..${fmtWeight(dhi)} (p1–p99)` : "");
  }
  const readout = document.getElementById("heatmap-readout");
  if (readout) readout.textContent = "hover for values · click to inspect";
  canvas.dataset.ready = "1";
}

function heatmapHover(event) {
  const canvas = document.getElementById("heatmap-canvas");
  const out = document.getElementById("heatmap-readout");
  const result = state.heatmapData;
  if (!canvas || !out || !result || !result.data) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const fx = (event.clientX - rect.left) / rect.width;
  const fy = (event.clientY - rect.top) / rect.height;
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
  const size = result.size || 128;
  const gc = Math.min(size - 1, Math.max(0, Math.floor(fx * size)));
  const gr = Math.min(size - 1, Math.max(0, Math.floor(fy * size)));
  const t = result.data[gr * size + gc];
  const dlo = Number.isFinite(result.display_min) ? result.display_min : result.min;
  const dhi = Number.isFinite(result.display_max) ? result.display_max : result.max;
  const raw = dlo + t * (dhi - dlo);
  const { cols, rows, gridRows, gridCols } = heatmapTensorGrid(result);
  const tcol = gridCols > 1 ? Math.round((gc * (cols - 1)) / (gridCols - 1)) : 0;
  const trow = gridRows > 1 ? Math.round((gr * (rows - 1)) / (gridRows - 1)) : 0;
  out.textContent = `w[${trow}, ${tcol}] = ${fmtWeight(raw)}  ·  grid ${gr},${gc}`;
}

async function renderHeatmap() {
  const canvas = document.getElementById("heatmap-canvas");
  if (!canvas || !state.model) return;
  const select = document.getElementById("heatmap-layer-select");
  populateTensorSelect(select);
  const tensorName = select?.value || pickDefaultHeatmapTensor();
  if (!tensorName) return;
  if (select && !select.value) select.value = tensorName;

  const body = document.getElementById("heatmap-body");
  setHeatmapStatus(body, `Reading ${tensorName}…`);

  try {
    const result = await API.rpc("weight_heatmap", { tensor_name: tensorName, size: 128 });
    if (result.error) {
      // Keep the canvas alive; just report why this tensor has no heatmap.
      setHeatmapStatus(body, result.error);
      log(`Heatmap: ${result.error}`, "warning");
      return;
    }
    setHeatmapStatus(body, null);
    state.heatmapData = result;
    paintHeatmap(result);
  } catch (e) {
    setHeatmapStatus(document.getElementById("heatmap-body"), `Heatmap failed: ${e.message}`);
    log(`Heatmap error: ${e.message}`, "error");
  }
}

// ══════════════════════════════════════════
// WEIGHT EXPLORER
// ══════════════════════════════════════════

// Statistics cost a full streaming pass over the tensor, so a small tensor is
// profiled automatically while a 136M-element embedding waits to be asked.
const WE_AUTO_STATS_PARAMS = 2_000_000;
const WE_STATS_CONCURRENCY = 3;
// A broad search can match every tensor in the model; profiling all of them
// would saturate the backend for minutes. Only the first screenful is
// automatic — anything below that offers its own "Load stats" button.
const WE_AUTO_HYDRATE_MAX = 60;

function initWeightExplorer() {
  document.getElementById("weight-layer-select")?.addEventListener("change", (e) => {
    setWeightSearch("");
    renderWeightList(e.target.value);
  });

  // Filter button + input: the layer picker chooses the layer, the filter
  // narrows the tensor rows inside it. The button used to do nothing.
  const filterBtn = document.getElementById("btn-filter-weights");
  const filterInput = document.getElementById("weight-filter-input");
  filterBtn?.addEventListener("click", () => {
    if (!filterInput) return;
    filterInput.hidden = !filterInput.hidden;
    if (!filterInput.hidden) filterInput.focus();
    else filterInput.value = "";
    applyWeightFilter(filterInput.value);
  });
  filterInput?.addEventListener("input", () => applyWeightFilter(filterInput.value));

  // Global search: matches tensors anywhere in the model, so finding "lm_head"
  // does not require crawling a 219-entry layer dropdown.
  const search = document.getElementById("weight-search");
  search?.addEventListener("input", () => {
    state.weightSearch = search.value;
    renderWeightList(currentWeightLayer());
  });

  document.getElementById("weight-sort")?.addEventListener("change", () =>
    renderWeightList(currentWeightLayer()));

  // Per-tensor statistics are opt-out: they are the point of this panel, but
  // the toggle keeps the list instant on a slow machine.
  const statsBtn = document.getElementById("btn-weight-stats");
  const syncStatsBtn = () => {
    if (!statsBtn) return;
    const on = state.weightStatsOn !== false;
    statsBtn.classList.toggle("active", on);
    statsBtn.title = on ? "Hide per-tensor statistics" : "Load per-tensor statistics";
  };
  statsBtn?.addEventListener("click", () => {
    state.weightStatsOn = state.weightStatsOn === false;
    syncStatsBtn();
    renderWeightList(currentWeightLayer());
  });
  syncStatsBtn();

  // Row actions are delegated — the list is re-rendered often and dense.
  document.getElementById("weight-explorer-body")?.addEventListener("click", (e) => {
    const row = e.target.closest(".weight-item");
    if (!row) return;
    const name = row.dataset.tensor;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "heatmap") { openTensorHeatmap(name); return; }
    if (act === "stats") {
      if (!state.weightStatsForced) state.weightStatsForced = new Set();
      state.weightStatsForced.add(name);
      row.querySelector(".weight-stats")?.classList.remove("ask");
      loadWeightRowStats(name);
      return;
    }
    if (name) selectTensor(name);
  });
}

function currentWeightLayer() {
  return document.getElementById("weight-layer-select")?.value || "";
}

function setWeightSearch(value) {
  state.weightSearch = value || "";
  const input = document.getElementById("weight-search");
  if (input) input.value = state.weightSearch;
}

// Tensor names nest as "blk.3.attn_q.weight"; the layer is everything before
// the last segment. Shared by the dropdown labels and the summary bar.
function tensorLayerOf(name) {
  return String(name).split(".").slice(0, -1).join(".");
}

function weightTensorCounts() {
  const counts = {};
  (state.tensors || []).forEach((t) => {
    const layer = tensorLayerOf(t.name);
    counts[layer] = (counts[layer] || 0) + 1;
  });
  return counts;
}

// Pending surgery, indexed by tensor name so rows can badge themselves.
function pendingEditsIndex() {
  const pending = state.tensorCapabilities?.pending || {};
  return {
    edited: pending.edited || {},
    deleted: new Set(pending.deleted || []),
  };
}

// The current list: either one layer's tensors, or every match for the global
// search query. Sorted client-side — the model is only a few hundred tensors.
function weightRowsFor(layerName) {
  const query = (state.weightSearch || "").trim().toLowerCase();
  const all = state.tensors || [];
  let rows, scope;
  if (query) {
    rows = all.filter((t) => t.name.toLowerCase().includes(query));
    scope = "all";
  } else {
    // Require a segment boundary: a substring match made the "output" layer
    // also pull in every blk.N.attn_output tensor from all 27 blocks.
    rows = layerName ? all.filter((t) => t.name.startsWith(layerName + ".")) : [];
    scope = "layer";
  }

  const sort = document.getElementById("weight-sort")?.value || "order";
  const by = {
    name: (a, b) => a.name.localeCompare(b.name),
    params: (a, b) => (b.param_count || 0) - (a.param_count || 0),
    size: (a, b) => (b.byte_count || 0) - (a.byte_count || 0),
  }[sort];
  if (by) rows = [...rows].sort(by);
  return { rows, scope, query };
}

function renderWeightSummary(rows, scope, layerName, query) {
  const el = document.getElementById("weight-summary");
  if (!el) return;
  if (!rows.length) { el.innerHTML = ""; return; }
  const params = rows.reduce((a, t) => a + (t.param_count || 0), 0);
  const bytes = rows.reduce((a, t) => a + (t.byte_count || 0), 0);
  const kinds = {};
  rows.forEach((t) => { const k = t.dtype || "?"; kinds[k] = (kinds[k] || 0) + 1; });
  const kindText = Object.entries(kinds).map(([k, n]) => `${k}×${n}`).join(" ");
  const { edited, deleted } = pendingEditsIndex();
  const editedRows = rows.filter((t) => edited[t.name]?.length).length;
  const deletedRows = rows.filter((t) => deleted.has(t.name)).length;
  el.innerHTML = `
    <span class="we-summary-scope" title="${escapeHtml(scope === "all" ? `search: ${query}` : layerName)}">${escapeHtml(scope === "all" ? `“${query}”` : layerName)}</span>
    <span class="we-summary-item">${rows.length} tensor${rows.length === 1 ? "" : "s"}</span>
    <span class="we-summary-item">${formatParams(params)} params</span>
    <span class="we-summary-item">${formatBytes(bytes)}</span>
    <span class="we-summary-item subtle">${escapeHtml(kindText)}</span>
    ${editedRows ? `<span class="we-summary-item warn">${editedRows} edited</span>` : ""}
    ${deletedRows ? `<span class="we-summary-item danger">${deletedRows} deleted</span>` : ""}
  `;
}

function weightRowHtml(t, opts) {
  const leaf = t.name.split(".").pop();
  const parent = opts.showLayer ? tensorLayerOf(t.name) : "";
  const badges = [];
  if (opts.deleted.has(t.name)) badges.push('<span class="we-badge danger">deleted</span>');
  const edits = opts.edited[t.name];
  if (edits?.length) badges.push(`<span class="we-badge warn">${edits.length} edit${edits.length === 1 ? "" : "s"}</span>`);

  const big = (t.param_count || 0) > WE_AUTO_STATS_PARAMS;
  const belowFold = (opts.index || 0) >= WE_AUTO_HYDRATE_MAX;
  const forced = state.weightStatsForced?.has(t.name);
  const stats = state.weightStatsOn === false ? "" : `
      <div class="weight-stats${(big || belowFold) && !forced ? " ask" : ""}">
        <span class="weight-stat" data-k="mean">μ —</span>
        <span class="weight-stat" data-k="std">σ —</span>
        <span class="weight-stat" data-k="absmax">|max| —</span>
        <span class="weight-stat" data-k="sparsity">zeros —</span>
        <canvas class="weight-spark" width="72" height="16" data-spark></canvas>
        <button class="weight-act wide" data-act="stats">Load stats</button>
      </div>`;

  return `
      <div class="weight-item" data-tensor="${escapeHtml(t.name)}" title="${escapeHtml(t.name)} · click to inspect">
        <div class="weight-top">
          <span class="weight-name">${escapeHtml(leaf)}</span>
          ${parent ? `<span class="weight-parent">${escapeHtml(parent)}</span>` : ""}
          ${badges.join("")}
          <button class="weight-act" data-act="heatmap" title="Open in Weight Heatmap">▦</button>
          <span class="weight-size">${formatBytes(t.byte_count || 0)}</span>
        </div>
        <div class="weight-meta">
          <span class="weight-shape">[${(t.shape || []).join(" × ")}]</span>
          <span class="weight-dtype">${escapeHtml(t.dtype || "?")}</span>
          <span class="weight-params">${formatParams(t.param_count || 0)} params</span>
        </div>
        ${stats}
      </div>`;
}

// Distribution sparkline for a row, drawn from the stats histogram.
function drawWeightSpark(row, hist) {
  const canvas = row?.querySelector("[data-spark]");
  if (!canvas || !hist || !Array.isArray(hist.counts) || !hist.counts.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...hist.counts, 1);
  const bw = w / hist.counts.length;
  hist.counts.forEach((c, i) => {
    const bh = Math.max(1, (c / max) * (h - 2));
    // Same ramp as the Properties histogram and the 3D depth scale.
    const t = i / Math.max(hist.counts.length - 1, 1);
    ctx.fillStyle = `rgb(${Math.round(74 + 166 * t)}, ${Math.round(120 + 74 * t)}, ${Math.round(217 - 128 * t)})`;
    ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1), bh);
  });
}

// Stats arrive per row so the list paints instantly; the token invalidates
// in-flight work when the selection changes mid-flight.
async function hydrateWeightRows(rows) {
  if (state.weightStatsOn === false) return;
  state.weightHydrateToken = (state.weightHydrateToken || 0) + 1;
  const token = state.weightHydrateToken;
  const queue = rows.slice(0, WE_AUTO_HYDRATE_MAX).filter((t) =>
    (t.param_count || 0) <= WE_AUTO_STATS_PARAMS || state.weightStatsForced?.has(t.name));
  let next = 0;
  const worker = async () => {
    while (next < queue.length && token === state.weightHydrateToken) {
      await loadWeightRowStats(queue[next++].name, token);
    }
  };
  await Promise.all(Array.from({ length: Math.min(WE_STATS_CONCURRENCY, queue.length) }, worker));
}

function findWeightRow(name) {
  return [...document.querySelectorAll("#weight-explorer-body .weight-item")]
    .find((row) => row.dataset.tensor === name) || null;
}

async function loadWeightRowStats(name, token) {
  const row = findWeightRow(name);
  if (!row) return;
  const statsHost = row.querySelector(".weight-stats");
  if (token !== undefined && token !== state.weightHydrateToken) return;
  row.classList.add("we-loading");
  try {
    const s = await API.rpc("weight_stats", { tensor_name: name });
    if (token !== undefined && token !== state.weightHydrateToken) return;
    if (s.error) {
      if (statsHost) statsHost.innerHTML = `<span class="weight-stat danger">${escapeHtml(s.error)}</span>`;
      return;
    }
    const set = (k, text) => {
      const el = row.querySelector(`[data-k="${k}"]`);
      if (el) el.textContent = text;
    };
    set("mean", `μ ${fmtWeight(s.mean)}`);
    set("std", `σ ${fmtWeight(s.std)}`);
    set("absmax", `|max| ${fmtWeight(Math.max(Math.abs(s.min ?? 0), Math.abs(s.max ?? 0)))}`);
    set("sparsity", `zeros ${((s.sparsity || 0) * 100).toFixed(1)}%`);
    drawWeightSpark(row, s.histogram);
    if (statsHost) {
      statsHost.classList.remove("ask");
      statsHost.title = `mean ${s.mean}  std ${s.std}  min ${s.min}  max ${s.max}`;
    }
  } catch (e) {
    if (statsHost) statsHost.innerHTML = `<span class="weight-stat danger">${escapeHtml(e.message)}</span>`;
  } finally {
    row.classList.remove("we-loading");
  }
}

function applyWeightFilter(query) {
  const q = (query || "").trim().toLowerCase();
  document.querySelectorAll("#weight-explorer-body .weight-item").forEach((row) => {
    const name = (row.dataset.tensor || "").toLowerCase();
    row.style.display = q && !name.includes(q) ? "none" : "";
  });
}

// Jump straight from a row to that tensor's heatmap.
function openTensorHeatmap(name) {
  const select = document.getElementById("heatmap-layer-select");
  if (select) {
    populateTensorSelect(select);
    select.value = name;
  }
  switchTab("heatmap");
}

function initHeatmapControls() {
  document.getElementById("btn-heatmap-zoom-in")?.addEventListener("click", () => zoomHeatmap(1.25));
  document.getElementById("btn-heatmap-zoom-out")?.addEventListener("click", () => zoomHeatmap(0.8));

  // The tensor picker had no listener at all: choosing a different tensor
  // changed the select's value and nothing else, so the panel kept showing the
  // map it was opened with.
  document.getElementById("heatmap-layer-select")?.addEventListener("change", () => {
    if (state.model) renderHeatmap();
  });

  // Switching palette repaints from the cached sample — no re-read needed.
  // Persistence goes through the shared settings store (durable in userData),
  // which is also what paints the canvas on the next launch.
  const schemeSelect = document.getElementById("setting-heatmap-color");
  if (schemeSelect) {
    // One-time migration from the old renderer-only key.
    try {
      const legacy = localStorage.getItem("remap_heatmap_color");
      if (legacy && HEATMAP_SCHEMES[legacy] && !state.settings.heatmapColorMigrated) {
        state.settings.heatmapColor = legacy;
        state.settings.heatmapColorMigrated = true;
        API.setSetting("heatmapColor", legacy).catch(() => {});
      }
      localStorage.removeItem("remap_heatmap_color");
    } catch (e) { /* storage unavailable — the default is fine */ }
    schemeSelect.value = state.settings.heatmapColor;
    schemeSelect.addEventListener("change", () => {
      setSetting("heatmapColor", schemeSelect.value, { announce: false });
      if (state.heatmapData) paintHeatmap(state.heatmapData);
      log(`Heatmap colour scheme: ${heatmapScheme()}`);
    });
  }

  const canvas = document.getElementById("heatmap-canvas");
  canvas?.addEventListener("mousemove", heatmapHover);
  canvas?.addEventListener("mouseleave", () => {
    const out = document.getElementById("heatmap-readout");
    if (out) out.textContent = "hover for values · click to inspect";
  });
  canvas?.addEventListener("click", () => {
    if (state.heatmapData?.tensor) selectTensor(state.heatmapData.tensor);
  });
}

function zoomHeatmap(factor) {
  state.heatmapZoom = Math.max(0.5, Math.min(8, (state.heatmapZoom || 1) * factor));
  applyHeatmapZoom();
  log(`Heatmap zoom: ${Math.round(state.heatmapZoom * 100)}%`);
}

function applyHeatmapZoom() {
  const canvas = document.getElementById("heatmap-canvas");
  if (!canvas || !state.heatmapData) return;
  const zoom = state.heatmapZoom || 1;
  const base = Math.min(512, state.heatmapData.size * 3);
  canvas.style.width = `${base * zoom}px`;
  canvas.style.height = `${base * zoom}px`;
  // The stylesheet clamps the canvas to its container; lift that while zoomed
  // so it can actually grow and the body scrolls instead of clipping.
  canvas.style.maxWidth = zoom > 1 ? "none" : "";
  canvas.style.maxHeight = zoom > 1 ? "none" : "";
}

function updateWeightExplorer() {
  const select = document.getElementById("weight-layer-select");
  populateLayerSelect(select, weightTensorCounts());
  if (state.layers.length > 0) renderWeightList(state.layers[0].name);
}

async function renderWeightList(layerName) {
  const container = document.getElementById("weight-explorer-body");
  if (!container) return;

  const { rows, scope, query } = weightRowsFor(layerName);
  renderWeightSummary(rows, scope, layerName, query);

  if (!rows.length) {
    container.innerHTML = query
      ? `<div class="empty-state"><p class="empty-title">No tensor matches “${escapeHtml(query)}”</p><p class="empty-desc">Names are matched as substrings, e.g. “attn_k” or “blk.3”</p></div>`
      : '<div class="empty-state"><p class="empty-title">Select a layer</p><p class="empty-desc">…or search every tensor by name above</p></div>';
    return;
  }

  // PERF: the rows themselves paint synchronously from data already in memory;
  // statistics stream in afterwards so a 20-tensor layer never serializes 20
  // round-trips before anything appears.
  const { edited, deleted } = pendingEditsIndex();
  const showLayer = scope === "all";
  container.innerHTML = rows
    .map((t, index) => weightRowHtml(t, { showLayer, edited, deleted, index }))
    .join("");

  applyWeightFilter(document.getElementById("weight-filter-input")?.value);
  hydrateWeightRows(rows);
}

// ══════════════════════════════════════════
// TENSOR INSPECTOR
// ══════════════════════════════════════════
// Selecting a node anywhere in the app (model tree, weight explorer, 3D
// viewport) shows everything known about it on the right, and — for models
// whose weights can be read — lets the user modify, ablate or delete it.
//
// Quantized (GGUF) models are fully supported: the backend dequantizes on
// demand, so the numbers here are the real weights, not placeholders.

async function selectTensor(name) {
  state.selectedTensor = name;
  const propsBody = document.getElementById("properties-body");
  if (!propsBody) return;

  propsBody.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title">TENSOR</div>
      <div class="prop-loading"><div class="prop-spinner"></div><span>Reading ${name}…</span></div>
    </div>`;

  try {
    const result = await API.rpc("weight_stats", { tensor_name: name });

    if (result.error) {
      propsBody.innerHTML = `
        <div class="prop-group">
          <div class="prop-group-title">${escapeHtml(name)}</div>
          <div class="prop-row"><span class="prop-key">Unavailable</span></div>
          <div class="prop-note danger">${escapeHtml(result.error)}</div>
        </div>`;
      return;
    }

    // The capability probe is a separate RPC, so make sure it has actually run
    // before deciding whether this tensor is editable.
    const info = (await refreshTensorCapabilities()) || state.tensorCapabilities || {};
    const ops = info.operations || [];
    const editable = info.editable !== false && ops.length > 0;
    const pendingEdits = result.edits || [];
    const isDeleted = result.deleted === true;

    const num = (v, d = 6) => (Number.isFinite(v) ? v.toFixed(d) : "—");
    const sci = (v) => {
      if (!Number.isFinite(v)) return "—";
      const a = Math.abs(v);
      return (a !== 0 && (a < 1e-3 || a >= 1e5)) ? v.toExponential(3) : v.toFixed(6);
    };

    propsBody.innerHTML = `
      ${pendingEdits.length ? `
        <div class="prop-edits">
          <div class="prop-edits-head">
            <span>${pendingEdits.length} pending edit${pendingEdits.length === 1 ? "" : "s"}</span>
            <button class="prop-mini-btn" onclick="restoreTensor('${jsStr(name)}')">Revert</button>
          </div>
          <div class="prop-edits-list">${pendingEdits.map((e) => `<span class="prop-edit-chip">${escapeHtml(e)}</span>`).join("")}</div>
          <div class="prop-edits-hint">Applied on export. Stats below include these edits.</div>
        </div>` : ""}

      ${isDeleted ? `
        <div class="prop-deleted">
          <span>This tensor is marked for deletion.</span>
          <button class="prop-mini-btn" onclick="restoreTensorDeletion('${jsStr(name)}')">Keep it</button>
        </div>` : ""}

      <div class="prop-group">
        <div class="prop-group-title">TENSOR</div>
        <div class="prop-row"><span class="prop-key">Name</span><span class="prop-val wrap mono">${escapeHtml(name)}</span></div>
        <div class="prop-row"><span class="prop-key">Shape</span><span class="prop-val mono">[${(result.shape || []).join(" × ")}]</span></div>
        <div class="prop-row"><span class="prop-key">Storage</span><span class="prop-val mono">${escapeHtml(result.quant_type || result.dtype || "—")}</span></div>
        ${result.dequantized ? `<div class="prop-row"><span class="prop-key">Read as</span><span class="prop-val mono ok">float32</span></div>` : ""}
        <div class="prop-row"><span class="prop-key">Params</span><span class="prop-val">${formatParams(result.param_count)}</span></div>
        <div class="prop-row"><span class="prop-key">Size</span><span class="prop-val">${formatBytes(result.byte_count)}</span></div>
      </div>

      <div class="prop-group">
        <div class="prop-group-title">STATISTICS</div>
        <div class="prop-row"><span class="prop-key">Mean</span><span class="prop-val mono">${sci(result.mean)}</span></div>
        <div class="prop-row"><span class="prop-key">Std</span><span class="prop-val mono">${sci(result.std)}</span></div>
        <div class="prop-row"><span class="prop-key">Min</span><span class="prop-val mono">${sci(result.min)}</span></div>
        <div class="prop-row"><span class="prop-key">Max</span><span class="prop-val mono">${sci(result.max)}</span></div>
        <div class="prop-row"><span class="prop-key">L2 norm</span><span class="prop-val mono">${sci(result.norm)}</span></div>
        <div class="prop-row"><span class="prop-key">Sparsity</span><span class="prop-val mono">${((result.sparsity || 0) * 100).toFixed(2)}%</span></div>
      </div>

      ${result.histogram ? `
      <div class="prop-group">
        <div class="prop-group-title">DISTRIBUTION</div>
        <canvas class="prop-histogram" id="prop-histogram" width="260" height="64"></canvas>
        <div class="prop-histogram-axis"><span>${sci(result.min)}</span><span>${sci(result.max)}</span></div>
        <div class="prop-row"><span class="prop-key">Skew</span><span class="prop-val mono">${num(result.skewness, 3)}</span></div>
        <div class="prop-row"><span class="prop-key">Kurtosis</span><span class="prop-val mono">${num(result.kurtosis, 3)}</span></div>
        ${result.sampled ? `<div class="prop-row"><span class="prop-key">Percentiles</span><span class="prop-val subtle">sampled (${formatParams(result.sample_size || 0)} values)</span></div>` : ""}
      </div>` : ""}

      ${Number.isFinite(result.p25) ? `
      <div class="prop-group">
        <div class="prop-group-title">PERCENTILES</div>
        <div class="prop-percentile-grid">
          ${[["P1", result.p1], ["P5", result.p5], ["P25", result.p25],
             ["P50", result.median], ["P75", result.p75], ["P95", result.p95],
             ["P99", result.p99]]
            .map(([k, v]) => `<div class="prop-pct"><span>${k}</span><b>${sci(v)}</b></div>`).join("")}
        </div>
        <div class="prop-percentile-chart"><canvas id="prop-percentile-canvas" width="260" height="56"></canvas></div>
      </div>` : ""}

      ${editable ? `
      <div class="prop-group prop-group-actions">
        <div class="prop-group-title">WEIGHT SURGERY</div>
        <div class="prop-note">Edit this tensor's weights directly. Changes are reversible and are written out when you export.</div>

        <div class="surgery-block">
          <label class="surgery-label">Modify values</label>
          <div class="surgery-row">
            <span class="surgery-tag">×</span>
            <input class="surgery-input" id="surgery-scale" type="number" step="0.05" value="0.5" />
            <button class="surgery-btn" onclick="applyTensorEdit('${jsStr(name)}','scale',{factor:readSurgeryNum('surgery-scale',0.5)})">Scale</button>
          </div>
          <div class="surgery-row">
            <span class="surgery-tag">+</span>
            <input class="surgery-input" id="surgery-shift" type="number" step="0.01" value="0" />
            <button class="surgery-btn" onclick="applyTensorEdit('${jsStr(name)}','shift',{value:readSurgeryNum('surgery-shift',0)})">Shift</button>
          </div>
          <div class="surgery-row">
            <span class="surgery-tag">σ</span>
            <input class="surgery-input" id="surgery-noise" type="number" step="0.005" min="0" value="0.02" />
            <button class="surgery-btn" onclick="applyTensorEdit('${jsStr(name)}','add_noise',{std:readSurgeryNum('surgery-noise',0.02),seed:1})">Add noise</button>
          </div>
          <div class="surgery-row">
            <span class="surgery-tag">%</span>
            <input class="surgery-input" id="surgery-prune" type="number" step="5" min="0" max="99" value="30" />
            <button class="surgery-btn" onclick="applyTensorEdit('${jsStr(name)}','prune',{fraction:readSurgeryNum('surgery-prune',30)/100})">Prune</button>
          </div>
        </div>

        <div class="surgery-block">
          <label class="surgery-label">Destructive</label>
          <div class="surgery-row surgery-row-tight">
            <button class="surgery-btn danger" onclick="applyTensorEdit('${jsStr(name)}','zero',{})">Zero out</button>
            <button class="surgery-btn danger" onclick="applyTensorEdit('${jsStr(name)}','randomize',{std:0.02,seed:7})">Re-initialise</button>
          </div>
          <div class="surgery-row surgery-row-tight">
            <button class="surgery-btn danger" onclick="deleteTensor('${jsStr(name)}')">Delete node</button>
            <button class="surgery-btn" onclick="restoreTensor('${jsStr(name)}')">Revert</button>
          </div>
        </div>

        <div class="surgery-row surgery-row-tight">
          <button class="surgery-btn primary" onclick="exportModelWithEdits()">Export changes…</button>
        </div>

        <div class="prop-note subtle">Delete removes the tensor from the exported model. Revert undoes every pending change. Export writes a trainable Safetensors file with your edits baked in.</div>
      </div>` : `
      <div class="prop-group">
        <div class="prop-group-title">WEIGHT SURGERY</div>
        <div class="prop-note subtle">This model's weights cannot be edited yet.</div>
      </div>`}
    `;

    // Decorative charts are drawn after the HTML lands.
    drawHistogram(result.histogram);
    drawPercentileCurve(result);

    // Keep the 3D viewport highlight in step with the selection.
    if (state.nn3d) {
      const node = state.nn3d.state.nodes.find((n) => n.name === name);
      if (node) state.nn3d.setSelected(node.id);
    }
  } catch (e) {
    propsBody.innerHTML = `
      <div class="prop-group">
        <div class="prop-group-title">Error</div>
        <div class="prop-note danger">${escapeHtml(e.message)}</div>
      </div>`;
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Tensor names go into inline handlers, so quotes must be escaped.
function jsStr(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function readSurgeryNum(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : fallback;
}

// ── Live histogram of the weight distribution ──
function drawHistogram(hist) {
  if (!hist || !Array.isArray(hist.counts)) return;
  const canvas = document.getElementById("prop-histogram");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const counts = hist.counts;
  const max = Math.max(...counts, 1);
  const bw = w / counts.length;

  counts.forEach((c, i) => {
    const bh = Math.max(1, (c / max) * (h - 4));
    // Colour by position so the ramp matches the 3D view's depth scale.
    const t = i / Math.max(counts.length - 1, 1);
    const r = Math.round(74 + (240 - 74) * t);
    const g = Math.round(120 + (194 - 120) * t);
    const b = Math.round(217 + (89 - 217) * t);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1), bh);
  });
}

// ── Percentile curve: makes the shape of the distribution legible at a glance ──
function drawPercentileCurve(result) {
  const canvas = document.getElementById("prop-percentile-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const pts = [
    [0, result.min], [1, result.p1], [5, result.p5], [25, result.p25],
    [50, result.median], [75, result.p75], [95, result.p95], [99, result.p99], [100, result.max],
  ].filter(([, v]) => Number.isFinite(v));
  if (pts.length < 2) return;

  const lo = Math.min(...pts.map((p) => p[1]));
  const hi = Math.max(...pts.map((p) => p[1]));
  const range = hi - lo || 1;
  const pad = 4;

  const xy = pts.map(([p, v]) => [
    (p / 100) * (w - pad * 2) + pad,
    h - pad - ((v - lo) / range) * (h - pad * 2),
  ]);

  // Zero line
  if (lo < 0 && hi > 0) {
    const y0 = h - pad - ((0 - lo) / range) * (h - pad * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y0);
    ctx.lineTo(w - pad, y0);
    ctx.stroke();
  }

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgb(74,120,217)");
  grad.addColorStop(0.5, "rgb(66,201,173)");
  grad.addColorStop(1, "rgb(240,194,89)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  xy.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.lineTo(xy[xy.length - 1][0], h - pad);
  ctx.lineTo(xy[0][0], h - pad);
  ctx.closePath();
  ctx.fill();
}

// ── Surgery actions ──
async function applyTensorEdit(name, op, params) {
  try {
    const res = await API.rpc("tensor_edit", { tensor_name: name, op, params });
    if (res.error) {
      toast(res.error, "error", 5000);
      log(`Edit failed: ${res.error}`, "error");
      return;
    }
    log(`${res.message}`, "success");
    toast(res.message, "success", 2500);
    state.tensorCapabilities = null;
    await refreshTensorCapabilities();
    await selectTensor(name);
    // Edits change the numbers, so any visible analysis is now stale.
    if (state.viewMode === "heatmap") renderHeatmap();
    // Surgery edits are unlearning targets in the 3D view.
    syncUnlearnMarks3D();
  } catch (e) {
    toast(`Edit failed: ${e.message}`, "error", 5000);
  }
}

async function deleteTensor(name) {
  try {
    const res = await API.rpc("tensor_delete", { tensor_name: name, deleted: true });
    if (res.error) { toast(res.error, "error", 5000); return; }
    log(res.message, "warning");
    toast(res.message, "warning", 3500);
    await selectTensor(name);
    syncUnlearnMarks3D();
  } catch (e) {
    toast(`Delete failed: ${e.message}`, "error", 5000);
  }
}

async function restoreTensorDeletion(name) {
  try {
    const res = await API.rpc("tensor_delete", { tensor_name: name, deleted: false });
    if (res.error) { toast(res.error, "error", 5000); return; }
    toast(res.message, "success", 2500);
    await selectTensor(name);
    syncUnlearnMarks3D();
  } catch (e) {
    toast(`Restore failed: ${e.message}`, "error", 5000);
  }
}

async function restoreTensor(name) {
  try {
    const res = await API.rpc("tensor_edit", { tensor_name: name, op: "restore" });
    if (res.error) { toast(res.error, "error", 5000); return; }
    toast("Changes reverted", "success", 2500);
    await selectTensor(name);
    syncUnlearnMarks3D();
  } catch (e) {
    toast(`Revert failed: ${e.message}`, "error", 5000);
  }
}

// Cache of what the loaded model supports, so the inspector does not need an
// extra round-trip on every click.
async function refreshTensorCapabilities() {
  if (state.tensorCapabilities) return state.tensorCapabilities;
  try {
    const info = await API.rpc("tensor_info");
    if (!info.error) state.tensorCapabilities = info;
  } catch (e) { /* leave null; the inspector degrades to read-only */ }
  return state.tensorCapabilities;
}

// ── Export with pending edits ──
async function exportModelWithEdits(presetPath, opts = {}) {
  const pending = await API.rpc("tensor_pending").catch(() => null);
  const edits = pending?.edit_count || 0;
  const del = pending?.delete_count || 0;
  if (!edits && !del && !opts.allowEmpty) {
    toast("No pending changes — nothing to export.", "info", 3000);
    return;
  }
  const path = presetPath || (await API.saveFile());
  if (!path) return;
  const dtype = opts.dtype === "float32" ? "float32" : "float16";
  log(edits || del
    ? `Exporting ${edits} edit(s), ${del} deletion(s) to ${path} (${dtype})…`
    : `Converting quantized model to Safetensors at ${path} (${dtype})…`, "info");
  toast(edits || del
    ? "Exporting model… this can take a minute."
    : "Converting to Safetensors… this can take a minute.", "info", 4000);
  try {
    const res = await API.rpc("tensor_export", { path, dtype, verify: opts.verify !== false });
    if (res.error) { toast(res.error, "error", 7000); log(`Export failed: ${res.error}`, "error"); return; }
    log(res.message, "success");
    const v = res.verification;
    if (v) {
      if (v.ok && !v.skipped) log(`Verified: ${v.tensor_count} tensors readable`, "success");
      else if (!v.ok) log(`VERIFY FAILED: ${v.error}`, "error");
    }
    const bytes = res.bytes || res.size_bytes || (v && v.size_bytes) || 0;
    toast(`Exported ${res.tensor_count} tensors (${formatBytes(bytes)}). Reload it to train further.`, "success", 8000, {
      action: "Copy path",
      onAction: () => copyToClipboard(path, "Copied export path"),
    });
    // The written file is now a real, loadable model: offer it as a next step.
    if (res.tensor_count) {
      rememberRecentModel(path, String(path).split(/[\\/]/).pop(), bytes);
    }
  } catch (e) {
    toast(`Export failed: ${e.message}`, "error", 7000);
  }
}

// ══════════════════════════════════════════
// UNLEARN PANEL
// ══════════════════════════════════════════

function initUnlearnPanel() {
  const stepsSlider = document.getElementById("unlearn-steps");
  const stepsVal = document.getElementById("unlearn-steps-val");
  stepsSlider?.addEventListener("input", () => (stepsVal.textContent = stepsSlider.value));

  const lrSlider = document.getElementById("unlearn-lr");
  const lrVal = document.getElementById("unlearn-lr-val");
  lrSlider?.addEventListener("input", () => (lrVal.textContent = `1e${lrSlider.value}`));

  const retainSlider = document.getElementById("unlearn-retain");
  const retainVal = document.getElementById("unlearn-retain-val");
  retainSlider?.addEventListener("input", () => (retainVal.textContent = retainSlider.value));

  // "Reset View" clears the canvas back to its idle state; live runs redraw
  // from the next progress event onwards.
  document.getElementById("btn-unlearn-reset")?.addEventListener("click", () => {
    renderUnlearnCanvas(null);
    log("Unlearn view reset", "info");
  });

  // Settings → Default method seeds this select, and it stays the authority
  // for a run (applySetting pushes the preference in, the change here pushes
  // the user's choice back out).
  const methodSel = document.getElementById("unlearn-method");
  if (methodSel) {
    if (state.settings.defaultMethod) methodSel.value = state.settings.defaultMethod;
    methodSel.addEventListener("change", () => {
      state.unlearnMethod = methodSel.value;
    });
  }

  const batchSlider = document.getElementById("unlearn-batch");
  const batchVal = document.getElementById("unlearn-batch-val");
  batchSlider?.addEventListener("input", () => (batchVal.textContent = batchSlider.value));

  document.getElementById("btn-start-unlearn")?.addEventListener("click", startUnlearn);
}

function updateUnlearnButton() {
  const btn = document.getElementById("btn-start-unlearn");
  if (btn) btn.disabled = !state.model || !state.backendReady;
  updateUnlearnModeNote();
}

// A quantized GGUF has no autograd graph, so "training" it is not possible.
// The backend performs exact weight surgery instead. Say so up front rather
// than letting the step-count / learning-rate controls imply a training run
// that can never happen.
function updateUnlearnModeNote() {
  const note = document.getElementById("unlearn-quant-note");
  if (!note) return;
  const quantized = !!state.modelSummary?.quantized;
  if (!quantized) { note.classList.add("hidden"); note.textContent = ""; return; }
  const quant = state.modelSummary?.quantization ? String(state.modelSummary.quantization).toUpperCase() : "quantized";
  note.textContent = `This model is ${quant} (GGUF), so unlearning runs as precise weight surgery on the targeted nodes instead of gradient training — steps and learning rate do not apply. Review the changed nodes in Properties, then export to Safetensors to fine-tune the result.`;
  note.classList.remove("hidden");
}

async function startUnlearn() {
  if (!state.model || !state.backendReady) return;
  const target = document.getElementById("unlearn-target")?.value;
  if (!target) { log("Select a target capability first", "error"); return; }

  const config = {
    target,
    method: document.getElementById("unlearn-method")?.value,
    num_steps: parseInt(document.getElementById("unlearn-steps")?.value || "200"),
    learning_rate: Math.pow(10, parseFloat(document.getElementById("unlearn-lr")?.value || "-5")),
    retain_weight: parseFloat(document.getElementById("unlearn-retain")?.value || "2.0"),
  };

  log(`Starting unlearning: target=${target}, method=${config.method}, steps=${config.num_steps}`, "info");
  try {
    const result = await API.rpc("unlearn_start", { config });
    if (result.error) { log(`Error: ${result.error}`, "error"); return; }
    state.currentJobId = result.job_id;
    log(`Job started: ${result.job_id}`, "success");
    document.getElementById("btn-start-unlearn").disabled = true;
    document.getElementById("btn-start-unlearn").innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor"/></svg>Running...`;
    startUnlearnPoll();
  } catch (e) { log(`Error: ${e.message}`, "error"); }
}

function stopUnlearn() {
  if (state.currentJobId) {
    clearInterval(state.unlearnPollTimer);
    state.currentJobId = null;
    document.getElementById("btn-start-unlearn").disabled = false;
    document.getElementById("btn-start-unlearn").innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 2.5l8 4.5-8 4.5V2.5z" fill="currentColor"/></svg>Start Unlearning`;
    log("Unlearning stopped", "warning");
  }
}

function startUnlearnPoll() {
  if (state.unlearnPollTimer) clearInterval(state.unlearnPollTimer);
  state.unlearnPollTimer = setInterval(async () => {
    if (!state.currentJobId) { clearInterval(state.unlearnPollTimer); return; }
    try {
      const result = await API.rpc("unlearn_progress", { job_id: state.currentJobId });
      if (!result.error) handleUnlearnProgress(result);
    } catch (e) {}
  }, 200);
}

function handleUnlearnProgress(data) {
  renderUnlearnCanvas(data);
  if (data.status === "completed" || data.status === "failed") {
    clearInterval(state.unlearnPollTimer);
    state.currentJobId = null;
    const btn = document.getElementById("btn-start-unlearn");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 2.5l8 4.5-8 4.5V2.5z" fill="currentColor"/></svg>Start Unlearning`;
    }

    if (data.status === "completed") {
      // Two very different backends report success here: a torch run reports
      // steps + nodes_erased, while a quantized model is edited by weight
      // surgery and reports the tensors it modified. Report whichever we got
      // instead of printing "undefined".
      const modified = Array.isArray(data.tensors_modified)
        ? data.tensors_modified.length
        : (data.tensor_count ?? data.nodes_erased ?? 0);
      const elapsed = Number.isFinite(data.elapsed) ? ` in ${data.elapsed}s` : "";
      log(`Unlearning complete${elapsed} — ${modified} node(s) modified`, "success");
      if (Array.isArray(data.tensors_modified) && data.tensors_modified.length) {
        const shown = data.tensors_modified.slice(0, 6).join(", ");
        const extra = data.tensors_modified.length > 6 ? ` (+${data.tensors_modified.length - 6} more)` : "";
        log(`Nodes: ${shown}${extra}`, "info");
      }
      if (data.message) log(data.message, "info");
      if (Array.isArray(data.failures) && data.failures.length) {
        log(`Incomplete: ${data.failures.join("; ")}`, "warning");
      }
      toast(`Unlearning done — ${modified} node(s) modified. Review in Properties, then export.`, "success", 7000);

      // The weights just changed, so every cached view of them is stale.
      state.tensorCapabilities = null;
      refreshTensorCapabilities().then(() => {
        if (state.selectedTensor) selectTensor(state.selectedTensor);
      });
      if (state.model) updateModelTree();
      if (state.viewMode === "3d" || state.viewMode === "2d") renderModelCanvas();
      // The erased nodes are the unlearning targets — show them in 3D.
      syncUnlearnMarks3D();
    } else {
      log(`Unlearning failed: ${data.error || "unknown"}`, "error");
    }
  }
}

function renderUnlearnCanvas(progressData) {
  const canvas = document.getElementById("unlearn-canvas");
  if (!canvas) return;
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  if (!progressData) {
    ctx.fillStyle = "rgba(115, 115, 115, 0.4)";
    ctx.font = '13px "SF Pro Display", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Configure and start unlearning to see real-time visualization", W / 2, H / 2 - 10);
    ctx.font = '11px "SF Mono", monospace';
    ctx.fillStyle = "rgba(115, 115, 115, 0.3)";
    ctx.fillText("Loss curves, weight changes, and node erasure will appear here", W / 2, H / 2 + 15);
    return;
  }

  // Quantized models are unlearned by weight surgery, not gradient descent, so
  // the payload carries the tensors that changed instead of a loss curve. Draw
  // the real result rather than an empty training chart.
  if (Array.isArray(progressData.tensors_modified)) {
    drawSurgeryResult(ctx, W, H, progressData);
    return;
  }

  const { phase, progress, metrics, current_step, total_steps, nodes_erased, total_nodes } = progressData;
  const chartW = W * 0.55, chartH = H - 40, chartX = 20, chartY = 30;

  if (metrics && metrics.total_loss && metrics.total_loss.length > 1) {
    const losses = metrics.total_loss;
    const forgetLosses = metrics.forget_loss || [];
    const retainLosses = metrics.retain_loss || [];

    ctx.strokeStyle = "rgba(82, 82, 82, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY); ctx.lineTo(chartX, chartY + chartH); ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    const allVals = [...losses, ...forgetLosses, ...retainLosses];
    let minVal = Math.min(...allVals), maxVal = Math.max(...allVals);
    if (maxVal - minVal < 1e-10) { minVal -= 1; maxVal += 1; }

    const drawLine = (data, color) => {
      if (data.length < 2) return;
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      data.forEach((val, i) => {
        const x = chartX + (i / (data.length - 1)) * chartW;
        const y = chartY + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine(losses, "rgba(229, 229, 229, 0.8)");
    drawLine(forgetLosses, "rgba(239, 68, 68, 0.6)");
    drawLine(retainLosses, "rgba(34, 197, 94, 0.6)");

    ctx.font = '10px "SF Mono", monospace'; ctx.textAlign = "left";
    ctx.fillStyle = "rgba(229, 229, 229, 0.6)"; ctx.fillText("● Total Loss", chartX, chartY - 5);
    ctx.fillStyle = "rgba(239, 68, 68, 0.6)"; ctx.fillText("● Forget Loss", chartX + 90, chartY - 5);
    ctx.fillStyle = "rgba(34, 197, 94, 0.6)"; ctx.fillText("● Retain Loss", chartX + 200, chartY - 5);
  }

  const rightX = W * 0.6, statY = chartY + 20, statSpacing = 28;
  ctx.fillStyle = "rgba(115, 115, 115, 0.5)"; ctx.font = '10px "SF Mono", monospace'; ctx.textAlign = "left";
  ctx.fillText("STATUS", rightX, statY);
  ctx.fillStyle = phase === "done" ? "rgba(34, 197, 94, 0.9)" : "rgba(229, 229, 229, 0.8)";
  ctx.font = 'bold 14px "SF Pro Display", sans-serif';
  ctx.fillText(phase.toUpperCase(), rightX, statY + 18);

  ctx.fillStyle = "rgba(115, 115, 115, 0.5)"; ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("PROGRESS", rightX, statY + statSpacing + 20);
  const barX = rightX, barY = statY + statSpacing + 28, barW = W - rightX - 20, barH = 6;
  ctx.fillStyle = "rgba(38, 38, 38, 1)"; ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(229, 229, 229, 0.8)"; ctx.fillRect(barX, barY, barW * (progress / 100), barH);
  ctx.fillStyle = "rgba(229, 229, 229, 0.6)"; ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(`${Math.round(progress)}%`, rightX, barY + barH + 18);

  ctx.fillStyle = "rgba(115, 115, 115, 0.5)"; ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("STEP", rightX, barY + barH + 42);
  ctx.fillStyle = "rgba(229, 229, 229, 0.7)"; ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(`${current_step || 0} / ${total_steps || 0}`, rightX, barY + barH + 58);

  ctx.fillStyle = "rgba(115, 115, 115, 0.5)"; ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("NODES ERASED", rightX, barY + barH + 82);
  ctx.fillStyle = "rgba(239, 68, 68, 0.7)"; ctx.font = 'bold 14px "SF Pro Display", sans-serif';
  ctx.fillText(`${nodes_erased || 0} / ${total_nodes || 0}`, rightX, barY + barH + 100);
}

// ── Weight-surgery result view ──
// Shown for quantized models, where "unlearning" is a precise surgical edit of
// the chosen tensors rather than a training loop. It lists exactly which nodes
// changed, which is the only thing that matters to the user afterwards.
function drawSurgeryResult(ctx, W, H, data) {
  const pad = 22;
  const ok = data.status === "completed";
  const tensors = Array.isArray(data.tensors_modified) ? data.tensors_modified : [];
  const method = data.method || "weight surgery";

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(115, 115, 115, 0.55)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("METHOD", pad, pad + 10);
  ctx.fillStyle = "rgba(229, 229, 229, 0.9)";
  ctx.font = 'bold 15px "SF Pro Display", sans-serif';
  ctx.fillText(method, pad, pad + 30);

  ctx.fillStyle = "rgba(115, 115, 115, 0.55)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("RESULT", pad, pad + 58);
  ctx.fillStyle = ok ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)";
  ctx.font = 'bold 13px "SF Pro Display", sans-serif';
  ctx.fillText(ok ? `COMPLETED — ${tensors.length} NODE${tensors.length === 1 ? "" : "S"} MODIFIED` : "FAILED", pad, pad + 76);

  // Progress bar, full when the surgery committed.
  const barY = pad + 92, barW = Math.min(320, W - pad * 2);
  ctx.fillStyle = "rgba(38, 38, 38, 1)";
  ctx.fillRect(pad, barY, barW, 6);
  ctx.fillStyle = ok ? "rgba(34, 197, 94, 0.75)" : "rgba(239, 68, 68, 0.75)";
  ctx.fillRect(pad, barY, barW * Math.min(1, (data.progress ?? (ok ? 100 : 0)) / 100), 6);

  // The node list — one column, monospaced, clipped to the panel.
  let y = barY + 34;
  ctx.fillStyle = "rgba(115, 115, 115, 0.55)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("MODIFIED NODES", pad, y - 10);
  ctx.font = '11px "SF Mono", monospace';
  const maxRows = Math.max(1, Math.floor((H - y - 14) / 16));
  tensors.slice(0, maxRows).forEach((name) => {
    ctx.fillStyle = "rgba(229, 229, 229, 0.75)";
    ctx.fillText(String(name).slice(0, 64), pad, y + 8);
    y += 16;
  });
  if (tensors.length > maxRows) {
    ctx.fillStyle = "rgba(115, 115, 115, 0.6)";
    ctx.fillText(`+ ${tensors.length - maxRows} more…`, pad, y + 8);
  }

  if (data.message) {
    ctx.fillStyle = "rgba(115, 115, 115, 0.6)";
    ctx.font = '11px "SF Pro Display", sans-serif';
    const msg = String(data.message).slice(0, 140);
    ctx.fillText(msg, pad, H - 14);
  }
}

// ══════════════════════════════════════════
// CANVAS INTERACTIONS (with smooth hover effects)
// ══════════════════════════════════════════

let _hoverRaf = 0;
let _hoverPending = false;
let _hoverData = null;

function initCanvasInteractions() {
  const canvas = document.getElementById("model-canvas");
  if (!canvas) return;

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    _hoverData = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      btn: e.buttons,
    };
    if (state.model) {
      _hoverPending = true;
      if (!_hoverRaf) {
        _hoverRaf = requestAnimationFrame(() => {
          _hoverRaf = 0;
          if (_hoverPending) {
            _hoverPending = false;
            renderModelCanvas();
          }
        });
      }
    }
  });

  canvas.addEventListener("mouseleave", () => {
    _hoverData = null;
    if (state.model) requestModelCanvasRender();
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    state.zoom = Math.max(0.3, Math.min(3, state.zoom * delta));
    updateZoom();
  }, { passive: false });

  // Smooth pan with middle mouse or space+drag
  let isPanning = false;
  let panStart = null;
  let panOffsetStart = null;

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      panOffsetStart = { ...state.pan };
      canvas.style.cursor = "grabbing";
      e.preventDefault();
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning || !panStart) return;
    state.pan.x = panOffsetStart.x + (e.clientX - panStart.x);
    state.pan.y = panOffsetStart.y + (e.clientY - panStart.y);
    if (state.model) requestModelCanvasRender();
  });

  window.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = "grab";
      panStart = null;
    }
  });
}

// ══════════════════════════════════════════
// UI UPDATES
// ══════════════════════════════════════════

function updateBreadcrumb() {
  // Breadcrumb is rendered via the status bar model name
  // No separate breadcrumb element needed
}

function updateStatusBar() {
  document.getElementById("status-model").textContent = state.model?.name || "No model";
  const s = state.modelSummary;
  document.getElementById("status-params").textContent = s ? `${s.format_params} params` : "—";
  document.getElementById("status-format").textContent = state.model?.metadata?.format?.toUpperCase() || "—";

  // Surface the quantized/degraded reality in the status bar — the model IS
  // visualized, it just isn't trainable, and users deserve to see that.
  const quantEl = document.getElementById("status-quant");
  if (quantEl) {
    const quant = s?.quantization;
    if (quant && s?.quantized) {
      quantEl.textContent = String(quant).toUpperCase();
      quantEl.classList.remove("hidden");
    } else {
      quantEl.classList.add("hidden");
    }
  }

  const viewEl = document.getElementById("status-view");
  if (viewEl) {
    viewEl.textContent = state.viewMode === "3d" ? "3D" : "2D";
    viewEl.classList.toggle("is-3d", state.viewMode === "3d");
  }
}

function updateModelTree() {
  const container = document.getElementById("model-tree");
  if (!state.model) return;
  const meta = state.model.metadata;
  const groups = {};
  state.tensors.forEach((t) => {
    const parts = t.name.split(".");
    const group = parts.length > 1 ? parts[0] : "root";
    if (!groups[group]) groups[group] = [];
    groups[group].push(t);
  });

  let html = `
    <div class="tree-node selected"><span class="tree-node-icon">📦</span><span class="tree-node-label">${state.model.name}</span></div>
    <div class="tree-node tree-indent"><span class="tree-node-icon">◇</span><span class="tree-node-label">Format: ${meta.format}</span></div>
    <div class="tree-node tree-indent"><span class="tree-node-icon">◇</span><span class="tree-node-label">Size: ${formatBytes(meta.size_bytes)}</span></div>
  `;

  for (const [group, tensors] of Object.entries(groups)) {
    const totalParams = tensors.reduce((s, t) => s + t.param_count, 0);
    const groupKey = encodeURIComponent(group);
    const collapsed = state.collapsedTreeGroups.has(group);
    const shown = collapsed ? 0 : (state.expandedTreeGroups.has(group) ? tensors.length : Math.min(tensors.length, 20));

    html += `<div class="tree-node tree-indent tree-group" data-group="${groupKey}" onclick="toggleTreeGroup('${groupKey}')">` +
      `<span class="tree-node-chevron${collapsed ? " collapsed" : ""}">▾</span>` +
      `<span class="tree-node-icon">📁</span>` +
      `<span class="tree-node-label">${group}</span>` +
      `<span class="tree-node-meta">${tensors.length} · ${formatParams(totalParams)}</span></div>`;

    tensors.slice(0, shown).forEach((tensor) => {
      const shortName = tensor.name.replace(group + ".", "");
      const selected = state.selectedTensor === tensor.name ? " selected" : "";
      html += `<div class="tree-node tree-indent-2${selected}" data-tensor="${tensor.name}" onclick="event.stopPropagation();selectTensor('${tensor.name}')"><span class="tree-node-icon">◇</span><span class="tree-node-label">${shortName}</span><span class="tree-node-meta">${formatBytes(tensor.byte_count)}</span></div>`;
    });

    // The "more" affordance must actually work — clicking it reveals the rest
    // (and "show less" collapses back). It used to be inert text. A fully
    // collapsed group shows no rows at all, so it gets no "more" row either.
    const hidden = collapsed ? 0 : tensors.length - shown;
    if (hidden > 0) {
      html += `<div class="tree-node tree-indent-2 tree-more" data-group="${groupKey}" title="Reveal all ${tensors.length} tensors in ${group}" onclick="event.stopPropagation();expandTreeGroup('${groupKey}')">` +
        `<span class="tree-node-icon">＋</span>` +
        `<span class="tree-node-label">${hidden} more</span>` +
        `<span class="tree-more-badge">show all ${tensors.length}</span>` +
        `</div>`;
    } else if (tensors.length > 20 && state.expandedTreeGroups.has(group)) {
      html += `<div class="tree-node tree-indent-2 tree-more" onclick="event.stopPropagation();collapseTreeGroup('${groupKey}')">` +
        `<span class="tree-node-label">Show less</span></div>`;
    }
  }
  container.innerHTML = html;

  const countEl = document.getElementById("tree-tensor-count");
  if (countEl) countEl.textContent = `${state.tensors.length} tensors`;
}

// ── Model-tree expand / collapse ──
// A 291-tensor GGUF must be fully browsable: previously only the first 20
// tensors per group were listed and the "+N more" row did nothing at all.
function expandTreeGroup(groupKey) {
  state.expandedTreeGroups?.delete?.(groupKey);
  state.expandedTreeGroups.add(groupKey);
  // Revealing a group must also lift the collapsed flag, otherwise clicking
  // "+N more" on a collapsed group would appear to do nothing.
  state.collapsedTreeGroups?.delete?.(groupKey);
  updateModelTree();
  // Scroll the newly revealed rows into view so the click feels responsive.
  requestAnimationFrame(() => {
    const el = document.querySelector(`.tree-more[data-group="${groupKey}"]`);
    el?.scrollIntoView({ block: "nearest" });
  });
}

function collapseTreeGroup(groupKey) {
  state.expandedTreeGroups.delete(groupKey);
  updateModelTree();
}

function toggleTreeGroup(groupKey) {
  if (state.collapsedTreeGroups.has(groupKey)) state.collapsedTreeGroups.delete(groupKey);
  else state.collapsedTreeGroups.add(groupKey);
  updateModelTree();
}

function populateLayerSelect(select, tensorCounts) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select a layer...</option>';
  state.layers.forEach((layer) => {
    const opt = document.createElement("option");
    opt.value = layer.name;
    const count = tensorCounts ? tensorCounts[layer.name] : null;
    opt.textContent = count != null
      ? `${layer.name} · ${count} tensor${count === 1 ? "" : "s"} · ${formatParams(layer.total_params)}`
      : `${layer.name} (${formatParams(layer.total_params)})`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

function populateTensorSelect(select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select a tensor...</option>';
  state.tensors.forEach((tensor) => {
    const opt = document.createElement("option");
    opt.value = tensor.name;
    opt.textContent = `${tensor.name} [${tensor.shape.join("×")}]`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

// ══════════════════════════════════════════
// TERMINAL LOGGING
// ══════════════════════════════════════════

function log(message, type = "") {
  const terminal = document.getElementById("terminal-output");
  if (!terminal) return;
  const line = document.createElement("div");
  line.className = "terminal-line";
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  line.innerHTML = `<span class="terminal-prompt">❯</span> <span style="color:var(--text-subtle);font-size:10px;margin-right:4px">${time}</span><span class="terminal-text ${type}">${message}</span>`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

// The terminal pane keeps its own scrollback: typed commands and their direct
// results. log() keeps the application-wide stream in the OUTPUT pane; both
// panes sit side by side in the bottom dock.
function termLog(message, type = "") {
  const el = document.getElementById("terminal-log");
  if (!el) return;
  const line = document.createElement("div");
  line.className = "terminal-line";
  line.innerHTML = `<span class="terminal-text ${type}">${escapeHtml(String(message))}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ══════════════════════════════════════════
// PLATFORM
// ══════════════════════════════════════════

async function loadPlatform() {
  const platform = await API.getPlatform();
  const labels = { darwin: "macOS", win32: "Windows", linux: "Linux" };
  state.platform = platform;
  state.platformName = labels[platform] || platform;
  if (!state.backendReady) document.getElementById("status-platform").textContent = state.platformName;
  // Fill in the About + Settings version strings from the real build, not a
  // hardcoded literal that silently drifts from package.json.
  try {
    const v = await API.getAppVersion();
    state.appVersion = v;
    document.querySelectorAll(".about-version, [data-app-version]").forEach((el) => { el.textContent = `v${v}`; });
  } catch (e) { /* version is cosmetic */ }
}

// ══════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════

function formatParams(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ══════════════════════════════════════════
// CHATBOT
// ══════════════════════════════════════════

function initChatbot() {
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  if (!input || !sendBtn) return;

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addChatMessage(text, "user");
    sendBtn.disabled = true;
    const response = await processChatMessage(text);
    addChatMessage(response, "assistant");
    sendBtn.disabled = false;
    input.focus();
  };

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function addChatMessage(text, role) {
  const messages = document.getElementById("chatbot-messages");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function processChatMessage(text) {
  const lower = text.toLowerCase();
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("describe") || lower.includes("tell me about")) {
    if (!state.model) return "No model loaded yet. Click **Open Model** to load a file.";
    const s = state.modelSummary;
    return `<b>Model: ${state.model.name}</b><br><br>• <b>Format:</b> ${state.model.metadata.format}<br>• <b>Parameters:</b> ${s.format_params}<br>• <b>Tensors:</b> ${s.tensor_count}<br>• <b>Size:</b> ${s.total_mb} MB<br>• <b>Dtypes:</b> ${Object.keys(s.dtype_distribution).join(", ")}<br>• <b>Trainable layers:</b> ${s.trainable_count}`;
  }
  if (lower.includes("layer") && (lower.includes("list") || lower.includes("show") || lower.includes("which"))) {
    if (state.layers.length === 0) return "No model loaded.";
    return `<b>Top layers:</b><br><br>${state.layers.slice(0, 8).map(l => `  ${l.name} — ${formatParams(l.total_params)} params`).join("<br>")}`;
  }
  if (lower.includes("redundan") || lower.includes("dead")) {
    if (!state.model) return "Load a model first.";
    return `<b>Redundancy Analysis:</b><br><br>• ${state.tensors.length} total tensors<br>• Run unlearning with <b>Retain-Aware</b> to identify dead neurons.<br><br>Switch to the <b>Unlearn</b> tab to begin.`;
  }
  if (lower.includes("unlearn") || lower.includes("forget") || lower.includes("erase")) {
    if (!state.model) return "Load a model first, then go to the <b>Unlearn</b> tab.";
    return `<b>Ready to unlearn!</b><br><br>Go to the <b>Unlearn</b> tab:<br>1. Select a <b>target capability</b><br>2. Choose <b>Retain-Aware</b> method<br>3. Set training steps<br>4. Click <b>Start Unlearning</b>`;
  }
  if (lower.includes("method") || lower.includes("which method")) {
    return `<b>Methods:</b><br><br>• <b>Retain-Aware</b> — Forgets target while preserving knowledge<br>• <b>Gradient Forgetting</b> — Simple baseline, may cause collateral damage<br>• <b>Knowledge Distillation</b> — Uses teacher-student framework<br><br>Retain-Aware is almost always best.`;
  }
  if (lower.includes("hello") || lower.includes("hi")) return `Hey! 👋 Load a model and ask me anything about it.`;
  if (lower.includes("help")) return `<b>Commands:</b><br><br>• "Tell me about the model"<br>• "List layers"<br>• "Analyze redundancy"<br>• "Which method should I use?"<br>• "Start unlearning"<br>• "Export model"`;
  if (lower.includes("export") || lower.includes("save")) {
    if (!state.model) return "Load and modify a model first.";
    return `Export via <b>File → Export</b> or <b>⌘E</b>. Supports Safetensors, PyTorch, GGUF, and ONNX.`;
  }
  return `I can help with model analysis and unlearning. Try:<br><br>• "Tell me about the model"<br>• "Which method should I use?"<br>• "Start unlearning"<br>• "Help" for all commands`;
}

// ══════════════════════════════════════════
// RESOURCE MONITOR
// ══════════════════════════════════════════

// ── Live resource monitor ──
// Real CPU load comes from the main process, which differences os.cpus()
// cumulative tick counters between samples. The previous implementation
// derived "cpuPct" from cpuSpeed — a constant clock frequency — so it showed
// the same fabricated number forever. RAM used = total - free, exactly what
// Activity Monitor reports.
let _cpuHistory = [];

function initResourceMonitor() {
  const GB = 1024 * 1024 * 1024;

  const paint = (cpuPct, ramUsedBytes, ramTotalBytes) => {
    const cpuBar = document.getElementById("cpu-bar");
    const cpuVal = document.getElementById("cpu-val");
    const ramBar = document.getElementById("ram-bar");
    const ramVal = document.getElementById("ram-val");

    if (cpuBar && cpuPct !== null && cpuPct !== undefined) {
      cpuBar.style.width = `${cpuPct}%`;
      cpuBar.className = `resource-bar-fill${cpuPct > 85 ? " high" : cpuPct > 60 ? " mid" : ""}`;
    }
    if (cpuVal) cpuVal.textContent = (cpuPct === null || cpuPct === undefined) ? "—" : `${cpuPct}%`;

    if (ramTotalBytes > 0) {
      const ramPct = Math.round((ramUsedBytes / ramTotalBytes) * 100);
      if (ramBar) {
        ramBar.style.width = `${ramPct}%`;
        ramBar.className = `resource-bar-fill${ramPct > 85 ? " high" : ramPct > 60 ? " mid" : ""}`;
      }
      if (ramVal) {
        ramVal.textContent = `${(ramUsedBytes / GB).toFixed(1)} / ${(ramTotalBytes / GB).toFixed(0)} GB`;
      }
    }
  };

  const tick = async () => {
    try {
      let cpuPct = null;
      let ramUsed = null;
      let ramTotal = null;

      // The Python backend can also report device/GPU load, but it is a
      // separate process and may be mid-load; the main process is the
      // reliable source for CPU/RAM.
      const hw = await API.getHardwareInfo();
      if (!hw) return;
      state.hardware = hw;

      if (typeof hw.cpuUsagePercent === "number") cpuPct = Math.round(hw.cpuUsagePercent);
      ramUsed = hw.ramUsedBytes ?? ((hw.totalRAM - hw.freeRAM) * GB);
      ramTotal = hw.totalRAMBytes ?? (hw.totalRAM * GB);

      if (cpuPct !== null) {
        _cpuHistory.push(cpuPct);
        if (_cpuHistory.length > 40) _cpuHistory.shift();
      }

      paint(cpuPct, ramUsed, ramTotal);

      const dev = document.getElementById("status-device");
      if (dev) dev.textContent = `${hw.platformName} · ${hw.cpuCount} cores`;
      const ramEl = document.getElementById("status-ram");
      if (ramEl && ramTotal > 0) {
        ramEl.textContent = `${(ramUsed / GB).toFixed(1)} / ${(ramTotal / GB).toFixed(0)} GB`;
      }
    } catch (e) {
      // Monitoring must never break the UI.
    }
  };

  // Prime the CPU baseline (first call returns null), then poll fast enough to
  // look like a live gauge.
  tick();
  setInterval(tick, 1500);
}

// ── Window resize ──
// PERF: debounced (150ms) instead of firing full canvas rebuilds continuously
// while the window is being dragged.
let _resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (state.model) {
      requestModelCanvasRender();
      if (document.getElementById("panel-heatmap")?.classList.contains("active")) renderHeatmap();
    }
    renderUnlearnCanvas();
  }, 150);
});

// ══════════════════════════════════════════
// MODEL CATALOG + DOWNLOADS
// ══════════════════════════════════════════

const MODEL_CATALOG = [
  { name: "Qwen2.5-Coder 0.5B", source: "ollama", family: "qwen2.5-coder", params: 0.5, paramsShort: "0.5B", sizeBytes: 400000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-0.5b-q4_k_m.gguf", tags: ["code", "small", "fast"], minRam: 1 },
  { name: "Qwen2.5-Coder 1.5B", source: "ollama", family: "qwen2.5-coder", params: 1.5, paramsShort: "1.5B", sizeBytes: 900000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-1.5b-q4_k_m.gguf", tags: ["code", "small"], minRam: 2 },
  { name: "Qwen2.5-Coder 3B", source: "ollama", family: "qwen2.5-coder", params: 3, paramsShort: "3B", sizeBytes: 1800000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-3b-q4_k_m.gguf", tags: ["code", "balanced"], minRam: 3 },
  { name: "Qwen2.5-Coder 7B", source: "ollama", family: "qwen2.5-coder", params: 7, paramsShort: "7B", sizeBytes: 4200000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-7b-q4_k_m.gguf", tags: ["code", "powerful"], minRam: 6 },
  { name: "Qwen2.5-Coder 14B", source: "ollama", family: "qwen2.5-coder", params: 14, paramsShort: "14B", sizeBytes: 8400000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct-GGUF/resolve/main/qwen2.5-coder-14b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-14b-q4_k_m.gguf", tags: ["code", "large"], minRam: 10 },
  { name: "Qwen2.5-Coder 32B", source: "ollama", family: "qwen2.5-coder", params: 32, paramsShort: "32B", sizeBytes: 19000000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q4_k_m.gguf", filename: "qwen2.5-coder-32b-q4_k_m.gguf", tags: ["code", "xl"], minRam: 22 },
  { name: "Llama 3.2 1B", source: "ollama", family: "llama", params: 1, paramsShort: "1B", sizeBytes: 700000000, format: "gguf", quant: "Q4_K_M", license: "Llama-3.2", url: "https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf", filename: "llama-3.2-1b-q4_k_m.gguf", tags: ["general", "small"], minRam: 1 },
  { name: "Llama 3.2 3B", source: "ollama", family: "llama", params: 3, paramsShort: "3B", sizeBytes: 2000000000, format: "gguf", quant: "Q4_K_M", license: "Llama-3.2", url: "https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf", filename: "llama-3.2-3b-q4_k_m.gguf", tags: ["general", "balanced"], minRam: 3 },
  { name: "Llama 3.1 8B", source: "ollama", family: "llama", params: 8, paramsShort: "8B", sizeBytes: 4700000000, format: "gguf", quant: "Q4_K_M", license: "Llama-3.1", url: "https://huggingface.co/unsloth/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf", filename: "llama-3.1-8b-q4_k_m.gguf", tags: ["general", "popular"], minRam: 6 },
  { name: "Llama 3.1 70B", source: "ollama", family: "llama", params: 70, paramsShort: "70B", sizeBytes: 40000000000, format: "gguf", quant: "Q4_K_M", license: "Llama-3.1", url: "https://huggingface.co/unsloth/Meta-Llama-3.1-70B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-70B-Instruct-Q4_K_M.gguf", filename: "llama-3.1-70b-q4_k_m.gguf", tags: ["general", "xl"], minRam: 44 },
  { name: "Mistral 7B v0.3", source: "ollama", family: "mistral", params: 7, paramsShort: "7B", sizeBytes: 4100000000, format: "gguf", quant: "Q4_K_M", license: "Apache-2.0", url: "https://huggingface.co/unsloth/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf", filename: "mistral-7b-v0.3-q4_k_m.gguf", tags: ["general", "popular"], minRam: 6 },
  { name: "Phi-3.5 Mini 3.8B", source: "ollama", family: "phi", params: 3.8, paramsShort: "3.8B", sizeBytes: 2200000000, format: "gguf", quant: "Q4_K_M", license: "MIT", url: "https://huggingface.co/unsloth/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf", filename: "phi-3.5-mini-q4_k_m.gguf", tags: ["small", "efficient"], minRam: 3 },
  { name: "Gemma 2 2B", source: "ollama", family: "gemma", params: 2, paramsShort: "2B", sizeBytes: 1500000000, format: "gguf", quant: "Q4_K_M", license: "Gemma", url: "https://huggingface.co/unsloth/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf", filename: "gemma-2-2b-q4_k_m.gguf", tags: ["small", "google"], minRam: 2 },
  { name: "Gemma 2 9B", source: "ollama", family: "gemma", params: 9, paramsShort: "9B", sizeBytes: 5400000000, format: "gguf", quant: "Q4_K_M", license: "Gemma", url: "https://huggingface.co/unsloth/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf", filename: "gemma-2-9b-q4_k_m.gguf", tags: ["balanced", "google"], minRam: 7 },
  { name: "DeepSeek Coder V2 Lite 16B", source: "hf", family: "deepseek-coder", params: 16, paramsShort: "16B", sizeBytes: 9000000000, format: "gguf", quant: "Q4_K_M", license: "MIT", url: "https://huggingface.co/unsloth/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf", filename: "deepseek-coder-v2-lite-q4_k_m.gguf", tags: ["code", "mixture"], minRam: 12 },
  { name: "CodeGemma 2 9B", source: "hf", family: "gemma", params: 9, paramsShort: "9B", sizeBytes: 5600000000, format: "gguf", quant: "Q4_K_M", license: "Gemma", url: "https://huggingface.co/unsloth/codegemma-2-9b-it-GGUF/resolve/main/codegemma-2-9b-it-Q4_K_M.gguf", filename: "codegemma-2-9b-q4_k_m.gguf", tags: ["code", "google"], minRam: 7 },
  { name: "StarCoder2 3B", source: "hf", family: "starcoder2", params: 3, paramsShort: "3B", sizeBytes: 1800000000, format: "gguf", quant: "Q4_K_M", license: "BigCode-OpenRAIL-M", url: "https://huggingface.co/unsloth/starcoder2-3b-GGUF/resolve/main/starcoder2-3b-Q4_K_M.gguf", filename: "starcoder2-3b-q4_k_m.gguf", tags: ["code", "small"], minRam: 3 },
  { name: "CodeLlama 7B", source: "hf", family: "codellama", params: 7, paramsShort: "7B", sizeBytes: 3800000000, format: "gguf", quant: "Q4_K_M", license: "Llama-2", url: "https://huggingface.co/unsloth/codellama-7b-instruct-GGUF/resolve/main/codellama-7b-instruct-Q4_K_M.gguf", filename: "codellama-7b-q4_k_m.gguf", tags: ["code", "legacy"], minRam: 6 },
];

function initModelCatalog() {
  API.getHardwareInfo().then(hw => { state.hardware = hw; renderModelCatalog(); });
  // The local library is a separate list from the curated catalog; load it up
  // front so switching to the “On disk” filter is instant.
  refreshLocalModels();

  document.querySelectorAll(".models-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".models-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.catalogFilter = btn.dataset.filter;
      if (state.catalogFilter === "downloaded") refreshLocalModels();
      else renderModelCatalog();
    });
  });

  document.getElementById("models-search")?.addEventListener("input", () => renderModelCatalog());
  document.getElementById("btn-refresh-catalog")?.addEventListener("click", () => {
    refreshLocalModels();
    renderModelCatalog();
    toast("Catalog and local models refreshed", "info", 2000);
  });
  document.getElementById("btn-models-open-file")?.addEventListener("click", openFile);
  document.getElementById("btn-models-open-folder")?.addEventListener("click", openFolder);
}

// Files already in ~/Downloads/remap-studio-models. The IPC for this existed but
// was never called, so a downloaded model was invisible to the app afterwards:
// the only way back to it was File ▸ Open and knowing the path.
async function refreshLocalModels() {
  if (!API.getDownloads) return;
  try {
    const list = await API.getDownloads();
    state.localModels = Array.isArray(list) ? list.sort((a, b) => new Date(b.modified) - new Date(a.modified)) : [];
  } catch (e) {
    state.localModels = [];
  }
  if (state.catalogFilter === "downloaded") renderLocalModels();
}

function renderLocalModels() {
  const list = document.getElementById("models-list");
  if (!list) return;
  const searchVal = (document.getElementById("models-search")?.value || "").toLowerCase();
  const models = (state.localModels || []).filter((m) => !searchVal || m.name.toLowerCase().includes(searchVal));

  if (!models.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No models on disk</p>
        <p class="empty-desc">Downloads from the catalog land in ~/Downloads/remap-studio-models. You can also drop any model file there yourself.</p>
      </div>`;
    return;
  }

  list.innerHTML = models.map((m) => `
    <div class="model-card local${state.selectedLocalPath === m.path ? " selected" : ""}" data-local-path="${escapeHtml(m.path)}" tabindex="0">
      <div class="model-card-name">${escapeHtml(m.name)}<span class="model-card-source local">disk</span></div>
      <div class="model-card-meta">
        <span>${formatBytes(m.size)}</span>
        <span>${timeAgo(new Date(m.modified).getTime())}</span>
      </div>
      <div class="model-card-compat"><span style="color:var(--text-subtle)">Click to load</span></div>
    </div>`).join("");

  list.querySelectorAll("[data-local-path]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedLocalPath = card.dataset.localPath;
      const m = (state.localModels || []).find((x) => x.path === card.dataset.localPath);
      renderLocalModels();
      renderLocalModelDetail(m);
    });
  });
}

function renderLocalModelDetail(m) {
  const detail = document.getElementById("models-detail");
  if (!detail || !m) return;
  detail.innerHTML = `
    <div class="detail-header">
      <div class="detail-name">${escapeHtml(m.name)}</div>
      <div class="detail-desc">Already on this machine · ${formatBytes(m.size)}</div>
    </div>
    <div class="detail-stats">
      <div class="detail-stat"><div class="detail-stat-val">${formatBytes(m.size)}</div><div class="detail-stat-label">File Size</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${timeAgo(new Date(m.modified).getTime())}</div><div class="detail-stat-label">Modified</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${(m.name.split(".").pop() || "?").toUpperCase()}</div><div class="detail-stat-label">Format</div></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Location</div>
      <div class="local-model-path">${escapeHtml(m.path)}</div>
    </div>
    <div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-download" id="btn-load-local">Load this model</button>
      <button class="btn-secondary" id="btn-reveal-local">Copy path</button>
      <button class="btn-secondary" id="btn-delete-local">Delete file…</button>
    </div>`;
  document.getElementById("btn-load-local")?.addEventListener("click", () => {
    switchTab("visualization");
    loadModel(m.path, m.name, m.size, false);
  });
  document.getElementById("btn-reveal-local")?.addEventListener("click", () => copyToClipboard(m.path, "Copied path"));
  document.getElementById("btn-delete-local")?.addEventListener("click", () => deleteLocalModel(m));
}

// Deleting is irreversible and models are large, so it goes through the
// confirm dialog and reports the freed space.
async function deleteLocalModel(m) {
  const ok = await confirmDialog({
    title: "Delete this model file?",
    body: `${m.name} (${formatBytes(m.size)}) will be permanently removed from disk. This cannot be undone.`,
    confirm: "Delete file",
    danger: true,
  });
  if (!ok) return;
  try {
    const res = await API.rpc("file_delete", { path: m.path }).catch(() => null);
    if (res && res.ok) {
      toast(`Deleted ${m.name} — freed ${formatBytes(res.freed_bytes || m.size)}`, "success", 4000);
      await refreshLocalModels();
      const detail = document.getElementById("models-detail");
      if (detail) detail.innerHTML = '<div class="empty-state"><p class="empty-title">File deleted</p><p class="empty-desc">Pick another model from the list</p></div>';
    } else {
      // No backend route for this yet — say so rather than pretending.
      toast("In-app delete is not available; remove the file in Finder", "warning", 6000);
    }
  } catch (e) {
    toast(`Could not delete: ${e.message}`, "error", 6000);
  }
}

function getCompatibility(model) {
  if (!state.hardware) return { score: 0, color: "yellow", label: "Checking..." };
  const totalRam = state.hardware.totalRAM;
  const neededRam = Math.ceil(model.sizeBytes / (1024 * 1024 * 1024) * 1.3);
  if (totalRam >= neededRam * 1.5) return { score: 3, color: "green", label: "Excellent" };
  if (totalRam >= neededRam) return { score: 2, color: "green", label: "Good" };
  if (totalRam >= model.minRam) return { score: 1, color: "yellow", label: "Tight" };
  return { score: 0, color: "red", label: "Not enough RAM" };
}

function renderModelCatalog() {
  const list = document.getElementById("models-list");
  if (!list) return;
  const searchVal = (document.getElementById("models-search")?.value || "").toLowerCase();

  let filtered = MODEL_CATALOG.filter(m => {
    if (state.catalogFilter === "ollama" && m.source !== "ollama") return false;
    if (state.catalogFilter === "hf" && m.source !== "hf") return false;
    if (state.catalogFilter === "compatible" && getCompatibility(m).score < 2) return false;
    if (state.catalogFilter === "downloaded") return false;
    if (searchVal) {
      const hay = `${m.name} ${m.family} ${m.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(searchVal)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const ca = getCompatibility(a), cb = getCompatibility(b);
    if (ca.score !== cb.score) return cb.score - ca.score;
    return a.params - b.params;
  });

  // Staggered animation: each card gets a slight delay based on index
  list.innerHTML = filtered.map((m, i) => {
    const c = getCompatibility(m);
    const isSelected = state.selectedModel && state.selectedModel.name === m.name;
    const delay = Math.min(i * 30, 300); // max 300ms stagger
    return `
      <div class="model-card${isSelected ? " selected" : ""}" 
           onclick="selectModelFromCatalog(${MODEL_CATALOG.indexOf(m)})"
           style="animation: cardMorph 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both;">
        <div class="model-card-name">${m.name}<span class="model-card-source ${m.source}">${m.source}</span></div>
        <div class="model-card-meta"><span>${m.paramsShort}</span><span>${formatBytes(m.sizeBytes)}</span><span>${m.quant}</span><span>${m.format.toUpperCase()}</span></div>
        <div class="model-card-compat"><span class="compat-dot ${c.color}"></span><span style="color:var(--text-subtle)">${c.label}</span></div>
      </div>
    `;
  }).join("");

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state" style="animation: cardMorph 0.3s ease both;"><p class="empty-title">No models found</p></div>';
  }
}

function selectModelFromCatalog(idx) {
  state.selectedModel = MODEL_CATALOG[idx];
  renderModelCatalog();
  renderModelDetail(state.selectedModel);
}

function renderModelDetail(model) {
  const detail = document.getElementById("models-detail");
  if (!detail) return;
  const c = getCompatibility(model);
  const hw = state.hardware;
  const ramLabel = hw ? `${hw.totalRAM}GB (${hw.platformName})` : "Detecting...";

  detail.innerHTML = `
    <div class="detail-header">
      <div class="detail-name">${model.name}</div>
      <div class="detail-desc">${model.family} model · ${model.quant} quantization · ${model.license} license</div>
    </div>
    <div class="detail-stats">
      <div class="detail-stat"><div class="detail-stat-val">${model.paramsShort}</div><div class="detail-stat-label">Parameters</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${formatBytes(model.sizeBytes)}</div><div class="detail-stat-label">File Size</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${model.quant}</div><div class="detail-stat-label">Quantization</div></div>
    </div>
    <div class="detail-compat-bar">
      <div class="detail-compat-title">Hardware Compatibility</div>
      <div class="detail-compat-row"><span class="detail-compat-label">Your RAM</span><span class="detail-compat-val">${ramLabel}</span></div>
      <div class="detail-compat-row"><span class="detail-compat-label">Required RAM</span><span class="detail-compat-val">~${model.minRam}GB</span></div>
      <div class="detail-compat-row"><span class="detail-compat-label">Rating</span><span class="detail-compat-val" style="color:var(--${c.color === "yellow" ? "text-subtle" : c.color})"><span class="compat-dot ${c.color}" style="display:inline-block;vertical-align:middle;margin-right:4px"></span>${c.label}</span></div>
      ${hw ? `<div class="detail-compat-row"><span class="detail-compat-label">CPU</span><span class="detail-compat-val">${hw.cpuCount} cores</span></div>` : ""}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Tags</div>
      <div class="detail-tags">${model.tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}<span class="detail-tag">${model.source}</span><span class="detail-tag">${model.format}</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Download to ~/Downloads/remap-studio-models/</div>
      <div id="download-status-${model.name.replace(/[^a-zA-Z0-9]/g, "")}"></div>
      <button class="btn-download" id="btn-download-model" onclick="downloadModelFromCatalog()">Download ${model.name}</button>
    </div>
  `;
}

async function downloadModelFromCatalog() {
  const model = state.selectedModel;
  if (!model) return;
  const btn = document.getElementById("btn-download-model");
  btn.disabled = true; btn.textContent = "Downloading..."; btn.className = "btn-download downloading";
  try {
    const result = await API.downloadModel(model.url, model.filename);
    if (result.error) throw new Error(result.error);
    btn.textContent = "Downloaded ✓"; btn.className = "btn-download";
    log(`Downloaded ${model.name} to ${result.path}`, "success");
  } catch (e) {
    btn.textContent = `Error: ${e.message}`; btn.className = "btn-download"; btn.style.background = "var(--danger)";
    log(`Download failed: ${e.message}`, "error");
  }
}

function updateDownloadProgress(data) {
  if (!state.selectedModel || state.selectedModel.filename !== data.filename) return;
  const statusEl = document.getElementById("download-status-" + state.selectedModel.name.replace(/[^a-zA-Z0-9]/g, ""));
  if (!statusEl) return;
  if (data.status === "completed") {
    statusEl.innerHTML = `<div class="download-progress"><div class="download-progress-text">✓ Complete — ${formatBytes(data.totalBytes)}</div></div>`;
    return;
  }
  const pct = Math.round(data.progress || 0);
  statusEl.innerHTML = `<div class="download-progress"><div class="download-progress-bar"><div class="download-progress-fill" style="width:${pct}%"></div></div><div class="download-progress-text">${pct}% — ${formatBytes(data.downloadedBytes || 0)} / ${formatBytes(data.totalBytes || 0)}</div></div>`;
}

// ══════════════════════════════════════════
// 3D NEURAL NETWORK VIEWPORT
// ══════════════════════════════════════════
// NN3D (renderer/nn3d.js) is a self-contained WebGL2 engine — no bundler,
// no CDN, works offline in the packaged app. This controller owns the
// canvas lifecycle, HUD wiring, picking and the model → graph handoff.

function get3DCanvas() {
  return document.getElementById("model-canvas-3d");
}

// Lazily create the engine so users who never open 3D pay nothing at boot.
function ensure3D() {
  if (state.nn3d) return state.nn3d;
  if (state.nn3dFailed) return null;

  const canvas = get3DCanvas();
  if (!canvas) return null;
  if (!window.NN3D) {
    state.nn3dFailed = true;
    log("3D engine (nn3d.js) failed to load — falling back to 2D.", "error");
    toast("3D view unavailable — nn3d.js did not load.", "error", 5000);
    return null;
  }

  try {
    state.nn3d = window.NN3D.create(canvas, { quality: "high" });
    wire3DInteractions(state.nn3d);
    log("3D viewport ready (WebGL2)", "success");
  } catch (e) {
    state.nn3dFailed = true;
    log(`3D unavailable: ${e.message}`, "error");
    toast("3D view unavailable on this GPU — staying in 2D.", "error", 6000);
    return null;
  }
  return state.nn3d;
}

// Push the currently-loaded model into the 3D scene.
function syncModelTo3D() {
  const nn = state.nn3d;
  if (!nn || !state.model) return;
  const summary = state.modelSummary || {};
  nn.setModel({
    layers: state.layers,
    tensors: state.tensors,
    summary,
  });
  nn.setLayout(state.layout3d);
  nn.setColorMode(state.colorMode3d);
  nn.setAutoRotate(state.autoRotate);

  const nodeCount = nn.state.nodes.length;
  const edgeCount = nn.state.edges.length;
  const stageCount = nn.state.stageCount;

  log(`3D graph: ${nodeCount} nodes · ${edgeCount} links · ${stageCount} stages`);
  update3DStats();

  if (nodeCount === 0) {
    toast("This model has no tensors to render in 3D.", "warning", 5000);
  }
}

function update3DStats() {
  const nn = state.nn3d;
  const el = document.getElementById("hud-3d-count");
  if (!el) return;
  if (!nn) { el.textContent = "0 nodes"; return; }
  const n = nn.state.nodes.length;
  el.textContent = `${n} node${n === 1 ? "" : "s"} · ${nn.state.edges.length} links`;
}

// ── Stage labels + unlearning marks ──

// The floating "01 / INPUT EMBEDDING / n = 12" captions, projected every
// frame from the engine's real stage metadata. Nothing is hardcoded: titles
// and counts come from the loaded model.
let _stageLabelEls = [];
let _stageLabelKey = "";

function updateStageLabels() {
  const container = document.getElementById("stage-labels");
  if (!container) return;
  const nn = state.nn3d;
  if (!nn || state.viewMode !== "3d") {
    if (_stageLabelEls.length) {
      container.innerHTML = "";
      _stageLabelEls = [];
      _stageLabelKey = "";
    }
    return;
  }
  const anchors = nn.stageAnchors ? nn.stageAnchors() : [];
  const key = anchors.map((a) => `${a.order}:${a.label}:${a.count}`).join("|");
  if (key !== _stageLabelKey) {
    _stageLabelKey = key;
    container.innerHTML = "";
    _stageLabelEls = anchors.map((a) => {
      const el = document.createElement("div");
      el.className = "stage-label";
      const num = document.createElement("span");
      num.className = "stage-label-num";
      num.textContent = String(a.order).padStart(2, "0");
      const title = document.createElement("span");
      title.className = "stage-label-title";
      title.textContent = a.label;
      const count = document.createElement("span");
      count.className = "stage-label-count";
      count.textContent = `n = ${a.count}`;
      el.append(num, title, count);
      container.appendChild(el);
      return el;
    });
  }
  // In the straight-line ("layered") layout every stage sits on one row, so
  // captions alternate above and below the line — 27 labels stacked on top of
  // each other would be an unreadable smear. The other layouts keep them all
  // above their clusters.
  const rowLayout = state.layout3d === "layered";
  // 27 captions across one row need a tighter type scale than a handful of
  // captions around a sphere: at 9px the longest title (INPUT EMBEDDING)
  // collided with its neighbour two stages away.
  container.classList.toggle("compact", rowLayout);
  const n = Math.min(anchors.length, _stageLabelEls.length);
  // How tightly the captions are packed horizontally. Head-on every column
  // gets one; as the camera swings away from the front the columns foreshorten
  // and 27 captions can no longer sit side by side, so the line thins them out
  // (lower lane first, then every Nth) instead of smearing them together.
  // Only neighbours in the *same* lane can collide, so the gap that matters is
  // the one between every second caption.
  let pitch = Infinity;
  if (rowLayout) {
    for (let i = 2; i < n; i++) {
      pitch = Math.min(pitch, Math.abs(anchors[i].x - anchors[i - 2].x));
    }
  }
  const stride = !rowLayout ? 1 : pitch >= 50 ? 1 : pitch >= 32 ? 2 : pitch >= 22 ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const a = anchors[i];
    const el = _stageLabelEls[i];
    // Level of detail: dense models would otherwise produce a wall of
    // captions. The end stages (input/output) always show; middle stages
    // keep their labels once their cluster is big enough on screen.
    const isEnd = i === 0 || i === n - 1;
    // The straight-line layout gives every stage its own lane (captions
    // alternate above/below), so all of them can be labelled at once — the
    // model's whole layer list stays readable. Wrapped layouts keep the old
    // size gate to avoid a wall of captions.
    const minRpx = rowLayout ? 5 : 13;
    const belowLane = rowLayout && i % 2 === 1;
    const laneOk = !belowLane || stride === 1;
    const show = a.visible && (isEnd || (laneOk && i % stride === 0 && a.rPx >= minRpx));
    if (!show) { el.style.display = "none"; continue; }
    el.style.display = "";
    // Captions in the lower lane sit under their column: the class lets the
    // stylesheet flip the little stem so it points up at the cluster.
    const below = rowLayout && i % 2 === 1;
    el.classList.toggle("below", below);
    // The end columns sit close to the frame edges, so their captions are
    // nudged inwards instead of being clipped: a caption box is centred on its
    // column, and half of it would otherwise fall outside the viewport.
    const halfLabel = rowLayout ? 38 : 56;
    const lx = Math.max(halfLabel, Math.min(container.clientWidth - halfLabel, a.x));
    el.style.transform = below
      ? `translate(-50%, 0) translate(${lx}px, ${a.belowY}px)`
      : `translate(-50%, -100%) translate(${lx}px, ${a.y}px)`;
  }
  for (let i = n; i < _stageLabelEls.length; i++) _stageLabelEls[i].style.display = "none";
}

// Mirror the backend's pending surgery edits onto the 3D scene: edited and
// deleted tensors light up orange/red together with every fibre touching
// them, so the unlearning target is visible in the architecture itself.
async function syncUnlearnMarks3D() {
  const nn = state.nn3d;
  if (!nn || !nn.setUnlearnTargets) return;
  if (!state.model || state.viewMode !== "3d") return;
  try {
    const pending = await API.rpc("tensor_pending");
    if (!pending || pending.error) return;
    const names = new Set(Object.keys(pending.edited || {}));
    (pending.deleted || []).forEach((nm) => names.add(nm));
    const ids = nn.state.nodes.filter((nd) => names.has(nd.name)).map((nd) => nd.id);
    nn.setUnlearnTargets(ids);
  } catch (e) { /* marks are an enhancement — never break the UI for them */ }
}

// ── View mode switching ──
function setViewMode(mode, opts = {}) {
  if (mode === state.viewMode && !opts.force) return;
  const canvas2d = document.getElementById("model-canvas");
  const canvas3d = get3DCanvas();
  const hud3d = document.getElementById("hud-3d-controls");
  const stats3d = document.getElementById("hud-3d-stats");
  const legend = document.getElementById("viewport-legend");
  const btn2d = document.getElementById("btn-view-2d");
  const btn3d = document.getElementById("btn-view-3d");
  const nodeCard = document.getElementById("node-hud-card");

  state.viewMode = mode;

  if (mode === "3d") {
    const nn = ensure3D();
    if (!nn) {
      // Engine unavailable → stay in 2D rather than showing a blank canvas.
      state.viewMode = "2d";
      if (btn2d) btn2d.classList.add("active");
      if (btn3d) btn3d.classList.remove("active");
      return;
    }
    canvas2d?.classList.add("hidden");
    canvas3d?.classList.remove("hidden");
    hud3d?.classList.remove("hidden");
    stats3d?.classList.remove("hidden");
    legend?.classList.remove("hidden");
    btn2d?.classList.remove("active");
    btn3d?.classList.add("active");
    syncModelTo3D();
    nn.resize();
    nn.start();
    startFpsLoop3D();
    update3DStats();
    updateStageLabels();
    syncUnlearnMarks3D();
  } else {
    canvas2d?.classList.remove("hidden");
    canvas3d?.classList.add("hidden");
    hud3d?.classList.add("hidden");
    stats3d?.classList.add("hidden");
    legend?.classList.add("hidden");
    nodeCard?.classList.add("hidden");
    btn2d?.classList.add("active");
    btn3d?.classList.remove("active");
    state.nn3d?.stop();
    updateStageLabels(); // leaves 3D, so the captions clear themselves
    if (state.model) requestModelCanvasRender();
  }
  updateStatusBar();
}

function cycleLayout3D() {
  const nn = ensure3D();
  if (!nn) return;
  const i = LAYOUTS_3D.indexOf(state.layout3d);
  state.layout3d = LAYOUTS_3D[(i + 1) % LAYOUTS_3D.length];
  nn.setLayout(state.layout3d);
  const label = document.getElementById("hud-3d-layout-label");
  if (label) label.textContent = LAYOUT_LABELS_3D[state.layout3d];
  log(`3D layout: ${state.layout3d}`);
}

function cycleColorMode3D() {
  const nn = ensure3D();
  if (!nn) return;
  const i = COLORMODES_3D.indexOf(state.colorMode3d);
  state.colorMode3d = COLORMODES_3D[(i + 1) % COLORMODES_3D.length];
  nn.setColorMode(state.colorMode3d);
  const label = document.getElementById("hud-3d-color-label");
  if (label) label.textContent = COLORMODE_LABELS_3D[state.colorMode3d];
  log(`3D colour mode: ${state.colorMode3d}`);
}

function toggleAutoRotate3D() {
  const nn = ensure3D();
  if (!nn) return;
  state.autoRotate = !state.autoRotate;
  nn.setAutoRotate(state.autoRotate);
  document.getElementById("btn-3d-spin")?.classList.toggle("active", state.autoRotate);
}

function resetView3D() {
  state.nn3d?.resetView();
  log("Camera reset");
}

// Keyboard slant: bank the camera about its view axis one small step per
// press. Q leans the model's top left, E leans it right — the same axis
// ⌥/Alt-drag drives continuously.
const SLANT_STEP_3D = Math.PI / 24; // 7.5°
function slantView3D(clockwise) {
  const nn = state.nn3d;
  if (!nn || state.viewMode !== "3d") return;
  // engine roll() is counter-clockwise for positive radians.
  nn.roll(clockwise ? -SLANT_STEP_3D : SLANT_STEP_3D);
}

// ── Node inspector card ──
function showNodeCard(node, screenX, screenY) {
  const card = document.getElementById("node-hud-card");
  if (!card || !node) return;
  const dtypeClass = /quant/i.test(node.dtype) ? "quant" : "real";
  card.innerHTML = `
    <div class="node-card-head">
      <span class="node-card-dot" style="background:rgb(${(node.baseColor || [1, 1, 1]).map((c) => Math.round(c * 255)).join(",")})"></span>
      <span class="node-card-title" title="${node.name}">${node.name}</span>
    </div>
    <div class="node-card-rows">
      <div class="node-card-row"><span>Shape</span><b>${(node.shape || []).length ? `[${node.shape.join(" × ")}]` : "—"}</b></div>
      <div class="node-card-row"><span>Dtype</span><b class="${dtypeClass}">${node.dtype}</b></div>
      <div class="node-card-row"><span>Params</span><b>${formatParams(node.params)}</b></div>
      <div class="node-card-row"><span>Size</span><b>${formatBytes(node.bytes)}</b></div>
      <div class="node-card-row"><span>Stage</span><b>${node.stage + 1} / ${state.nn3d?.state.stageCount || "?"}</b></div>
    </div>
    <div class="node-card-hint">Click to inspect weights · double-click to focus</div>
  `;
  card.classList.remove("hidden");
  // Keep the card inside the viewport.
  const pad = 12;
  const w = 260, h = card.offsetHeight || 150;
  const x = Math.min(Math.max(pad, screenX + 18), window.innerWidth - w - pad);
  const y = Math.min(Math.max(pad, screenY + 12), window.innerHeight - h - pad);
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

function hideNodeCard() {
  document.getElementById("node-hud-card")?.classList.add("hidden");
}

// ── Pointer / keyboard wiring ──
function wire3DInteractions(nn) {
  const canvas = nn.canvas;
  // Gesture legend on the canvas itself — the viewport has no visible help.
  canvas.title = "Drag: rotate · ⌥/Alt-drag: slant · Shift/right-drag: pan · Scroll: tilt · ⌘/Ctrl+scroll: zoom";
  let dragging = false;
  let panning = false;
  let last = { x: 0, y: 0 };
  let moved = 0;

  canvas.addEventListener("pointerdown", (e) => {
    // Capture keeps the drag alive outside the canvas; synthetic/test pointers
    // have no active capture target, and failing there must not kill the drag.
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    dragging = true;
    // Right-button or shift-drag pans; plain drag orbits, ⌥/Alt-drag slants.
    panning = e.button === 2 || e.shiftKey;
    last = { x: e.clientX, y: e.clientY };
    moved = 0;
    if (!panning) {
      nn.setAutoRotate(false);
      document.getElementById("btn-3d-spin")?.classList.remove("active");
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };

    if (dragging) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (panning) nn.pan(dx, dy);
      // ⌥/Alt-drag banks the whole view about its own axis: the model slants
      // like italic text. Dragging right leans the top right (clockwise).
      else if (e.altKey) nn.roll(-dx * 0.006);
      else nn.orbit(dx, dy);
      return;
    }

    // Hover pick — throttled to one lookup per frame.
    if (!_hover3dRaf) {
      _hover3dRaf = requestAnimationFrame(() => {
        _hover3dRaf = 0;
        const rect = canvas.getBoundingClientRect();
        const hit = nn.pick(e.clientX - rect.left, e.clientY - rect.top);
        const id = hit ? hit.node.id : -1;
        if (id === state.hoveredNode3d) return;
        state.hoveredNode3d = id;
        nn.setHover(id);
        canvas.style.cursor = hit ? "pointer" : "grab";
        if (hit) showNodeCard(hit.node, e.clientX, e.clientY);
        else if (state.selectedNode3d < 0) hideNodeCard();
      });
    }
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    // A click (not a drag) selects the node under the cursor.
    if (moved < 5) {
      const rect = canvas.getBoundingClientRect();
      const hit = nn.pick(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) {
        state.selectedNode3d = hit.node.id;
        nn.setSelected(hit.node.id);
        showNodeCard(hit.node, e.clientX, e.clientY);
        // Mirror the selection into the shared inspector so the properties
        // panel and weight explorer stay in sync with the 3D view.
        if (typeof selectTensor === "function") selectTensor(hit.node.name);
      } else {
        state.selectedNode3d = -1;
        nn.setSelected(-1);
        hideNodeCard();
      }
    }
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = nn.pick(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      nn.focusNode(hit.node.id);
      log(`Focused ${hit.node.name}`);
    }
  });

  canvas.addEventListener("pointerleave", () => {
    state.hoveredNode3d = -1;
    nn.setHover(-1);
    if (state.selectedNode3d < 0) hideNodeCard();
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    // Zoom moved onto the modifier gesture (⌘/Ctrl-wheel, which is also what a
    // trackpad pinch arrives as): a plain scroll or two-finger swipe now turns
    // and tilts the model, so the trackpad can orbit without a click-drag.
    if (e.ctrlKey || e.metaKey) { nn.zoom(e.deltaY); return; }
    // Normalise line/page deltas so the same gesture means the same thing on
    // every platform, then damp a coarse mouse notch — a trackpad swipe
    // arrives as many small deltas and must stay fine-grained.
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= 100;
    const k = Math.abs(d) >= 40 ? 0.4 : 1;
    nn.orbit(e.deltaX * k, d * k);
  }, { passive: false });

  // Suppress the native context menu so right-drag can pan.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ResizeObserver keeps the framebuffer matched to the panel — critical when
  // the sidebar/properties panel is toggled or the window is resized.
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (state.viewMode === "3d") nn.resize();
    });
    ro.observe(canvas.parentElement || canvas);
  }

}

let _hover3dRaf = 0;
let _fps3dRaf = 0;

// FPS readout — the loop self-terminates when we leave 3D, so it must be
// re-armed on every entry into 3D mode (setViewMode calls this).
function startFpsLoop3D() {
  if (_fps3dRaf) return;
  let frames = 0;
  let lastFps = performance.now();
  const fpsLoop = () => {
    if (state.viewMode !== "3d") { _fps3dRaf = 0; return; }
    frames++;
    const now = performance.now();
    if (now - lastFps >= 1000) {
      const el = document.getElementById("hud-3d-fps");
      if (el) el.textContent = `${frames} fps`;
      frames = 0;
      lastFps = now;
    }
    // The stage captions are projected from the live camera every frame.
    updateStageLabels();
    _fps3dRaf = requestAnimationFrame(fpsLoop);
  };
  _fps3dRaf = requestAnimationFrame(fpsLoop);
}

// ── HUD wiring ──
function initViewportHUD() {
  // The HUD container ships with class="hidden" and nothing ever removed it,
  // which left the whole HUD invisible — including the only 2D/3D switch.
  // The 3D-only groups inside handle their own visibility in setViewMode.
  document.getElementById("viewport-hud")?.classList.remove("hidden");

  document.getElementById("btn-view-2d")?.addEventListener("click", () => setViewMode("2d"));
  document.getElementById("btn-view-3d")?.addEventListener("click", () => setViewMode("3d"));
  document.getElementById("btn-3d-layout")?.addEventListener("click", cycleLayout3D);
  document.getElementById("btn-3d-spin")?.addEventListener("click", toggleAutoRotate3D);
  document.getElementById("btn-3d-color")?.addEventListener("click", cycleColorMode3D);
  document.getElementById("btn-3d-reset")?.addEventListener("click", resetView3D);
  document.getElementById("status-view")?.addEventListener("click", () => {
    setViewMode(state.viewMode === "3d" ? "2d" : "3d");
  });
}

// Shortcuts that only make sense while the 3D view is active. Registered in
// the main keydown handler via is3DViewActive() so they never shadow typing.
function is3DViewActive() {
  return state.viewMode === "3d" && !state.commandPaletteOpen;
}

function handle3DShortcut(e) {
  if (!is3DViewActive()) return false;
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;

  switch (e.key.toLowerCase()) {
    case "l": cycleLayout3D(); return true;
    case "c": cycleColorMode3D(); return true;
    case "r": resetView3D(); return true;
    case " ": toggleAutoRotate3D(); return true;
    case "g": setViewMode("2d"); return true;
    case "q": slantView3D(false); return true;
    case "e": slantView3D(true); return true;
    default: return false;
  }
}
