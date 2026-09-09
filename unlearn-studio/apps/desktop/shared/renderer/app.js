// ══════════════════════════════════════════════════════════
// REMAP STUDIOS — Professional Neural Network IDE
// ══════════════════════════════════════════════════════════

const API = window.electronAPI;

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
function signInAsGuest() {
  currentUser = {
    uid: "guest-" + Math.random().toString(36).slice(2, 10),
    email: "guest@localhost",
    displayName: "Guest User",
    photoURL: null,
    isGuest: true,
  };
  localStorage.setItem("remap_user", JSON.stringify(currentUser));
  showApp();
  updateSettingsUserInfo();
  log("Signed in as guest — cloud sync & subscriptions disabled.", "info");
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

  // Safety: show app after 5s if auth never resolves
  setTimeout(() => {
    if (!currentUser) {
      console.warn("[Auth] Timed out, showing app anyway");
      showApp();
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
    if (!firebaseAuth) return showAuthErr("auth-error", "Auth not ready");
    try {
      btn.disabled = true;
      btn.textContent = "Redirecting to Google...";
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
  modelSummary: null,
  // New state
  hardware: null,
  catalogFilter: "all",
  selectedModel: null,
  activeDropdown: null,
  commandPaletteOpen: false,
  selectedCommandIdx: 0,
  sidebarVisible: true,
  propsVisible: true,
  terminalExpanded: false,
  settings: {
    autoload: true,
    welcome: true,
    gpu: true,
    animSpeed: "normal",
    connections: true,
    heatmapColor: "grayscale",
    defaultMethod: "retain_aware",
    autosave: true,
    pythonPath: "python3",
    port: 8420,
  },
  exportFormat: "safetensors",
};

// ══════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // Restore session before Firebase init so a stored guest/last user doesn't
  // flash the login screen (Firebase's auth listener settles later).
  try {
    const saved = JSON.parse(localStorage.getItem("remap_user") || "null");
    if (saved && saved.isGuest) {
      currentUser = saved;
      showApp();
    }
  } catch (e) { /* corrupt cache — ignore */ }

  initFirebase();
  initAuthHandlers();

  initTabs();
  initResizeHandles();
  initBottomPanel();
  initDragDrop();
  initModelOpeners();
  initCanvasInteractions();
  initUnlearnPanel();
  initWeightExplorer();
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
  initContextMenu();
  initBottomPanelTabs();
});

// ══════════════════════════════════════════
// BACKEND LISTENERS
// ══════════════════════════════════════════

function initBackendListeners() {
  API.onBackendReady((info) => {
    state.backendReady = true;
    state.backendInfo = info;
    log("Python backend connected", "success");
    log(`Device: ${info.device} | PyTorch ${info.torch} | Python ${info.python.split(" ")[0]}`);
    if (info.cuda_available) log(`CUDA ${info.cuda_version} available`, "info");
    if (info.mps_available) log("Apple MPS GPU available", "info");
    log(`RAM: ${info.ram_available_gb}GB / ${info.ram_total_gb}GB available`);
    document.getElementById("status-platform").textContent = `${info.device}`;
    document.getElementById("status-device").textContent = `${info.ram_total_gb}GB RAM`;
    document.getElementById("status-ram").textContent = `${info.ram_available_gb}GB free`;
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
  if (name === "unlearn") renderUnlearnCanvas();
}

// ══════════════════════════════════════════
// RESIZE HANDLES
// ══════════════════════════════════════════

function initResizeHandles() {
  const setupResize = (selector, options) => {
    document.querySelectorAll(`.resize-handle[data-resize='${selector}']`).forEach((handle) => {
      let startPos, startSize;
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault(); e.stopPropagation();
        startPos = options.axis === "x" ? e.clientX : e.clientY;
        startSize = options.getSize();
        handle.classList.add("active");
        document.body.style.cursor = options.axis === "x" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";

        const onMove = (e) => {
          const currentPos = options.axis === "x" ? e.clientX : e.clientY;
          const diff = currentPos - startPos;
          const newSize = options.invert ? startSize - diff : startSize + diff;
          options.setSize(Math.max(options.min, Math.min(options.max, newSize)));
        };
        const onUp = () => {
          handle.classList.remove("active");
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
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

  setupResize("props-chat", {
    axis: "y", min: 120, max: 600, invert: true,
    getSize: () => document.getElementById("props-top")?.offsetHeight || 200,
    setSize: (h) => { const el = document.getElementById("props-top"); if (el) el.style.flex = `0 0 ${h}px`; },
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
      handleMenuAction(action);
    });
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("visible"));
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("dropdown-overlay").classList.remove("visible");
  state.activeDropdown = null;
}

function handleMenuAction(action) {
  switch (action) {
    case "open-file": openFile(); break;
    case "open-folder": openFolder(); break;
    case "export": toggleModal("export-overlay"); break;
    case "export-json": exportConfig(); break;
    case "settings": toggleModal("settings-overlay"); break;
    case "shortcuts": toggleModal("shortcuts-overlay"); break;
    case "about": toggleModal("about-overlay"); break;
    case "toggle-sidebar": toggleSidebar(); break;
    case "toggle-props": toggleProps(); break;
    case "toggle-terminal": toggleTerminal(); break;
    case "zoom-in": zoomIn(); break;
    case "zoom-out": zoomOut(); break;
    case "zoom-reset": state.zoom = 1; updateZoom(); break;
    case "fullscreen": toggleFullscreen(); break;
    case "start-unlearn": startUnlearn(); break;
    case "stop-unlearn": stopUnlearn(); break;
    case "run-analysis": if (state.model) log("Running analysis...", "info"); break;
    case "benchmark": if (state.model) log("Starting benchmark...", "info"); else log("Load a model first", "error"); break;
    case "docs": log("Opening documentation...", "info"); break;
    case "report-issue": log("Opening issue tracker...", "info"); break;
  }
}

// ══════════════════════════════════════════
// ACTIVITY BAR
// ══════════════════════════════════════════

function initActivityBar() {
  document.querySelectorAll(".activity-btn[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      // Toggle active state
      document.querySelectorAll(".activity-btn[data-panel]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      switch (panel) {
        case "explorer":
          document.getElementById("sidebar").style.display = "flex";
          state.sidebarVisible = true;
          break;
        case "search":
          // TODO: Search panel
          document.getElementById("sidebar").style.display = "flex";
          state.sidebarVisible = true;
          break;
        case "models":
          document.getElementById("sidebar").style.display = "flex";
          state.sidebarVisible = true;
          switchTab("models");
          break;
        case "unlearn":
          document.getElementById("sidebar").style.display = "flex";
          state.sidebarVisible = true;
          switchTab("unlearn");
          break;
      }
    });
  });

  document.getElementById("btn-activity-settings")?.addEventListener("click", () => toggleModal("settings-overlay"));
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

    // Command palette: Cmd+K
    if (mod && e.key === "k") { e.preventDefault(); openCommandPalette(); return; }

    // If command palette is open, don't process other shortcuts
    if (state.commandPaletteOpen) return;

    // If typing in an input, only handle Escape
    if (isInput && e.key !== "Escape") return;

    // Cmd+O: Open file
    if (mod && !e.shiftKey && e.key === "o") { e.preventDefault(); openFile(); return; }
    // Cmd+Shift+O: Open folder
    if (mod && e.shiftKey && e.key === "o") { e.preventDefault(); openFolder(); return; }
    // Cmd+E: Export
    if (mod && e.key === "e") { e.preventDefault(); toggleModal("export-overlay"); return; }
    // Cmd+,: Settings
    if (mod && e.key === ",") { e.preventDefault(); toggleModal("settings-overlay"); return; }
    // Cmd+B: Toggle sidebar
    if (mod && e.key === "b") { e.preventDefault(); toggleSidebar(); return; }
    // Cmd+Shift+P: Toggle properties
    if (mod && e.shiftKey && e.key === "p") { e.preventDefault(); toggleProps(); return; }
    // Cmd+`: Toggle terminal
    if (mod && e.key === "`") { e.preventDefault(); toggleTerminal(); return; }
    // Cmd+Shift+R: Start unlearn
    if (mod && e.shiftKey && e.key === "r") { e.preventDefault(); startUnlearn(); return; }
    // Cmd+/: Shortcuts
    if (mod && e.key === "/") { e.preventDefault(); toggleModal("shortcuts-overlay"); return; }
    // Cmd+1-5: Switch tabs
    if (mod && ["1","2","3","4","5"].includes(e.key)) {
      e.preventDefault();
      const tabs = ["visualization", "weights", "heatmap", "unlearn", "models"];
      switchTab(tabs[parseInt(e.key) - 1]);
      return;
    }
    // Cmd++/-: Zoom
    if (mod && e.key === "=") { e.preventDefault(); zoomIn(); return; }
    if (mod && e.key === "-") { e.preventDefault(); zoomOut(); return; }
    if (mod && e.key === "0") { e.preventDefault(); state.zoom = 1; updateZoom(); return; }
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
  renderModelCanvas();
}

function toggleProps() {
  const props = document.getElementById("properties");
  const handle = document.querySelector('.resize-handle[data-resize="props"]');
  state.propsVisible = !state.propsVisible;
  props.style.display = state.propsVisible ? "flex" : "none";
  handle.style.display = state.propsVisible ? "" : "none";
}

function toggleTerminal() {
  const panel = document.getElementById("bottom-panel");
  if (panel.classList.contains("expanded")) {
    panel.classList.remove("expanded");
    panel.classList.add("collapsed");
    state.terminalExpanded = false;
  } else {
    panel.classList.remove("collapsed");
    panel.classList.add("expanded");
    state.terminalExpanded = true;
  }
}

function zoomIn() { state.zoom = Math.min(3, state.zoom * 1.1); updateZoom(); }
function zoomOut() { state.zoom = Math.max(0.3, state.zoom * 0.9); updateZoom(); }
function updateZoom() {
  document.getElementById("status-zoom").textContent = `${Math.round(state.zoom * 100)}%`;
  if (state.model) renderModelCanvas();
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
  if (modal) modal.classList.toggle("visible");
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
      document.querySelectorAll(".export-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      state.exportFormat = opt.dataset.format;
    });
  });

  document.getElementById("btn-do-export")?.addEventListener("click", async () => {
    if (!state.model) { log("No model loaded to export", "error"); return; }
    const path = await API.saveFile();
    if (!path) return;
    log(`Exporting model as ${state.exportFormat} to ${path}...`, "info");
    try {
      const result = await API.rpc("model_export", { path, format: state.exportFormat });
      if (result.error) throw new Error(result.error);
      log(`Export complete: ${path}`, "success");
      toggleModal("export-overlay");
    } catch (e) {
      log(`Export failed: ${e.message}`, "error");
    }
  });
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
    });
  });

  // Initialize settings user info
  updateSettingsUserInfo();
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

  document.addEventListener("contextmenu", (e) => {
    const treeNode = e.target.closest(".tree-node");
    if (treeNode) {
      e.preventDefault();
      menu.style.top = `${e.clientY}px`;
      menu.style.left = `${e.clientX}px`;
      menu.classList.add("visible");
    }
  });

  document.addEventListener("click", () => menu.classList.remove("visible"));

  document.querySelectorAll(".context-menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const action = item.dataset.action;
      if (action === "copy-name") log("Copied to clipboard", "info");
      if (action === "copy-path") log("Path copied", "info");
      if (action === "view-properties") { /* already visible */ }
      if (action === "view-heatmap") switchTab("heatmap");
    });
  });
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
    });
  });

  document.getElementById("btn-clear-terminal")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("terminal-output").innerHTML = "";
    log("Terminal cleared", "info");
  });

  document.getElementById("btn-toggle-terminal")?.addEventListener("click", toggleTerminal);
}

// ══════════════════════════════════════════
// BOTTOM PANEL
// ══════════════════════════════════════════

function initBottomPanel() {
  document.getElementById("bottom-panel-toggle")?.addEventListener("click", toggleTerminal);

  // Terminal input handler
  const termInput = document.getElementById("terminal-input");
  const termSend = document.getElementById("terminal-send");
  if (termInput) {
    const sendTerminalCommand = async () => {
      const cmd = termInput.value.trim();
      if (!cmd) return;
      termInput.value = "";
      log(`$ ${cmd}`, "user-cmd");

      // Built-in commands
      if (cmd === "clear") { document.getElementById("terminal-output").innerHTML = ""; return; }
      if (cmd === "help") { log("Commands: clear, help, status, layers, tensors, export, open <path>, unlearn", "info"); return; }
      if (cmd === "status") {
        if (state.model) log(`Model: ${state.model.name} | ${state.layers.length} layers | ${state.tensors.length} tensors`, "info");
        else log("No model loaded", "warning");
        return;
      }
      if (cmd === "layers") {
        if (state.layers.length === 0) { log("No model loaded", "warning"); return; }
        state.layers.forEach(l => log(`  ${l.name} — ${formatParams(l.total_params)} params`));
        return;
      }
      if (cmd === "tensors") {
        if (state.tensors.length === 0) { log("No model loaded", "warning"); return; }
        state.tensors.slice(0, 20).forEach(t => log(`  ${t.name} [${t.shape.join("x")}] ${t.dtype} ${formatBytes(t.byte_count)}`));
        if (state.tensors.length > 20) log(`  ... +${state.tensors.length - 20} more`, "info");
        return;
      }
      if (cmd.startsWith("open ")) {
        const p = cmd.slice(5).trim();
        if (p) loadModel(p, p.split("/").pop(), 0);
        else log("Usage: open <path>", "error");
        return;
      }
      if (cmd === "export") { toggleModal("export-overlay"); return; }
      if (cmd === "unlearn") { switchTab("unlearn"); return; }

      // Try sending to Python backend
      if (state.backendReady) {
        try {
          const result = await API.rpc("shell_exec", { command: cmd });
          if (result.error) log(`Error: ${result.error}`, "error");
          else if (result.stdout) log(result.stdout);
          else log("Command executed", "info");
        } catch (e) {
          log(`Command not recognized: ${cmd}. Type 'help' for available commands.`, "error");
        }
      } else {
        log("Backend not ready. Available: clear, help, status, layers, tensors, open", "warning");
      }
    };
    if (termSend) termSend.addEventListener("click", sendTerminalCommand);
    termInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendTerminalCommand(); } });
  }
}

// ══════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════

function initDragDrop() {
  const body = document.body;
  body.addEventListener("dragover", (e) => { e.preventDefault(); body.classList.add("drag-active"); });
  body.addEventListener("dragleave", () => body.classList.remove("drag-active"));
  body.addEventListener("drop", (e) => {
    e.preventDefault(); body.classList.remove("drag-active");
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Electron 32+ removed File.path. Resolve the real path via webUtils in preload.
      const resolved = API.fileFromDrop ? API.fileFromDrop(file) : { path: file.path, name: file.name, size: file.size };
      loadModel(resolved.path || resolved.name, resolved.name, resolved.size);
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
  loadModel(result.path, result.name, 0);
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

async function loadModel(filePath, fileName, fileSize) {
  if (!state.backendReady) {
    log("Python backend not ready. Please wait...", "error");
    return;
  }

  log(`Loading model: ${fileName}`, "info");
  log(`Path: ${filePath}`);

  const overlay = document.getElementById("canvas-overlay");
  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon" style="animation: spin 1s linear infinite;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#333" stroke-width="3"/>
          <path d="M24 4a20 20 0 0 1 20 20" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="welcome-title">Loading ${fileName}...</h2>
      <p class="welcome-desc">Parsing tensors, computing statistics, building layer graph</p>
    </div>
  `;

  try {
    const result = await API.rpc("model_load", { path: filePath });
    if (result.error) throw new Error(result.error);

    state.model = { path: filePath, name: fileName, size: fileSize, metadata: result };

    // Initialize with empty arrays in case any of these fail (e.g. GGUF models)
    state.layers = [];
    state.tensors = [];
    state.modelSummary = {};

    // Try to get layers — may fail for GGUF where current_model is null
    try {
      const layersResult = await API.rpc("model_layers");
      if (layersResult && !layersResult.error) {
        state.layers = Array.isArray(layersResult.layers) ? layersResult.layers : [];
      }
    } catch (e) { log(`Layers not available: ${e.message}`, "warning"); }

    // Try to get tensors — may fail for GGUF
    try {
      const tensorsResult = await API.rpc("weight_list");
      if (tensorsResult && !tensorsResult.error) {
        state.tensors = Array.isArray(tensorsResult.tensors) ? tensorsResult.tensors : [];
      }
    } catch (e) { log(`Tensors not available: ${e.message}`, "warning"); }

    // Try to get summary — may fail for GGUF
    try {
      const summaryResult = await API.rpc("model_summary");
      if (summaryResult && !summaryResult.error) {
        state.modelSummary = summaryResult;
      }
    } catch (e) { log(`Summary not available: ${e.message}`, "warning"); }

    updateBreadcrumb();
    updateStatusBar();
    updateModelTree();
    updateWeightExplorer();
    updateUnlearnButton();
    overlay.classList.add("hidden");
    renderModelCanvas();

    // Hide sidebar empty state
    const sidebarEmpty = document.querySelector("#sidebar .empty-state");
    if (sidebarEmpty) { sidebarEmpty.style.display = "none"; sidebarEmpty.classList.add("hidden"); }

    log(`Loaded ${fileName}`, "success");
    log(`${state.layers.length} layers · ${state.tensors.length} tensors`);
    log(`Format: ${result.format} | Size: ${formatBytes(result.size_bytes)}`);

    // Show GGUF-specific info
    if (result.format === "gguf" && result.error) {
      log(result.error, "warning");
    }

  } catch (e) {
    log(`Error loading model: ${e.message}`, "error");
    // Still set empty arrays so nothing crashes
    state.layers = state.layers || [];
    state.tensors = state.tensors || [];
    state.modelSummary = state.modelSummary || {};
    const overlayEl = document.getElementById("canvas-overlay");
    if (overlayEl) {
      overlayEl.classList.remove("hidden");
      overlayEl.innerHTML = `
        <div class="welcome-screen">
          <h2 class="welcome-title">Failed to load model</h2>
          <p class="welcome-desc">${e.message}</p>
          <button class="btn-primary" onclick="document.getElementById('canvas-overlay').classList.add('hidden')">Dismiss</button>
        </div>
      `;
    }
  }
}

// ══════════════════════════════════════════
// CANVAS RENDERING
// ══════════════════════════════════════════

function renderModelCanvas() {
  const canvas = document.getElementById("model-canvas");
  if (!canvas) return;
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

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

  // Draw nodes
  groupData.forEach((gd) => {
    gd.nodes.forEach((node) => {
      if (node.radius > 8) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      const brightness = 0.4 + (node.radius / 12) * 0.6;
      ctx.fillStyle = `rgba(229, 229, 229, ${brightness})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const mx = state.lastMouse.x, my = state.lastMouse.y;
      const dist = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2);
      if (dist < node.radius + 4) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
        ctx.lineWidth = 1.5;
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
  ctx.fillStyle = "rgba(229, 229, 229, 0.8)";
  ctx.font = 'bold 13px "SF Pro Display", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(state.model?.name || "Model Architecture", pad.left, 30);
  ctx.fillStyle = "rgba(115, 115, 115, 0.6)";
  ctx.font = '11px "SF Mono", monospace';
  ctx.fillText(`${state.layers.length} layers · ${state.modelSummary?.format_params || "?"} params`, pad.left, 48);
}

// ══════════════════════════════════════════
// HEATMAP
// ══════════════════════════════════════════

async function renderHeatmap() {
  const canvas = document.getElementById("heatmap-canvas");
  if (!canvas || !state.model) return;
  const select = document.getElementById("heatmap-layer-select");
  populateTensorSelect(select);
  const tensorName = select.value || (state.tensors.length > 0 ? state.tensors[0].name : null);
  if (!tensorName) return;

  try {
    const result = await API.rpc("weight_heatmap", { tensor_name: tensorName, size: 128 });
    if (result.error) { log(`Heatmap error: ${result.error}`, "error"); return; }
    state.heatmapData = result;
    const size = result.size;
    canvas.width = size; canvas.height = size;
    canvas.style.width = `${Math.min(512, size * 3)}px`;
    canvas.style.height = `${Math.min(512, size * 3)}px`;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < result.data.length; i++) {
      const v = Math.floor(result.data[i] * 255);
      imageData.data[i * 4] = v; imageData.data[i * 4 + 1] = v;
      imageData.data[i * 4 + 2] = v; imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const body = document.getElementById("heatmap-body");
    const existing = body.querySelector(".heatmap-label");
    if (existing) existing.remove();
    const label = document.createElement("div");
    label.className = "heatmap-label";
    label.style.cssText = "position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:10px;color:var(--text-subtle);background:var(--bg-elevated);padding:2px 8px;border:1px solid var(--border);border-radius:4px;white-space:nowrap;";
    label.textContent = `${tensorName} | min=${result.min.toFixed(4)} max=${result.max.toFixed(4)} mean=${result.mean.toFixed(4)}`;
    body.style.position = "relative";
    body.appendChild(label);
  } catch (e) { log(`Heatmap error: ${e.message}`, "error"); }
}

// ══════════════════════════════════════════
// WEIGHT EXPLORER
// ══════════════════════════════════════════

function initWeightExplorer() {
  document.getElementById("weight-layer-select")?.addEventListener("change", (e) => renderWeightList(e.target.value));
}

function updateWeightExplorer() {
  const select = document.getElementById("weight-layer-select");
  populateLayerSelect(select);
  if (state.layers.length > 0) renderWeightList(state.layers[0].name);
}

async function renderWeightList(layerName) {
  const container = document.getElementById("weight-explorer-body");
  if (!layerName) {
    container.innerHTML = '<div class="empty-state"><p class="empty-title">Select a layer</p></div>';
    return;
  }

  const layerTensors = state.tensors.filter((t) => t.name.includes(layerName));
  if (layerTensors.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="empty-title">No tensors found</p></div>';
    return;
  }

  let html = "";
  for (const tensor of layerTensors) {
    let stats = {};
    try {
      const result = await API.rpc("weight_stats", { tensor_name: tensor.name });
      if (!result.error) stats = result;
    } catch (e) {}

    html += `
      <div class="weight-item" data-tensor="${tensor.name}" onclick="selectTensor('${tensor.name}')">
        <span class="weight-name">${tensor.name.split(".").pop()}</span>
        <span class="weight-shape">[${tensor.shape.join("×")}]</span>
        <span class="weight-dtype">${tensor.dtype}</span>
        <span class="weight-size">${formatBytes(tensor.byte_count)}</span>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function selectTensor(name) {
  state.selectedTensor = name;
  const propsBody = document.getElementById("properties-body");
  try {
    const result = await API.rpc("weight_stats", { tensor_name: name });
    if (result.error) {
      propsBody.innerHTML = `<div class="prop-group"><div class="prop-group-title">${name}</div><div class="prop-row"><span class="prop-key">Error</span><span class="prop-val danger">${result.error}</span></div></div>`;
      return;
    }

    propsBody.innerHTML = `
      <div class="prop-group">
        <div class="prop-group-title">TENSOR</div>
        <div class="prop-row"><span class="prop-key">Name</span><span class="prop-val" style="font-size:10px;word-break:break-all;max-width:160px;text-align:right">${name}</span></div>
        <div class="prop-row"><span class="prop-key">Shape</span><span class="prop-val">[${result.shape.join(", ")}]</span></div>
        <div class="prop-row"><span class="prop-key">Dtype</span><span class="prop-val">${result.dtype}</span></div>
        <div class="prop-row"><span class="prop-key">Params</span><span class="prop-val">${formatParams(result.param_count)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">STATISTICS</div>
        <div class="prop-row"><span class="prop-key">Mean</span><span class="prop-val">${result.mean.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Std</span><span class="prop-val">${result.std.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Min</span><span class="prop-val">${result.min.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Max</span><span class="prop-val">${result.max.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Median</span><span class="prop-val">${result.median.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Norm</span><span class="prop-val">${result.norm.toFixed(4)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">DISTRIBUTION</div>
        <div class="prop-row"><span class="prop-key">Zeros</span><span class="prop-val">${result.num_zeros} (${result.zero_percent.toFixed(1)}%)</span></div>
        <div class="prop-row"><span class="prop-key">Negative</span><span class="prop-val">${result.num_negative}</span></div>
        <div class="prop-row"><span class="prop-key">Positive</span><span class="prop-val">${result.num_positive}</span></div>
        <div class="prop-row"><span class="prop-key">Skewness</span><span class="prop-val">${result.skewness.toFixed(4)}</span></div>
        <div class="prop-row"><span class="prop-key">Kurtosis</span><span class="prop-val">${result.kurtosis.toFixed(4)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">PERCENTILES</div>
        <div class="prop-row"><span class="prop-key">P1</span><span class="prop-val">${result.p1.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P5</span><span class="prop-val">${result.p5.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P25</span><span class="prop-val">${result.p25.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P75</span><span class="prop-val">${result.p75.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P95</span><span class="prop-val">${result.p95.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P99</span><span class="prop-val">${result.p99.toFixed(6)}</span></div>
      </div>
    `;
  } catch (e) {
    propsBody.innerHTML = `<div class="prop-group"><div class="prop-group-title">Error</div><div class="prop-row"><span class="prop-key">${e.message}</span></div></div>`;
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

  const batchSlider = document.getElementById("unlearn-batch");
  const batchVal = document.getElementById("unlearn-batch-val");
  batchSlider?.addEventListener("input", () => (batchVal.textContent = batchSlider.value));

  document.getElementById("btn-start-unlearn")?.addEventListener("click", startUnlearn);
}

function updateUnlearnButton() {
  const btn = document.getElementById("btn-start-unlearn");
  if (btn) btn.disabled = !state.model || !state.backendReady;
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
    document.getElementById("btn-start-unlearn").disabled = false;
    document.getElementById("btn-start-unlearn").innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 2.5l8 4.5-8 4.5V2.5z" fill="currentColor"/></svg>Start Unlearning`;
    if (data.status === "completed") {
      log(`Unlearning complete in ${data.elapsed}s`, "success");
      log(`Nodes erased: ${data.nodes_erased}`, "info");
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

// ══════════════════════════════════════════
// CANVAS INTERACTIONS
// ══════════════════════════════════════════

function initCanvasInteractions() {
  const canvas = document.getElementById("model-canvas");
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    state.lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (state.model) renderModelCanvas();
  });
  canvas.addEventListener("mouseleave", () => { state.lastMouse = { x: -1000, y: -1000 }; if (state.model) renderModelCanvas(); });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); state.zoom = Math.max(0.3, Math.min(3, state.zoom * (e.deltaY > 0 ? 0.95 : 1.05))); updateZoom(); });
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
    html += `<div class="tree-node tree-indent"><span class="tree-node-icon">📁</span><span class="tree-node-label">${group}</span><span class="tree-node-meta">${formatParams(totalParams)}</span></div>`;
    tensors.slice(0, 20).forEach((tensor) => {
      const shortName = tensor.name.replace(group + ".", "");
      html += `<div class="tree-node tree-indent-2" data-tensor="${tensor.name}" onclick="selectTensor('${tensor.name}')"><span class="tree-node-icon">◇</span><span class="tree-node-label">${shortName}</span><span class="tree-node-meta">${formatBytes(tensor.byte_count)}</span></div>`;
    });
    if (tensors.length > 20) html += `<div class="tree-node tree-indent-2"><span class="tree-node-label" style="color:var(--text-subtle)">... +${tensors.length - 20} more</span></div>`;
  }
  container.innerHTML = html;
}

function populateLayerSelect(select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select a layer...</option>';
  state.layers.forEach((layer) => {
    const opt = document.createElement("option");
    opt.value = layer.name;
    opt.textContent = `${layer.name} (${formatParams(layer.total_params)})`;
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

// ══════════════════════════════════════════
// PLATFORM
// ══════════════════════════════════════════

async function loadPlatform() {
  const platform = await API.getPlatform();
  const labels = { darwin: "macOS", win32: "Windows", linux: "Linux" };
  if (!state.backendReady) document.getElementById("status-platform").textContent = labels[platform] || platform;
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

function initResourceMonitor() {
  let lastIdle = 0, lastTotal = 0;
  setInterval(async () => {
    try {
      const hw = await API.getHardwareInfo();
      if (!hw) return;
      state.hardware = hw;

      const ramUsed = hw.totalRAM - hw.freeRAM;
      const ramPct = Math.round((ramUsed / hw.totalRAM) * 100);

      // CPU usage approximation from os.loadavg equivalent
      // Since we can't get real-time CPU from main process easily,
      // we'll use a heuristic based on the cpu speed info
      const cpuPct = Math.min(100, Math.max(0, Math.round((hw.cpuSpeed / 4000) * 25)));

      const cpuBar = document.getElementById("cpu-bar");
      const cpuVal = document.getElementById("cpu-val");
      const ramBar = document.getElementById("ram-bar");
      const ramVal = document.getElementById("ram-val");
      if (cpuBar) { cpuBar.style.width = `${cpuPct}%`; cpuBar.className = `resource-bar-fill${cpuPct > 80 ? " high" : ""}`; }
      if (cpuVal) cpuVal.textContent = `${cpuPct}%`;
      if (ramBar) { ramBar.style.width = `${ramPct}%`; ramBar.className = `resource-bar-fill${ramPct > 80 ? " high" : ""}`; }
      if (ramVal) ramVal.textContent = `${ramUsed}/${hw.totalRAM}GB`;
    } catch (e) {}
  }, 3000);
}

// ── Window resize ──
window.addEventListener("resize", () => {
  if (state.model) { renderModelCanvas(); if (document.getElementById("panel-heatmap")?.classList.contains("active")) renderHeatmap(); }
  renderUnlearnCanvas();
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

  document.querySelectorAll(".models-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".models-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.catalogFilter = btn.dataset.filter;
      renderModelCatalog();
    });
  });

  document.getElementById("models-search")?.addEventListener("input", () => renderModelCatalog());
  document.getElementById("btn-refresh-catalog")?.addEventListener("click", () => renderModelCatalog());
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

  list.innerHTML = filtered.map((m, i) => {
    const c = getCompatibility(m);
    const isSelected = state.selectedModel && state.selectedModel.name === m.name;
    return `
      <div class="model-card${isSelected ? " selected" : ""}" onclick="selectModelFromCatalog(${MODEL_CATALOG.indexOf(m)})">
        <div class="model-card-name">${m.name}<span class="model-card-source ${m.source}">${m.source}</span></div>
        <div class="model-card-meta"><span>${m.paramsShort}</span><span>${formatBytes(m.sizeBytes)}</span><span>${m.quant}</span><span>${m.format.toUpperCase()}</span></div>
        <div class="model-card-compat"><span class="compat-dot ${c.color}"></span><span style="color:var(--text-subtle)">${c.label}</span></div>
      </div>
    `;
  }).join("");

  if (filtered.length === 0) list.innerHTML = '<div class="empty-state"><p class="empty-title">No models found</p></div>';
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
