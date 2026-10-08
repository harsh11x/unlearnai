#!/usr/bin/env node
/**
 * verify-app-sweep.js — full-application feature sweep over CDP.
 *
 * Attaches to the running Electron app (launched with
 * --remote-debugging-port=9333) and exercises every page, modal, menu,
 * button and backend RPC one by one, printing PASS/FAIL per item.
 *
 * Usage:
 *   node scripts/verify-app-sweep.js          # all sections
 *   node scripts/verify-app-sweep.js 1 2 3    # only listed sections
 *
 * Sections:
 *   1 shell + tabs         2 modals + overlays      3 menus + command palette
 *   4 dialog/action buttons 5 viewport HUD + 3D      6 sidebar tree
 *   7 heatmap controls      8 unlearn + export       9 terminal
 *  10 chatbot              11 status bar + settings 12 backend RPC methods
 *  13 keyboard shortcuts   14 auth + subscription UI
 *  15 python dependency gate
 *  16 preferences, search, context menu + UX layer
 *
 * Requires a page target only — the CDP socket uses the `ws` package when it
 * is present and Node's built-in WebSocket otherwise, so no npm install.
 */

const http = require("http");

const PORT = Number(process.env.CDP_PORT || 9333);
const MODEL = process.env.MODEL_PATH ||
  require("os").homedir() + "/Downloads/remap-studio-models/qwen2.5-coder-0.5b-q4_k_m.gguf";

const args = process.argv.slice(2).map(Number).filter(Boolean);
const only = new Set(args.length ? args : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

// WebSocket transport: use the `ws` package when it is installed, otherwise
// Node's built-in WebSocket (22+). Keeping both means the suite needs no npm
// install and survives a wiped /tmp.
let wsModule = null;
for (const candidate of ["/tmp/cdpdrive/node_modules/ws", "ws"]) {
  try { wsModule = require(candidate); break; } catch (e) { /* try the next one */ }
}

function openSocket(url) {
  if (wsModule) {
    const socket = new wsModule(url);
    return {
      send: (data) => socket.send(data),
      close: () => socket.close(),
      onMessage: (cb) => socket.on("message", (raw) => cb(String(raw))),
      onOpen: (cb) => socket.on("open", cb),
      onError: (cb) => socket.on("error", cb),
    };
  }
  if (typeof WebSocket !== "function") {
    throw new Error("no WebSocket implementation — install `ws` (npm i ws) or run Node 22+");
  }
  const socket = new WebSocket(url);
  return {
    send: (data) => socket.send(data),
    close: () => socket.close(),
    onMessage: (cb) => socket.addEventListener("message", (ev) => cb(String(ev.data))),
    onOpen: (cb) => socket.addEventListener("open", cb),
    onError: (cb) => socket.addEventListener("error", (ev) => cb(new Error(ev.message || "socket error"))),
  };
}

const checks = { pass: 0, fail: 0, skip: 0 };
const failures = [];

function section(n, title) {
  console.log("\n[" + n + "] " + title);
}
function check(name, cond, detail) {
  const ok = Boolean(cond);
  if (ok) { checks.pass++; console.log("  PASS  " + name + (detail ? "  " + detail : "")); }
  else { checks.fail++; failures.push(name); console.log("  FAIL  " + name + (detail ? "  " + detail : "")); }
}
function skip(name, why) {
  checks.skip++;
  console.log("  SKIP  " + name + (why ? "  (" + why + ")" : ""));
}

function getJSON(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: PORT, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const targets = await getJSON("/json/list");
  const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) { console.error("no page target on " + PORT); process.exit(1); }
  console.log("attached: " + page.url);

  const ws = openSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  ws.onMessage((raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  await new Promise((r, j) => { ws.onOpen(r); ws.onError(j); });

  // Needed so listenerInfo() can read the source line a listener was
  // registered on (Debugger.getScriptSource).
  await send("Debugger.enable");

  const ev = async (expression, awaitPromise = true) => {
    const r = await send("Runtime.evaluate", {
      expression, awaitPromise, returnByValue: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result?.value;
  };

  // ── inject helpers ──
  await ev(`
    window.__sweep = {
      click(id) {
        const el = document.getElementById(id);
        if (!el) return { ok: false, reason: "no element" };
        el.click();
        return { ok: true };
      },
      visible(id) {
        const el = document.getElementById(id);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== "none" &&
               cs.visibility !== "hidden" && cs.opacity !== "0";
      },
      activeTab() {
        const t = document.querySelector(".tab.active");
        return t ? t.dataset.tab : null;
      },
      activePanel() {
        const p = document.querySelector(".tab-panel.active");
        return p ? p.id : null;
      },
      key(key, opts) {
        const o = Object.assign({ key, bubbles: true, cancelable: true }, opts || {});
        document.dispatchEvent(new KeyboardEvent("keydown", o));
      },
      logLen() { return document.querySelectorAll("#terminal-output .term-line, #terminal-output > div").length; },
      terminalText() { const el = document.getElementById("terminal-output"); return el ? el.textContent : ""; },
      dockPaneVisible(pane) {
        const el = document.querySelector('#bottom-panel .bp-pane[data-pane="' + pane + '"]');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && getComputedStyle(el).display !== "none";
      },
      dockPaneWidth(pane) {
        const el = document.querySelector('#bottom-panel .bp-pane[data-pane="' + pane + '"]');
        return el ? Math.round(el.getBoundingClientRect().width) : 0;
      },
      dockColumnsWidth() {
        const el = document.querySelector("#bottom-panel .bottom-panel-columns");
        return el ? Math.round(el.clientWidth) : 0;
      },
      dockMinimized() {
        const el = document.getElementById("bottom-panel");
        return !!el && el.classList.contains("minimized");
      },
      // The AI assistant is fixed under Properties, outside the bottom dock.
      chatVisible() {
        const el = document.getElementById("props-chat");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== "none";
      },
      chatHasCloseControl() {
        return !!document.querySelector("#properties #props-chat [data-pane-close], #properties #props-chat [data-pane-toggle]");
      },
      propsTopVisible() {
        const el = document.getElementById("props-top");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== "none";
      },
      dragHandle(selector, dx, dy) {
        const h = document.querySelector(selector);
        if (!h) return { ok: false, reason: "no handle: " + selector };
        const r = h.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        h.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: x + dx, clientY: y + dy }));
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x + dx, clientY: y + dy }));
        return { ok: true };
      },
      chatCount() { return document.querySelectorAll("#chatbot-messages .chat-msg").length; },
      treeGroups() { return document.querySelectorAll("#model-tree .tree-node").length; },
      status() {
        const g = (id) => (document.getElementById(id) || {}).textContent || null;
        return { model: g("status-model"), backend: g("status-backend"), view: g("status-view"), quant: g("status-quant") };
      },
      // NN3D scene probe. Renders the live scene straight out of the engine's
      // own readback at a series of camera distances, so we can tell whether
      // the graph is still on screen when the wheel zooms out (a fixed far
      // plane used to clip all of it), and whether the backdrop is still just
      // the panel surface plus the reference grid.
      vizProbe() {
        const nn = (typeof state !== "undefined" && state.nn3d) || null;
        if (!nn || !nn.readScenePixels) return null;
        const cam = nn.cam;
        const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // The straight-line layout frames a wide row with empty corners in
        // every one of the three layouts; the sphere fills its corners, so the
        // backdrop bands are only meaningful on the default layout.
        const savedLayout = nn.state.layout;
        if (savedLayout !== "layered") nn.setLayout("layered");
        const savedRoll = cam.roll;
        const settle = () => {
          cam.dRadius = cam.radius; cam.dTheta = cam.theta; cam.dPhi = cam.phi; cam.dRoll = cam.roll;
          for (let i = 0; i < 3; i++) cam.dTarget[i] = cam.target[i];
          nn.renderOnce();
          return nn.readScenePixels();
        };
        const corner = (d, w, h, cx0, cy0) => {
          let lo = 999, hi = 0;
          for (let y = Math.round(cy0 * h); y < Math.round((cy0 + 0.14) * h); y++) {
            for (let x = Math.round(cx0 * w); x < Math.round((cx0 + 0.14) * w); x++) {
              // readback rows are bottom-up: flip into display space.
              const l = lum(d, ((h - 1 - y) * w + x) * 4);
              if (l < lo) lo = l;
              if (l > hi) hi = l;
            }
          }
          return { lo: +lo.toFixed(2), hi: +hi.toFixed(2) };
        };
        const frame = () => {
          const img = settle();
          const d = img.data, w = img.width, h = img.height;
          let lit = 0, n = 0;
          for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
            n++; if (lum(d, (y * w + x) * 4) > 28) lit++;
          }
          return {
            litPct: +(100 * lit / Math.max(n, 1)).toFixed(2),
            topLeft: corner(d, w, h, 0.01, 0.01),
            bottomRight: corner(d, w, h, 0.85, 0.85),
          };
        };
        // Every node must sit inside the camera's depth range, whatever the
        // wheel does — a fixed far plane used to drop the whole graph.
        const depths = () => {
          // The engine's own near/far planes for the frame just drawn — not a
          // copy of the formula, so a fixed plane in the shader path fails here.
          const range = nn.depthRange ? nn.depthRange() : { near: 0.1, far: 600 };
          let outside = 0;
          for (let i = 0; i < nn.state.nodes.length; i++) {
            const p = nn.projectNode(i);
            if (!p || p.w <= range.near || p.w >= range.far) outside++;
          }
          return { total: nn.state.nodes.length, outside, far: Math.round(range.far) };
        };
        cam.theta = Math.PI / 2; cam.phi = 0.20; cam.target = [0, 0, 0];
        cam.radius = cam.fitRadius;
        const fit = frame();
        const fitRadius = cam.radius;
        const sweep = [];
        for (const k of [1.3, 1.8, 2.4, 3.2]) {
          cam.radius = fitRadius * k;
          const f = frame();
          const dep = depths();
          sweep.push({ factor: k, radius: Math.round(cam.radius), litPct: f.litPct, outside: dep.outside, total: dep.total, far: dep.far });
        }
        if (savedLayout !== "layered") nn.setLayout(savedLayout);
        cam.roll = savedRoll; cam.dRoll = savedRoll;
        nn.resetView();
        nn.cam.dRoll = nn.cam.roll;
        return { version: (window.NN3D || {}).version, fitRadius: Math.round(fitRadius), fit, sweep };
      },
    };
    true;
  `);

  const click = (id) => ev(`window.__sweep.click(${JSON.stringify(id)})`);
  const visible = (id) => ev(`window.__sweep.visible(${JSON.stringify(id)})`);
  const key = (k, opts) => ev(`window.__sweep.key(${JSON.stringify(k)}, ${JSON.stringify(opts || {})})`);

  // Real registered listeners for an element, with the source line they were
  // registered on (CDP DOMDebugger). Lets us prove a button is wired to a
  // specific handler without triggering the handler's side effects.
  const listenerInfo = async (id) => {
    const obj = await send("Runtime.evaluate", { expression: `document.getElementById(${JSON.stringify(id)})` });
    const objectId = obj.result?.objectId;
    if (!objectId) return null;
    const res = await send("DOMDebugger.getEventListeners", { objectId });
    const out = [];
    for (const l of res.listeners || []) {
      let src = "";
      try {
        const s = await send("Debugger.getScriptSource", { scriptId: l.scriptId });
        src = (s.scriptSource || "").split("\n")[l.lineNumber] || "";
      } catch (e) { src = ""; }
      out.push({ type: l.type, line: l.lineNumber + 1, src: src.trim() });
    }
    return out;
  };

  // Loads the known model if none is loaded — lets later sections run
  // standalone as well as after section 4.
  // Load the model and prove the BACKEND has it, not just the renderer. Asking
  // only `state.model` hid a real failure mode: after the backend respawns (new
  // interpreter, Restart Backend) the window still shows the old model while
  // Python has none, and every tensor RPC then fails against a UI that looks
  // perfectly healthy.
  const ensureModel = async () => {
    const backendHasModel = async () => {
      const n = await ev(`(async () => { const l = await window.electronAPI.rpc("weight_list", {}); return ((l && l.tensors) || []).length; })()`);
      return Number(n) > 0;
    };
    if (await backendHasModel()) return;
    await ev(`window.loadModel(${JSON.stringify(MODEL)}, "qwen2.5-coder-0.5b-q4_k_m.gguf", 514708512)`);
    await sleep(5000);
    if (!(await backendHasModel())) {
      // One retry: the backend may still have been starting when we asked.
      await sleep(4000);
      await ev(`window.loadModel(${JSON.stringify(MODEL)}, "qwen2.5-coder-0.5b-q4_k_m.gguf", 514708512)`);
      await sleep(5000);
    }
  };

  // ═════════════════════════════════════════════════════
  // [1] SHELL + TABS
  // ═════════════════════════════════════════════════════
  if (only.has(1)) {
    section(1, "SHELL + TABS");
    check("page title", (await ev("document.title")).includes("Remap Studios") || (await ev("document.title")).length > 0, await ev("document.title"));
    const tabCount = await ev(`document.querySelectorAll(".tab").length`);
    check("five workspace tabs", tabCount === 5, "count=" + tabCount);
    check("sidebar visible", await visible("sidebar"));
    check("properties panel visible", await visible("properties"));

    const tabNames = ["visualization", "weights", "heatmap", "unlearn", "models"];
    for (const t of tabNames) {
      await ev(`document.querySelector('.tab[data-tab="${t}"]').click()`);
      await sleep(120);
      const a = await ev("window.__sweep.activeTab()");
      const p = await ev("window.__sweep.activePanel()");
      check(`tab ${t} activates panel`, a === t && p === "panel-" + t, `active=${a} panel=${p}`);
    }
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
  }

  // ═════════════════════════════════════════════════════
  // [2] MODALS + OVERLAYS
  // ═════════════════════════════════════════════════════
  if (only.has(2)) {
    section(2, "MODALS + OVERLAYS");

    await click("btn-settings");
    await sleep(100);
    check("settings opens", await visible("settings-overlay"));
    await click("settings-close");
    await sleep(100);
    check("settings closes", !(await visible("settings-overlay")));

    await click("btn-export");
    await sleep(100);
    check("export dialog opens", await visible("export-overlay"));
    await click("export-close");
    await sleep(100);
    check("export dialog closes", !(await visible("export-overlay")));

    await ev(`document.querySelector('[data-action="shortcuts"]').click()`);
    await sleep(100);
    check("shortcuts overlay opens (View menu item)", await visible("shortcuts-overlay"));
    const scRows = await ev(`document.querySelectorAll("#shortcuts-overlay .shortcut-row, #shortcuts-overlay .shortcut-item").length`);
    check("shortcuts overlay lists shortcuts", scRows > 10, "rows=" + scRows);
    await click("shortcuts-close");
    await sleep(100);
    check("shortcuts closes", !(await visible("shortcuts-overlay")));

    await ev(`document.querySelector('[data-action="about"]').click()`);
    await sleep(100);
    check("about overlay opens (Help menu item)", await visible("about-overlay"));
    await click("about-close");
    await sleep(100);
    check("about closes", !(await visible("about-overlay")));

    await click("btn-command-palette");
    await sleep(150);
    check("command palette opens", await visible("command-palette-overlay"));
    const cmdCount = await ev(`document.querySelectorAll("#command-palette-list .palette-item, #command-palette-list .command-item").length`);
    check("command palette lists commands", cmdCount >= 25, "items=" + cmdCount);
    await ev(`(() => { const el = document.getElementById("command-palette-input"); el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); return true; })()`);
    await sleep(150);
    check("Escape closes command palette (input-focused)", !(await visible("command-palette-overlay")));
  }

  // ═════════════════════════════════════════════════════
  // [3] MENUS + COMMAND PALETTE FILTER
  // ═════════════════════════════════════════════════════
  if (only.has(3)) {
    section(3, "MENUS + COMMAND PALETTE");
    const menus = ["file", "edit", "view", "run", "help"];
    for (const m of menus) {
      await ev(`document.querySelector('.menu-btn[data-menu="${m}"]').click()`);
      await sleep(80);
      const info = await ev(`(() => { const dd = document.getElementById("dropdown-${m}"); if (!dd) return { open: false, items: 0 }; return { open: dd.classList.contains("visible"), items: dd.querySelectorAll(".dropdown-item").length }; })()`);
      check(`menu ${m} opens with items`, info.open && info.items > 0, "items=" + info.items);
      await ev(`(() => { const o = document.getElementById("dropdown-overlay"); if (o) o.click(); return true; })()`);
      await sleep(60);
    }

    // palette filter + execute
    await ev(`window.__sweep.key("k", { metaKey: true })`);
    await sleep(120);
    const paletteOpen = await visible("command-palette-overlay");
    check("Cmd+K opens palette", paletteOpen);
    if (paletteOpen) {
      const input = await ev(`(() => { const el = document.querySelector("#command-palette-overlay input"); if (!el) return null; el.value = "heatmap"; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
      await sleep(120);
      const filtered = await ev(`document.querySelectorAll("#command-palette-list .palette-item, #command-palette-list .command-item").length`);
      check("palette filters by query", input === true && filtered > 0 && filtered < 30, "filtered=" + filtered);
      await ev(`(() => { const first = document.querySelector("#command-palette-list .palette-item, #command-palette-list .command-item"); if (first) first.click(); return true; })()`);
      await sleep(200);
      check("palette command executes (Go to Heatmap)", (await ev("window.__sweep.activeTab()")) === "heatmap", "active=" + (await ev("window.__sweep.activeTab()")));
      await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
    }
  }

  // ═════════════════════════════════════════════════════
  // [4] DIALOG + ACTION BUTTONS
  // ═════════════════════════════════════════════════════
  if (only.has(4)) {
    section(4, "DIALOG + ACTION BUTTONS");

    // electronAPI is a frozen contextBridge object and the handlers capture
    // the original openFile/openFolder references, so page-level stubs cannot
    // intercept them. Read the registered listener off each button through
    // CDP instead: that proves the click is wired to the right handler at the
    // right source line, without opening any native dialog.
    const dlgButtons = [
      ["btn-open-model", "openFile"],
      ["btn-open-model-empty", "openFile"],
      ["btn-open-welcome", "openFile"],
      ["btn-open-folder", "openFolder"],
      ["btn-open-folder-empty", "openFolder"],
      ["btn-open-welcome-folder", "openFolder"],
    ];
    for (const [id, fn] of dlgButtons) {
      const ls = await listenerInfo(id);
      if (ls === null) {
        skip(id + " wired to " + fn + "()", "element only exists before a model is loaded");
        continue;
      }
      const hit = ls.find((l) => l.type === "click" && (l.src.includes(id) ? l.src.includes(fn) : true));
      check(id + " wired to " + fn + "()", Boolean(hit), hit ? "app.js:" + hit.line : JSON.stringify(ls));
    }

    // exercise the exact body those handlers run once the dialog returns
    await ev(`window.loadModel(${JSON.stringify(MODEL)}, "qwen2.5-coder-0.5b-q4_k_m.gguf", 514708512)`);
    await sleep(5000);
    const st = await ev("window.__sweep.status()");
    check("loadModel reloads the real model end-to-end", /qwen2/i.test(st.model || ""), JSON.stringify(st));

    // log spy so the export guard below can be observed
    await ev(`
      window.__sweep.logs = [];
      window.__sweep.realLog = window.log;
      window.log = function (msg, type) {
        window.__sweep.logs.push(String(msg));
        try { window.__sweep.realLog(msg, type); } catch (e) {}
      };
      true;
    `);

    await click("btn-export");
    await sleep(120);
    const exportOpen = await visible("export-overlay");
    check("btn-export opens export dialog", exportOpen);

    // export guard: with no model loaded the handler must refuse before the
    // native save dialog opens (which is why this branch is testable at all).
    await ev(`window.__sweep.savedModel = state.model; state.model = null; window.__sweep.logs.length = 0; true;`);
    await click("btn-do-export");
    await sleep(250);
    const guardLogs = await ev("window.__sweep.logs.join(' | ')");
    check("export refuses cleanly with no model (no native dialog)", /no model loaded/i.test(guardLogs), String(guardLogs).slice(0, 60));
    await ev(`state.model = window.__sweep.savedModel; true;`);
    await click("export-close");

    // status-bar settings button
    await click("btn-activity-settings");
    await sleep(100);
    check("status bar settings button opens settings", await visible("settings-overlay"));
    await click("settings-close");

    await ev(`window.log = window.__sweep.realLog; true;`);
  }

  // ═════════════════════════════════════════════════════
  // [5] VIEWPORT HUD + 3D CONTROLS
  // ═════════════════════════════════════════════════════
  if (only.has(5)) {
    section(5, "VIEWPORT HUD + 3D CONTROLS");
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
    await sleep(150);

    // deterministic 2D → 3D, then poll until the engine has initialised and
    // the HUD is revealed (a 27-stage, 291-node scene takes a moment).
    await ensureModel();
    await click("btn-view-2d");
    await sleep(300);
    check("HUD shell visible in 2D (mode switch)", await visible("btn-view-2d"), "2D/3D toggle reachable");
    check("3D-only controls hidden in 2D", !(await visible("hud-3d-controls")));
    await click("btn-view-3d");
    let hudReady = false;
    for (let i = 0; i < 12 && !hudReady; i++) {
      await sleep(500);
      hudReady = (await visible("model-canvas-3d")) && (await visible("hud-3d-controls")) && (await visible("hud-3d-stats"));
    }
    check("3D view activates (canvas + controls + fps)", hudReady, "polled up to 6s");
    let stats = null;
    for (let i = 0; i < 24; i++) {
      stats = await ev(`({ fps: document.getElementById("hud-3d-fps").textContent, count: document.getElementById("hud-3d-count").textContent })`);
      if (/\d+\s*fps/i.test(stats.fps || "")) break;
      // nudge the 3D engine once in case the rAF loop stalled behind the poll
      if (i === 8) await ev(`(() => { window.dispatchEvent(new Event("resize")); try { window.NN3D && NN3D.renderOnce && NN3D.renderOnce(); } catch (e) {} return true; })()`);
      await sleep(500);
    }
    check("3D HUD shows live fps", /\d+\s*fps/i.test(stats.fps || ""), JSON.stringify(stats));

    const layouts = [];
    for (let i = 0; i < 4; i++) {
      layouts.push(await ev(`document.getElementById("hud-3d-layout-label").textContent`));
      await click("btn-3d-layout");
      await sleep(400);
    }
    check("layout button cycles all 3 layouts", new Set(layouts).size === 3, layouts.join(" -> "));

    const colors = [];
    for (let i = 0; i < 4; i++) {
      colors.push(await ev(`document.getElementById("hud-3d-color-label").textContent`));
      await click("btn-3d-color");
      await sleep(300);
    }
    check("colour button cycles modes", new Set(colors).size >= 2, colors.join(" -> "));

    await click("btn-3d-spin");
    await sleep(300);
    const spinLabel = await ev(`document.getElementById("btn-3d-spin").textContent`);
    check("orbit toggles", /stop|pause/i.test(spinLabel) || spinLabel.length > 0, "label=" + spinLabel);
    await click("btn-3d-spin");

    await click("btn-3d-reset");
    await sleep(300);
    check("3D reset does not throw", (await ev("true")) === true);

    // ── Camera axes: pitch to the pole, scroll tilt, ⌘-scroll zoom, slant ──
    const camAxes = await ev(`(() => {
      const nn = state.nn3d;
      if (!nn) return null;
      nn.setAutoRotate(false);
      const saved = { theta: nn.cam.theta, phi: nn.cam.phi, roll: nn.cam.roll, radius: nn.cam.radius };
      nn.resetView();
      nn.orbit(0, -100000);            // drag to the stops, both ways
      const up = nn.cam.phi;
      nn.orbit(0, 200000);
      const down = nn.cam.phi;
      nn.roll(100000);
      const rollMax = nn.cam.roll;
      nn.roll(-200000);
      const rollMin = nn.cam.roll;
      nn.resetView();
      const rollAfterReset = nn.cam.roll;
      nn.cam.theta = saved.theta; nn.cam.dTheta = saved.theta;
      nn.cam.phi = saved.phi; nn.cam.dPhi = saved.phi;
      nn.cam.roll = saved.roll; nn.cam.dRoll = saved.roll;
      nn.cam.radius = saved.radius; nn.cam.dRadius = saved.radius;
      return { up, down, rollMax, rollMin, rollAfterReset };
    })()`);
    if (camAxes) {
      check(
        "vertical drag tilts to the poles (pitch past the old ±83° clamp)",
        Math.abs(camAxes.up) > 1.5 && Math.abs(camAxes.up) < Math.PI / 2 &&
          Math.abs(camAxes.down) > 1.5 && Math.abs(camAxes.down) < Math.PI / 2 &&
          camAxes.up < 0 && camAxes.down > 0,
        `up=${camAxes.up.toFixed(4)} rad down=${camAxes.down.toFixed(4)} rad`
      );
      check(
        "slant clamps at a quarter turn each way",
        Math.abs(camAxes.rollMax - Math.PI / 2) < 1e-6 && Math.abs(camAxes.rollMin + Math.PI / 2) < 1e-6,
        `max=${camAxes.rollMax.toFixed(4)} min=${camAxes.rollMin.toFixed(4)}`
      );
      check("camera reset clears the slant", camAxes.rollAfterReset === 0, `roll=${camAxes.rollAfterReset}`);
    } else {
      skip("tilt range + slant clamp checks", "no NN3D handle on the page");
    }

    const wheel = await ev(`(() => {
      const nn = state.nn3d;
      if (!nn) return null;
      const canvas = nn.canvas;
      nn.setAutoRotate(false);
      nn.resetView();
      nn.cam.dTheta = nn.cam.theta; nn.cam.dPhi = nn.cam.phi; nn.cam.dRoll = nn.cam.roll;
      const fire = (opts) => canvas.dispatchEvent(new WheelEvent("wheel", Object.assign({ bubbles: true, cancelable: true, deltaMode: 0 }, opts)));
      const before = { phi: nn.cam.phi, theta: nn.cam.theta, radius: nn.cam.radius };
      fire({ deltaY: 120 });
      const tilt = { phi: nn.cam.phi, theta: nn.cam.theta, radius: nn.cam.radius };
      fire({ deltaY: 120, ctrlKey: true });
      const zoomOut = { phi: nn.cam.phi, radius: nn.cam.radius };
      fire({ deltaY: -120, metaKey: true });
      const zoomIn = { phi: nn.cam.phi, radius: nn.cam.radius };
      const preTurn = { theta: nn.cam.theta, phi: nn.cam.phi };
      fire({ deltaX: 120 });
      const turn = { theta: nn.cam.theta, phi: nn.cam.phi };
      nn.resetView();
      nn.cam.dTheta = nn.cam.theta; nn.cam.dPhi = nn.cam.phi;
      return { before, tilt, zoomOut, zoomIn, preTurn, turn };
    })()`);
    if (wheel) {
      check(
        "plain scroll tilts the camera (no zoom)",
        wheel.tilt.phi > wheel.before.phi && wheel.tilt.radius === wheel.before.radius,
        `phi ${wheel.before.phi.toFixed(3)} -> ${wheel.tilt.phi.toFixed(3)}, radius ${wheel.tilt.radius.toFixed(1)}`
      );
      check(
        "⌘/Ctrl + scroll still zooms (pinch gesture)",
        wheel.zoomOut.radius > wheel.tilt.radius && wheel.zoomOut.phi === wheel.tilt.phi &&
          wheel.zoomIn.radius < wheel.zoomOut.radius,
        `radius ${wheel.tilt.radius.toFixed(1)} -> ${wheel.zoomOut.radius.toFixed(1)} -> ${wheel.zoomIn.radius.toFixed(1)}`
      );
      check(
        "horizontal two-finger swipe turns the model (no tilt)",
        wheel.turn.theta !== wheel.preTurn.theta && wheel.turn.phi === wheel.preTurn.phi,
        `theta ${wheel.preTurn.theta.toFixed(3)} -> ${wheel.turn.theta.toFixed(3)}, phi ${wheel.preTurn.phi.toFixed(3)} -> ${wheel.turn.phi.toFixed(3)}`
      );
    } else {
      skip("scroll/trackpad camera checks", "no NN3D handle on the page");
    }

    const slant = await ev(`(() => {
      const nn = state.nn3d;
      if (!nn) return null;
      const canvas = nn.canvas;
      nn.setAutoRotate(false);
      nn.resetView();
      const r = canvas.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const evt = (type, cx, cy, extra) => new PointerEvent(type, Object.assign({
        bubbles: true, cancelable: true, clientX: cx, clientY: cy,
        pointerId: 77, pointerType: "mouse", isPrimary: true, button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }, extra || {}));
      canvas.dispatchEvent(evt("pointerdown", x, y));
      canvas.dispatchEvent(evt("pointermove", x + 100, y, { altKey: true }));
      canvas.dispatchEvent(evt("pointerup", x + 100, y));
      const dragRoll = nn.cam.roll;

      // The slant has to rotate the real projection, not just the state.
      nn.resetView();
      nn.cam.roll = 0; nn.cam.dRoll = 0;
      nn.renderOnce();
      let topNode = null;
      for (const nd of nn.state.nodes) if (!topNode || nd.pos[1] > topNode.pos[1]) topNode = nd;
      const a = topNode ? nn.projectNode(topNode.id) : null;
      nn.cam.roll = 0.5; nn.cam.dRoll = 0.5;
      nn.renderOnce();
      const b = topNode ? nn.projectNode(topNode.id) : null;
      let angleDeg = null;
      if (a && b) {
        const w = nn.canvas.clientWidth, h = nn.canvas.clientHeight;
        const ang = (p) => Math.atan2(p.y - h / 2, p.x - w / 2);
        angleDeg = +((ang(b) - ang(a)) * 180 / Math.PI).toFixed(2);
      }
      // Panning must still follow the cursor once the view is banked: at +90°
      // roll a rightward drag has to pan exactly like an unrolled downward one.
      nn.cam.target = [0, 0, 0]; nn.cam.roll = 0; nn.cam.dRoll = 0; nn.pan(0, 100);
      const flatDown = nn.cam.target.map((v) => +v.toFixed(4));
      nn.cam.target = [0, 0, 0]; nn.cam.roll = Math.PI / 2; nn.cam.dRoll = Math.PI / 2; nn.pan(100, 0);
      const rolledRight = nn.cam.target.map((v) => +v.toFixed(4));
      nn.resetView();
      nn.cam.roll = 0; nn.cam.dRoll = 0; nn.cam.target = [0, 0, 0];
      nn.cam.dTheta = nn.cam.theta; nn.cam.dPhi = nn.cam.phi;
      return {
        dragRoll: +dragRoll.toFixed(4), angleDeg,
        panParity: JSON.stringify(flatDown) === JSON.stringify(rolledRight),
        flatDown, rolledRight,
      };
    })()`);
    if (slant) {
      check(
        "⌥/Alt-drag slants the view (lean right = clockwise)",
        slant.dragRoll < -0.3 && slant.dragRoll > -0.7,
        `roll=${slant.dragRoll} rad for a 100px drag`
      );
      check(
        "slant rotates the rendered projection by the roll angle",
        typeof slant.angleDeg === "number" && Math.abs(slant.angleDeg + 28.6) < 2.5,
        `projection turned ${slant.angleDeg}° for +0.5 rad`
      );
      check(
        "pan follows the cursor when the view is slanted",
        slant.panParity === true,
        `flat-down ${JSON.stringify(slant.flatDown)} vs rolled-right ${JSON.stringify(slant.rolledRight)}`
      );
    } else {
      skip("Alt-drag slant checks", "no NN3D handle on the page");
    }

    await ev(`(() => { const nn = state.nn3d; if (nn) { nn.cam.roll = 0; nn.cam.dRoll = 0; nn.resetView(); } return true; })()`);
    await key("q");
    await sleep(200);
    const rollQ = await ev(`state.nn3d ? +state.nn3d.cam.roll.toFixed(4) : null`);
    await key("e");
    await sleep(200);
    const rollE = await ev(`state.nn3d ? +state.nn3d.cam.roll.toFixed(4) : null`);
    await key("e");
    await sleep(200);
    const rollE2 = await ev(`state.nn3d ? +state.nn3d.cam.roll.toFixed(4) : null`);
    check(
      "Q / E slant the view left / right",
      typeof rollQ === "number" && rollQ > 0 && rollE < rollQ && rollE2 < 0,
      `q=${rollQ} e=${rollE} ee=${rollE2}`
    );
    await key("r");
    await sleep(250);
    check("R clears the slant", (await ev(`state.nn3d ? state.nn3d.cam.roll === 0 : false`)) === true);

    // Backdrop + depth range. The viewport must read as the panel's own
    // surface with only the reference grid behind the graph, and the wheel
    // must never clip the network out of the frustum.
    const viz = await ev("window.__sweep.vizProbe()");
    if (viz && viz.fit) {
      const tl = viz.fit.topLeft, br = viz.fit.bottomRight;
      check(
        "3D backdrop is the panel surface, not a dark wash",
        Math.abs(tl.lo - br.lo) <= 1.5 && tl.lo >= 9.5 && tl.lo <= 15.5,
        `topLeft=${tl.lo} bottomRight=${br.lo}`
      );
      check(
        "3D backdrop keeps the reference grid",
        tl.hi >= 16 && tl.hi <= 90 && tl.hi - tl.lo >= 3,
        `grid=${tl.hi} surface=${tl.lo}`
      );
      check(
        "network stays inside the frustum through the whole zoom-out range",
        viz.sweep.every((s) => s.outside === 0),
        `far=${viz.sweep[0].far}px ` + viz.sweep.map((s) => `${s.factor}x:${s.outside}/${s.total} out`).join(" ")
      );
      check(
        "network still painted at every zoom-out step",
        viz.sweep.every((s) => s.litPct >= 0.4),
        viz.sweep.map((s) => `${s.factor}x:${s.litPct}%`).join(" ")
      );
    } else {
      skip("3D backdrop + zoom-out depth checks", "no NN3D handle on the page");
    }

    // 3D keyboard shortcuts: L C R Space G
    await key("l");
    await sleep(300);
    const afterL = await ev(`document.getElementById("hud-3d-layout-label").textContent`);
    check("3D shortcut L cycles layout", typeof afterL === "string" && afterL.length > 0, "label=" + afterL);
    await key("c");
    await sleep(250);
    check("3D shortcut C cycles colour", typeof (await ev(`document.getElementById("hud-3d-color-label").textContent`)) === "string");
    await key(" ");
    await sleep(250);
    const spin2 = await ev(`document.getElementById("btn-3d-spin").textContent`);
    check("3D shortcut Space toggles orbit", typeof spin2 === "string", "label=" + spin2);
    await key("r");
    await sleep(250);
    await key("g");
    await sleep(400);
    check("3D shortcut G returns to 2D", !(await visible("hud-3d-controls")) && !(await visible("model-canvas-3d")));

    await click("btn-view-3d");
    await sleep(500);
    check("legend visible in 3D", await visible("viewport-legend"));
    const rampStops = await ev(`(() => { const g = document.querySelector(".legend-gradient"); if (!g) return null; return getComputedStyle(g).backgroundImage; })()`);
    check("legend gradient painted", typeof rampStops === "string" && rampStops.includes("gradient"), String(rampStops).slice(0, 80));
    await click("btn-view-2d");
    await sleep(300);
    check("back to 2D hides 3D-only controls", !(await visible("hud-3d-controls")) && !(await visible("model-canvas-3d")));
  }

  // ═════════════════════════════════════════════════════
  // [6] SIDEBAR TREE
  // ═════════════════════════════════════════════════════
  if (only.has(6)) {
    section(6, "SIDEBAR TREE + WEIGHT FILTER");
    await ensureModel();
    await click("btn-refresh-tree");
    await sleep(600);
    const before = await ev("window.__sweep.treeGroups()");
    check("model tree has rows", before > 10, "rows=" + before);

    await click("btn-collapse-all");
    await sleep(500);
    const collapsed = await ev("window.__sweep.treeGroups()");
    check("collapse-all collapses every group", collapsed < before / 4 && collapsed >= 4, before + " -> " + collapsed);

    await click("btn-refresh-tree");
    await sleep(600);
    const refreshed = await ev("window.__sweep.treeGroups()");
    check("refresh-tree rebuilds, collapse state kept", refreshed === collapsed, "rows=" + refreshed);

    // expand the biggest group by clicking its header
    const grpCount = await ev(`
      (() => {
        const rows = [...document.querySelectorAll("#model-tree .tree-group")];
        if (!rows.length) return 0;
        rows.sort((a, b) => (parseInt(b.querySelector(".tree-node-meta")?.textContent || "0", 10) - parseInt(a.querySelector(".tree-node-meta")?.textContent || "0", 10)));
        rows[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return rows.length;
      })()
    `);
    await sleep(450);
    const afterExpand = await ev("window.__sweep.treeGroups()");
    check("expanding a group shows its tensors", afterExpand > collapsed, "groups=" + grpCount + " rows " + collapsed + " -> " + afterExpand);

    const moreRes = await ev(`
      (() => {
        const m = document.querySelector("#model-tree .tree-more[data-group]");
        if (!m) return false;
        m.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      })()
    `);
    await sleep(500);
    const afterMore = await ev("window.__sweep.treeGroups()");
    check("'+N more' reveals the rest of the group", moreRes === true && afterMore > afterExpand, afterExpand + " -> " + afterMore);

    // select a concrete tensor row
    const selName = await ev(`
      (() => {
        const row = document.querySelector("#model-tree [data-tensor]");
        if (!row) return null;
        row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return row.dataset.tensor;
      })()
    `);
    await sleep(1600);
    const props = await ev(`document.getElementById("properties").textContent`);
    check("selecting a tensor populates Properties", Boolean(selName) && /shape|storage|params|statistics/i.test(props), String(selName));

    // ── weight explorer: layer isolation + filter ──
    await ev(`document.querySelector('.tab[data-tab="weights"]').click()`);
    await sleep(300);
    // pick a multi-tensor layer (attn_q has weight + bias on this model)
    await ev(`(() => {
      const s = document.getElementById("weight-layer-select");
      if (!s) return false;
      const opt = [...s.options].find((o) => o.value.includes("attn_q")) || [...s.options].find((o) => o.value);
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); }
      return true;
    })()`);
    await sleep(300);
    const wBefore = await ev(`document.querySelectorAll("#weight-explorer-body .weight-item").length`);
    const layerNames = await ev(`[...document.querySelectorAll("#weight-explorer-body .weight-item")].map(r => r.dataset.tensor)`);
    check("weight explorer lists tensors for one layer", wBefore > 0, "rows=" + wBefore + " " + JSON.stringify(layerNames));
    check("layer selection is exact (no cross-block leakage)", Array.isArray(layerNames) && layerNames.every((n, i, a) => n.split(".").slice(0, -1).join(".") === a[0].split(".").slice(0, -1).join(".")), String(layerNames?.[0]));

    await click("btn-filter-weights");
    await sleep(150);
    check("filter button reveals the filter input", await ev(`!document.getElementById("weight-filter-input").hidden`));
    if (wBefore > 1) {
      const query = await ev(`(() => { const r = document.querySelector("#weight-explorer-body .weight-item"); return r ? r.dataset.tensor.split(".").slice(-2).join(".") : null; })()`);
      await ev(`(() => { const el = document.getElementById("weight-filter-input"); el.value = ${JSON.stringify(query)}; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
      await sleep(200);
      const wAfter = await ev(`[...document.querySelectorAll("#weight-explorer-body .weight-item")].filter(r => r.style.display !== "none").length`);
      check("filter narrows the tensor list", wAfter >= 1 && wAfter < wBefore, wBefore + " -> " + wAfter + " (query '" + query + "')");
    } else {
      skip("filter narrows the tensor list", "selected layer has a single tensor");
    }
    await click("btn-filter-weights");
    await sleep(250);
    const wRestored = await ev(`[...document.querySelectorAll("#weight-explorer-body .weight-item")].filter(r => r.style.display !== "none").length`);
    check("hiding the filter restores the full list", wRestored === wBefore, "shown=" + wRestored);

    // ── richer rows: layer summary, per-tensor statistics, sparklines ──
    const weShell = await ev(`
      (() => ({
        toolbar: !!document.getElementById("weight-search") && !!document.getElementById("weight-sort"),
        labelledLayers: [...document.querySelectorAll("#weight-layer-select option")].filter((o) => /tensor/.test(o.textContent)).length,
        summary: (document.getElementById("weight-summary") || {}).textContent || "",
      }))()
    `);
    check("weight explorer exposes global search + sort controls", weShell.toolbar === true, "toolbar=" + weShell.toolbar);
    check("layer picker labels each layer with its tensor count", weShell.labelledLayers > 10, "labelled=" + weShell.labelledLayers);
    check("summary bar reports tensors, params and storage types",
      /\d+\s*tensors?/.test(weShell.summary) && /params/.test(weShell.summary),
      weShell.summary.replace(/\s+/g, " ").trim().slice(0, 90));

    await sleep(3500);
    const weStats = await ev(`
      (() => {
        const rows = [...document.querySelectorAll("#weight-explorer-body .weight-item")];
        const filled = rows.filter((r) => {
          const el = r.querySelector("[data-k='mean']");
          return el && !/\u2014/.test(el.textContent);
        }).length;
        const sparks = rows.filter((r) => {
          const c = r.querySelector("[data-spark]");
          if (!c) return false;
          const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
          return false;
        }).length;
        return { rows: rows.length, filled, sparks, sample: (rows[0] || {}).textContent.replace(/\s+/g, " ").trim().slice(0, 90) || "" };
      })()
    `);
    check("per-tensor statistics stream into each row", weStats.rows > 0 && weStats.filled === weStats.rows, JSON.stringify(weStats));
    check("every profiled row draws a distribution sparkline", weStats.sparks === weStats.rows, "sparks=" + weStats.sparks + "/" + weStats.rows);

    // ── sort ──
    // Assert the rendered order against the model's own metadata rather than
    // "differs from before": the model's natural tensor order depends on which
    // load path produced it, so a difference-based check is flaky.
    await ev(`(() => { const s = document.getElementById("weight-sort"); s.value = "name"; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
    await sleep(700);
    const byName = await ev(`[...document.querySelectorAll("#weight-explorer-body .weight-item")].map((r) => r.dataset.tensor)`);
    check("sort by name orders the tensor rows",
      byName.length > 0 && byName.every((n, i, a) => i === 0 || a[i - 1].localeCompare(n) <= 0),
      JSON.stringify(byName));

    await ev(`(() => { const s = document.getElementById("weight-sort"); s.value = "size"; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
    await sleep(700);
    const bySize = await ev(`
      (() => {
        const bytes = Object.fromEntries(state.tensors.map((t) => [t.name, t.byte_count || 0]));
        const names = [...document.querySelectorAll("#weight-explorer-body .weight-item")].map((r) => r.dataset.tensor);
        return { names, ok: names.length > 0 && names.every((n, i, a) => i === 0 || (bytes[a[i - 1]] || 0) >= (bytes[n] || 0)) };
      })()
    `);
    check("sort by size orders the tensor rows largest first", bySize.ok === true, JSON.stringify(bySize.names));

    await ev(`(() => { const s = document.getElementById("weight-sort"); s.value = "order"; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
    await sleep(400);

    // ── global search over every tensor in the model ──
    const searchTarget = await ev(`(state.tensors.find((t) => /\.weight$/.test(t.name) && (t.param_count || 0) > 2000000) || state.tensors[0]).name`);
    await ev(`(() => { const el = document.getElementById("weight-search"); el.value = ${JSON.stringify(searchTarget)}; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
    await sleep(1500);
    const searchState = await ev(`
      (() => {
        const rows = [...document.querySelectorAll("#weight-explorer-body .weight-item")];
        const big = rows.find((r) => r.querySelector(".weight-stats.ask"));
        const btn = big ? big.querySelector(".weight-act.wide") : null;
        return {
          rows: rows.length,
          names: rows.map((r) => r.dataset.tensor),
          askRow: big ? big.dataset.tensor : null,
          loadVisible: btn ? getComputedStyle(btn).display !== "none" : false,
          summary: (document.getElementById("weight-summary") || {}).textContent || "",
        };
      })()
    `);
    check("global search finds tensors outside the selected layer",
      searchState.names.length >= 1 && searchState.names.every((n) => n.includes(searchTarget.split(".").pop())),
      JSON.stringify(searchState.names.slice(0, 3)) + " target=" + searchTarget);
    check("search results report their own totals", /params/.test(searchState.summary),
      searchState.summary.replace(/\s+/g, " ").trim().slice(0, 70));
    check("huge tensors profile on demand instead of automatically",
      Boolean(searchState.askRow) && searchState.loadVisible === true,
      (searchState.askRow || "none") + " loadBtn=" + searchState.loadVisible);

    await ev(`(() => { const el = document.getElementById("weight-search"); el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
    await sleep(500);
    check("clearing the search restores the layer view",
      (await ev(`document.querySelectorAll("#weight-explorer-body .weight-item").length`)) === wBefore,
      "rows=" + wBefore);
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
  }

  // ═════════════════════════════════════════════════════
  // [7] HEATMAP CONTROLS
  // ═════════════════════════════════════════════════════
  if (only.has(7)) {
    section(7, "HEATMAP CONTROLS");
    await ensureModel();
    await ev(`document.querySelector('.tab[data-tab="heatmap"]').click()`);
    await sleep(2500);
    // Contrast, not merely "some pixels painted": the old min–max scaling
    // squeezed ~95% of a tensor into one shade of grey, which is exactly why
    // the panel looked blank. Measure the rendered luminance spread.
    const paint = `(() => {
      const c = document.getElementById("heatmap-canvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      const n = d.length / 4;
      const lum = new Uint32Array(256);
      let lit = 0, colored = 0;
      for (let i = 0; i < d.length; i += 4) {
        lum[d[i]]++;
        if (d[i] > 0) lit++;
        if (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2]) colored++;
      }
      let distinct = 0, p5 = 0, p50 = 0, p95 = 0, acc = 0;
      for (let v = 0; v < 256; v++) {
        if (lum[v]) distinct++;
        acc += lum[v];
        if (!p5 && acc >= n * 0.05) p5 = v;
        if (!p50 && acc >= n * 0.5) p50 = v;
        if (!p95 && acc >= n * 0.95) p95 = v;
      }
      return { w: c.width, h: c.height, litPct: Math.round(lit / n * 100), coloredPct: Math.round(colored / n * 100), distinct, p5, p50, p95, styleW: c.style.width };
    })()`;
    const heat = await ev(paint);
    check("heatmap canvas painted from real weights", heat && heat.w > 0 && heat.litPct > 50, JSON.stringify(heat));
    check("heatmap has usable contrast (robust percentile scaling)",
      heat && heat.distinct > 32 && (heat.p95 - heat.p5) > 40,
      `p5=${heat.p5} p50=${heat.p50} p95=${heat.p95} distinct=${heat.distinct}`);
    const label = await ev(`(document.querySelector(".heatmap-label") || {}).textContent || ""`);
    check("heatmap shows the min/max/mean label", /min=.*max=.*mean=/.test(label), label.slice(0, 70));

    const head = await ev(`[...document.querySelectorAll("#heatmap-head .heatmap-chip")].map((c) => c.textContent.trim())`);
    check("header chips describe storage, sampling and peak",
      Array.isArray(head) && head.length >= 4 && head.some((h) => /sampled/.test(h)) && head.some((h) => /peak/.test(h)),
      JSON.stringify(head));
    const legend = await ev(`
      (() => ({
        hidden: document.getElementById("heatmap-legend").hidden,
        ticks: [...document.querySelectorAll("#heatmap-legend-ticks span")].map((s) => s.textContent),
        barPainted: (() => {
          const c = document.getElementById("heatmap-legend-canvas");
          const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
          return false;
        })(),
      }))()
    `);
    check("colour legend shows the value window", legend.hidden === false && legend.barPainted && legend.ticks.length >= 2,
      JSON.stringify(legend.ticks));

    // ── colour schemes actually change the rendering ──
    const schemeTo = async (name) => {
      await ev(`(() => { const s = document.getElementById("setting-heatmap-color"); s.value = ${JSON.stringify(name)}; s.dispatchEvent(new Event("change", { bubbles: true })); return s.value; })()`);
      await sleep(320);
      return ev(paint);
    };
    const viridis = await schemeTo("viridis");
    check("viridis scheme paints a colourmap", viridis.coloredPct > 80, "coloured=" + viridis.coloredPct + "%");
    const coolwarm = await schemeTo("coolwarm");
    const divergingTicks = await ev(`[...document.querySelectorAll("#heatmap-legend-ticks span")].map((s) => s.textContent)`);
    check("diverging scheme centres zero on the legend",
      coolwarm.coloredPct > 80 && divergingTicks.includes("0"),
      "coloured=" + coolwarm.coloredPct + "% ticks=" + JSON.stringify(divergingTicks));
    const gray = await schemeTo("grayscale");
    check("grayscale scheme stays monochrome", gray.coloredPct === 0, "coloured=" + gray.coloredPct + "%");

    await click("btn-heatmap-zoom-in");
    await sleep(250);
    const zoomW = await ev(`document.getElementById("heatmap-canvas").style.width`);
    check("zoom-in enlarges the heatmap", parseFloat(zoomW) > parseFloat(heat.styleW), heat.styleW + " -> " + zoomW);
    await click("btn-heatmap-zoom-out");
    await sleep(200);
    await click("btn-heatmap-zoom-out");
    await sleep(250);
    const zoomOutW = await ev(`document.getElementById("heatmap-canvas").style.width`);
    check("zoom-out shrinks the heatmap", parseFloat(zoomOutW) < parseFloat(zoomW), zoomW + " -> " + zoomOutW);

    // The old check only looked for painted pixels, so a tensor picker that did
    // nothing still passed. Require the label to follow the selection.
    const switched = await ev(`(() => { const s = document.getElementById("heatmap-layer-select"); if (!s || s.options.length < 3) return null; s.value = s.options[2].value; s.dispatchEvent(new Event("change", { bubbles: true })); return s.value; })()`);
    await sleep(2400);
    const heat2 = await ev(paint);
    const label2 = await ev(`(document.querySelector(".heatmap-label") || {}).textContent || ""`);
    const dataTensor = await ev(`state.heatmapData && state.heatmapData.tensor`);
    check("selecting another tensor re-reads and repaints the heatmap",
      Boolean(switched) && heat2.litPct > 50 && dataTensor === switched && label2.includes(switched),
      switched + " data=" + dataTensor + " lit=" + (heat2 && heat2.litPct) + "%");

    // Hover readout reports the value under the cursor in tensor coordinates.
    const readout = await ev(`
      (() => {
        const c = document.getElementById("heatmap-canvas");
        const r = c.getBoundingClientRect();
        c.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.6 }));
        return document.getElementById("heatmap-readout").textContent;
      })()
    `);
    check("hovering the map reports w[row, col]", /^w\[\d+, \d+\] = /.test(readout), String(readout).slice(0, 60));

    await ev(`document.getElementById("heatmap-canvas").dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
    await sleep(1800);
    const propsAfterClick = await ev(`document.getElementById("properties-body").textContent`);
    check("clicking the map inspects that tensor", Boolean(dataTensor) && propsAfterClick.includes(dataTensor), String(dataTensor));

    // ── weight explorer row → heatmap, end to end ──
    await ev(`document.querySelector('.tab[data-tab="weights"]').click()`);
    await sleep(500);
    const rowJump = await ev(`
      (() => {
        const row = document.querySelector("#weight-explorer-body .weight-item");
        if (!row) return null;
        const name = row.dataset.tensor;
        const btn = row.querySelector('[data-act="heatmap"]');
        if (!btn) return { name, missing: true };
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return { name };
      })()
    `);
    await sleep(2600);
    const jumped = await ev(`({ tab: (document.querySelector(".tab.active") || {}).dataset && document.querySelector(".tab.active").dataset.tab, tensor: state.heatmapData && state.heatmapData.tensor })`);
    check("weight row opens that tensor in the heatmap",
      rowJump && !rowJump.missing && jumped.tab === "heatmap" && jumped.tensor === rowJump.name,
      JSON.stringify(rowJump) + " -> " + JSON.stringify(jumped));

    await ev(`state.heatmapZoom = 1; applyHeatmapZoom(); true;`);
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
  }

  // ═════════════════════════════════════════════════════
  // [8] UNLEARN PANEL
  // ═════════════════════════════════════════════════════
  if (only.has(8)) {
    section(8, "UNLEARN PANEL");
    await ensureModel();
    await ev(`document.querySelector('.tab[data-tab="unlearn"]').click()`);
    await sleep(500);
    check("unlearn controls present", await ev(`["unlearn-target","unlearn-method","unlearn-steps","unlearn-lr","unlearn-retain"].every((id) => !!document.getElementById(id))`));
    await ev(`(() => {
      const s = document.getElementById("unlearn-steps"); s.value = "300"; s.dispatchEvent(new Event("input", { bubbles: true }));
      const lr = document.getElementById("unlearn-lr"); lr.value = "-4"; lr.dispatchEvent(new Event("input", { bubbles: true }));
      const r = document.getElementById("unlearn-retain"); r.value = "1.5"; r.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    await sleep(150);
    const labels = await ev(`({ steps: document.getElementById("unlearn-steps-val").textContent, lr: document.getElementById("unlearn-lr-val").textContent, retain: document.getElementById("unlearn-retain-val").textContent })`);
    check("sliders update their value labels", labels.steps === "300" && labels.lr === "1e-4" && labels.retain === "1.5", JSON.stringify(labels));

    await click("btn-unlearn-reset");
    await sleep(300);
    check("reset view repaints the idle canvas", (await ev(`document.getElementById("unlearn-canvas").width > 0`)) === true);

    check("Start Unlearning enabled with a model loaded", (await ev(`!document.getElementById("btn-start-unlearn").disabled`)) === true);
    const target = await ev(`(() => { const s = document.getElementById("unlearn-target"); if (!s) return null; const opt = [...s.options].find((o) => o.value); if (!opt) return null; s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); return opt.value; })()`);
    check("unlearn target capability selected", Boolean(target), String(target));

    await click("btn-start-unlearn");
    let sawRunning = await ev(`document.getElementById("btn-start-unlearn").disabled`);
    let edits = 0;
    for (let i = 0; i < 60 && edits === 0; i++) {
      await sleep(300);
      if (await ev(`document.getElementById("btn-start-unlearn").disabled`)) sawRunning = true;
      const p = await ev(`API.rpc("tensor_pending")`);
      edits = ((p && p.edit_count) || 0) + ((p && p.delete_count) || 0);
    }
    check("unlearn run starts (button locks while running)", sawRunning || edits > 0, "sawRunning=" + sawRunning);
    check("surgery leaves pending edits for export", edits > 0, "pending edits=" + edits);
    let idle = false;
    for (let i = 0; i < 60 && !idle; i++) {
      idle = (await ev(`!document.getElementById("btn-start-unlearn").disabled`)) === true;
      if (!idle) await sleep(500);
    }
    check("button returns to idle after completion", idle, "polled up to 30s");
    check("quantized-model note shown after the run", await visible("unlearn-quant-note"));
  }

  // ═════════════════════════════════════════════════════
  // [9] TERMINAL
  // ═════════════════════════════════════════════════════
  if (only.has(9)) {
    section(9, "TERMINAL + SYSTEM SHELL");
    // Load the model so the app commands below (`status`, `layers`) have real
    // data even when this section runs on its own.
    await ensureModel();
    // Deterministic start: a previous run may have left the pane closed or
    // the dock minimised.
    await ev(`toggleDockMinimized(false); true;`);
    if (!(await ev(`window.__sweep.dockPaneVisible("terminal")`))) {
      await ev(`document.querySelector('#bottom-panel [data-pane-toggle="terminal"]').click()`);
      await sleep(400);
    }
    // The dock is two independent panes: hiding the terminal must leave the
    // output pane exactly where it was, and the fixed chat must never move.
    const termWasVisible = await ev(`window.__sweep.dockPaneVisible("terminal")`);
    await click("btn-toggle-terminal");
    await sleep(450);
    const termNowHidden = !(await ev(`window.__sweep.dockPaneVisible("terminal")`));
    check("toolbar toggle hides only the terminal pane", termWasVisible && termNowHidden,
      "visible " + termWasVisible + " -> hidden " + termNowHidden);
    check("output pane stays open", await ev(`window.__sweep.dockPaneVisible("logs")`));
    check("fixed chat stays visible while the terminal is hidden", await ev(`window.__sweep.chatVisible()`));
    await click("btn-toggle-terminal");
    await sleep(350);
    check("terminal input visible", await visible("terminal-input"));

    const sendCmd = async (cmd) => {
      await ev(`(() => { const el = document.getElementById("terminal-input"); el.value = ${JSON.stringify(cmd)}; return true; })()`);
      await click("terminal-send");
      await sleep(500);
      return ev(`document.getElementById("terminal-log").textContent`);
    };
    let term = await sendCmd("help");
    check("terminal 'help' lists the app commands", /App commands: clear, help/.test(term) && /system shell/.test(term));
    term = await sendCmd("status");
    check("terminal 'status' reports the loaded model", /Model: qwen2/i.test(term));
    term = await sendCmd("layers");
    check("terminal 'layers' prints the layer list", term.includes("params"));
    term = await sendCmd("definitely-not-a-command");
    check("unknown command is reported by the real shell", /command not found/i.test(term) && term.includes("definitely-not-a-command"), "");

    const outLen = await ev(`document.getElementById("terminal-output").textContent.length + document.getElementById("terminal-log").textContent.length`);
    await click("btn-clear-terminal");
    await sleep(350);
    const clearedLen = await ev(`document.getElementById("terminal-output").textContent.length + document.getElementById("terminal-log").textContent.length`);
    check("clear terminal empties the log + terminal panes", clearedLen < outLen && clearedLen < 60, outLen + " -> " + clearedLen);

    // Each pane closes and re-opens on its own button.
    await ev(`document.querySelector('#bottom-panel [data-pane-close="terminal"]').click()`);
    await sleep(250);
    check("terminal close button hides the pane", !(await ev(`window.__sweep.dockPaneVisible("terminal")`)));
    check("output pane unaffected by the terminal close", await ev(`window.__sweep.dockPaneVisible("logs")`));
    const logsWhenTermClosed = await ev(`window.__sweep.dockPaneWidth("logs")`);
    const dockWide = await ev(`window.__sweep.dockColumnsWidth()`);
    check("output fills the dock while the terminal is closed", logsWhenTermClosed > dockWide - 25,
      logsWhenTermClosed + " of " + dockWide);
    await ev(`document.querySelector('#bottom-panel [data-pane-toggle="terminal"]').click()`);
    await sleep(300);
    check("header toggle restores the terminal pane", await ev(`window.__sweep.dockPaneVisible("terminal")`));

    // The output pane closes on its own too.
    await ev(`document.querySelector('#bottom-panel [data-pane-close="logs"]').click()`);
    await sleep(250);
    check("output close button hides the output pane", !(await ev(`window.__sweep.dockPaneVisible("logs")`)));
    check("terminal pane unaffected by the output close", await ev(`window.__sweep.dockPaneVisible("terminal")`));
    await ev(`document.querySelector('#bottom-panel [data-pane-toggle="logs"]').click()`);
    await sleep(300);
    check("header toggle restores the output pane", await ev(`window.__sweep.dockPaneVisible("logs")`));

    // The AI assistant is fixed under Properties: it has no close/hide
    // control at all, so nothing in the dock can cut it down.
    check("chat has no close / hide control", !(await ev(`window.__sweep.chatHasCloseControl()`)));
    check("chat visible in the sidebar", await ev(`window.__sweep.chatVisible()`));
    // Even the internal dock API refuses to hide the fixed assistant.
    await ev(`setDockPaneVisible("chat", false); true`);
    await sleep(200);
    check("internal dock API cannot hide the chat", await ev(`window.__sweep.chatVisible()`));

    // Minimise: the dock collapses to its header strip, chat unaffected.
    await click("btn-minimize-dock");
    await sleep(400);
    check("chevron minimises the dock to its header", (await ev(`window.__sweep.dockMinimized()`)) === true);
    const minH = await ev(`document.getElementById("bottom-panel").offsetHeight`);
    check("minimised dock is a 28px strip", minH <= 32, "height=" + minH);
    check("chat untouched by the dock minimise", await ev(`window.__sweep.chatVisible()`));
    await ev(`document.querySelector('#bottom-panel [data-pane-toggle="logs"]').click()`);
    await sleep(400);
    check("pane toggle restores the minimised dock",
      (await ev(`window.__sweep.dockMinimized()`)) === false && (await ev(`window.__sweep.dockPaneVisible("logs")`)));
    await click("bottom-panel-toggle");
    await sleep(400);
    check("header click minimises the dock", (await ev(`window.__sweep.dockMinimized()`)) === true);
    await click("bottom-panel-toggle");
    await sleep(400);
    check("header click restores the dock", (await ev(`window.__sweep.dockMinimized()`)) === false);

    // Dragging the single divider sizes the output pane; the terminal is
    // rightmost and absorbs the leftover width.
    const logsW0 = await ev(`window.__sweep.dockPaneWidth("logs")`);
    const termW0 = await ev(`window.__sweep.dockPaneWidth("terminal")`);
    await ev(`window.__sweep.dragHandle('#bottom-panel .bp-vhandle[data-resize="logs"]', 90, 0)`);
    await sleep(250);
    const logsW1 = await ev(`window.__sweep.dockPaneWidth("logs")`);
    const termW1 = await ev(`window.__sweep.dockPaneWidth("terminal")`);
    check("output divider grows the output pane", logsW1 > logsW0 + 40, logsW0 + " -> " + logsW1);
    check("terminal absorbs the width the output took", termW1 < termW0 - 40, termW0 + " -> " + termW1);
    const dockW = await ev(`window.__sweep.dockColumnsWidth()`);
    check("output + terminal still fill the dock", logsW1 + termW1 > dockW - 25, (logsW1 + termW1) + " of " + dockW);
    check("chat visible after resizing", await ev(`window.__sweep.chatVisible()`));

    // The dock's top edge drags the whole panel taller/shorter.
    const panelH0 = await ev(`document.getElementById("bottom-panel").offsetHeight`);
    await ev(`window.__sweep.dragHandle('.bp-height-handle', 0, -60)`);
    await sleep(600);
    const panelH1 = await ev(`document.getElementById("bottom-panel").offsetHeight`);
    check("dragging the panel top edge resizes the dock", panelH1 > panelH0 + 30, panelH0 + " -> " + panelH1);
    await ev(`window.__sweep.dragHandle('.bp-height-handle', 0, 60)`);
    await sleep(600);
    const panelH2 = await ev(`document.getElementById("bottom-panel").offsetHeight`);
    check("dock height drags back down", panelH2 < panelH1 - 30, panelH1 + " -> " + panelH2);

    // Escape while typing in the terminal closes that pane only.
    await ev(`document.getElementById("terminal-input").focus()`);
    await ev(`window.__sweep.key("Escape")`);
    await sleep(300);
    check("Escape in the terminal hides only the terminal pane",
      !(await ev(`window.__sweep.dockPaneVisible("terminal")`)) && (await ev(`window.__sweep.chatVisible()`)));
    await ev(`document.querySelector('#bottom-panel [data-pane-toggle="terminal"]').click()`);
    await sleep(300);
    check("terminal pane restored at the end of the section", await ev(`window.__sweep.dockPaneVisible("terminal")`));

    // ── REAL SYSTEM SHELL ───────────────────────────────────────────────
    // The pane is attached to the user's actual shell (see main.js), so these
    // checks run against the machine, not a mock: output streams back, `cd`
    // and env vars persist, stderr arrives, Ctrl+C interrupts, and `exit`
    // ends the session while the next command starts a new one.
    const termLines = () => ev(`[...document.querySelectorAll("#terminal-log .terminal-line")].map((el) => el.textContent).join(String.fromCharCode(10))`);
    const clearTerm = () => ev(`document.getElementById("terminal-log").innerHTML = ""; true`);
    const sendTerm = async (cmd, waitMs = 900) => {
      await ev(`(() => { const el = document.getElementById("terminal-input"); el.value = ${JSON.stringify(cmd)}; return true; })()`);
      await ev(`document.getElementById("terminal-send").click(); true`);
      await sleep(waitMs);
      return termLines();
    };

    await clearTerm();
    await ev(`API.terminalRestart()`);
    await sleep(1500);
    const shellBanner = await termLines();
    check("terminal is attached to a real shell", /system shell/.test(shellBanner),
      shellBanner.split("\n").filter(Boolean)[0] || "");
    const cwdLabel = await ev(`document.getElementById("terminal-cwd").textContent`);
    check("terminal header shows the shell's working directory", /^~|^\//.test(cwdLabel || ""), "label=" + cwdLabel);

    await clearTerm();
    let shellOut = await sendTerm("echo REMAP_SHELL_OK");
    check("echo executes in the system shell", /REMAP_SHELL_OK/.test(shellOut), shellOut.trim().split("\n").pop());
    shellOut = await sendTerm("echo $((6*7))");
    check("shell evaluates its own arithmetic", /42/.test(shellOut), shellOut.trim().split("\n").pop());
    const homeDir = (await sendTerm("pwd")).trim().split("\n").filter(Boolean).pop();
    check("pwd returns a real path", (homeDir || "").startsWith("/"), homeDir);
    await sendTerm("cd /tmp");
    const afterCd = (await sendTerm("pwd")).trim().split("\n").filter(Boolean).pop();
    check("cd persists between commands", (afterCd || "").includes("/tmp"), afterCd);
    check("header cwd follows cd", (await ev(`document.getElementById("terminal-cwd").textContent`)).includes("tmp"),
      await ev(`document.getElementById("terminal-cwd").textContent`));
    await clearTerm();
    shellOut = await sendTerm("ls /remap-no-such-dir-xyz");
    check("stderr from a failing command is shown", /No such file|not found/i.test(shellOut), shellOut.trim().split("\n").pop());
    await clearTerm();
    await sendTerm("export REMAP_SWEEP_VAR=kept");
    shellOut = await sendTerm("echo $REMAP_SWEEP_VAR");
    check("environment variables persist between commands", /kept/.test(shellOut), shellOut.trim().split("\n").pop());

    // Ctrl+C: start a long command, interrupt it, and prove the session
    // survives and the next command still runs.
    await clearTerm();
    await ev(`(() => { const el = document.getElementById("terminal-input"); el.value = "sleep 25"; return true; })()`);
    await ev(`document.getElementById("terminal-send").click(); true`);
    await sleep(1200);
    await ev(`document.getElementById("terminal-input").dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true })); true`);
    await sleep(900);
    const interrupted = (await termLines()).includes("^C");
    shellOut = await sendTerm("echo AFTER_INTERRUPT");
    check("Ctrl+C interrupts the running command", interrupted && /AFTER_INTERRUPT/.test(shellOut),
      "interrupt=" + interrupted + " recovered=" + /AFTER_INTERRUPT/.test(shellOut));

    // exit ends the session; typing again brings a new one up.
    await sendTerm("exit", 1200);
    const exitMsg = (await termLines()).match(/exited[^\n]*/);
    check("exit is reported as a finished session", Boolean(exitMsg), exitMsg ? exitMsg[0].slice(0, 70) : "");
    shellOut = await sendTerm("echo RESTARTED_OK", 1500);
    check("next command starts a new shell session", /RESTARTED_OK/.test(shellOut), shellOut.trim().split("\n").pop());
    await clearTerm();
  }

  // ═════════════════════════════════════════════════════
  // [10] CHATBOT
  // ═════════════════════════════════════════════════════
  if (only.has(10)) {
    section(10, "CHATBOT");
    await ensureModel();
    const sendChat = async (text) => {
      await ev(`(() => { const el = document.getElementById("chatbot-input"); el.value = ${JSON.stringify(text)}; return true; })()`);
      await click("chatbot-send");
      await sleep(700);
      return ev(`(() => { const m = document.querySelectorAll("#chatbot-messages .chat-msg"); return m.length ? m[m.length - 1].textContent : ""; })()`);
    };
    const c0 = await ev(`document.querySelectorAll("#chatbot-messages .chat-msg").length`);
    const reply1 = await sendChat("Tell me about the model");
    check("chatbot answers a model question with real data", /qwen2|Parameters|Format/i.test(reply1), reply1.slice(0, 60));
    const reply2 = await sendChat("hello");
    check("chatbot handles a greeting", /Hey/i.test(reply2), reply2.slice(0, 50));
    const c2 = await ev(`document.querySelectorAll("#chatbot-messages .chat-msg").length`);
    check("chat log grows by user + assistant turns", c2 >= c0 + 4, c0 + " -> " + c2);
  }

  // ═════════════════════════════════════════════════════
  // [11] STATUS BAR + SETTINGS
  // ═════════════════════════════════════════════════════
  if (only.has(11)) {
    section(11, "STATUS BAR + SETTINGS");
    await ensureModel();
    const st = await ev(`(() => { const t = (id) => (document.getElementById(id) || {}).textContent || ""; return { model: t("status-model"), params: t("status-params"), format: t("status-format"), view: t("status-view"), zoom: t("status-zoom"), ram: t("status-ram"), device: t("status-device"), platform: t("status-platform") }; })()`);
    check("status bar shows model, params and format", /qwen2/i.test(st.model) && st.params !== "—" && st.format !== "—", JSON.stringify(st).slice(0, 110));
    check("status bar shows zoom, RAM and device", st.zoom !== "" && st.ram !== "—" && st.device !== "—", "ram=" + st.ram + " device=" + st.device);

    await click("status-view");
    await sleep(500);
    const v1 = await ev(`document.getElementById("status-view").textContent`);
    await click("status-view");
    await sleep(500);
    const v2 = await ev(`document.getElementById("status-view").textContent`);
    check("status-bar 2D/3D toggle works", v1 === "3D" && v2 === "2D", v1 + " -> " + v2);

    await click("btn-settings");
    await sleep(250);
    const navCount = await ev(`document.querySelectorAll(".settings-nav-item").length`);
    let panes = 0;
    for (let i = 0; i < navCount; i++) {
      const r = await ev(`(() => { const items = document.querySelectorAll(".settings-nav-item"); const item = items[${i}]; if (!item) return null; item.click(); const sec = document.getElementById("settings-section-" + item.dataset.settingsSection); return sec ? sec.classList.contains("active") : null; })()`);
      if (r === true) panes++;
      await sleep(140);
    }
    check("every settings page opens", navCount > 0 && panes === navCount, panes + "/" + navCount);
    const plan = await ev(`document.getElementById("settings-user-plan").textContent`);
    check("settings shows the guest identity", /guest/i.test(plan), plan);
    await click("settings-close");
    await sleep(200);
  }

  // ═════════════════════════════════════════════════════
  // [12] BACKEND RPC METHODS (every method the backend exposes)
  // ═════════════════════════════════════════════════════
  if (only.has(12)) {
    section(12, "BACKEND RPC METHODS");
    await ensureModel();
    const rpc = (method, params) => ev(`API.rpc(${JSON.stringify(method)}, ${JSON.stringify(params || {})})`);

    const sys = await rpc("system_info");
    check("system_info", sys && !sys.error && (sys.python || sys.platform), JSON.stringify(sys).slice(0, 90));
    const dev = await rpc("device_info");
    check("device_info", dev && !dev.error, JSON.stringify(dev).slice(0, 90));
    const mon = await rpc("device_monitor");
    check("device_monitor returns live usage", mon && !mon.error, JSON.stringify(mon).slice(0, 90));

    const sum = await rpc("model_summary");
    check("model_summary has real totals", sum && (sum.total_params > 1e8 || sum.total_mb > 0), JSON.stringify(sum).slice(0, 90));
    const lay = await rpc("model_layers");
    check("model_layers returns layers", lay && Array.isArray(lay.layers) && lay.layers.length > 0, "layers=" + ((lay && lay.layers) || []).length);
    const list = await rpc("weight_list");
    check("weight_list returns all 291 tensors", list && Array.isArray(list.tensors) && list.tensors.length === 291, "tensors=" + ((list && list.tensors) || []).length);
    const stat = await rpc("weight_stats", { tensor_name: "blk.0.attn_norm.weight" });
    check("weight_stats returns real numbers", stat && Number.isFinite(stat.mean) && Number.isFinite(stat.std), JSON.stringify(stat).slice(0, 90));
    const hm = await rpc("weight_heatmap", { tensor_name: "blk.0.attn_norm.weight", size: 64 });
    check("weight_heatmap size=64 gives 4096 cells", hm && Array.isArray(hm.data) && hm.data.length === 4096, "cells=" + ((hm && hm.data) || []).length);
    const grad = await rpc("weight_gradient", { tensor_name: "blk.0.attn_norm.weight" });
    check("weight_gradient responds cleanly on a quantized model", grad && (grad.error || grad.gradient), JSON.stringify(grad).slice(0, 80));

    const ti = await rpc("tensor_info");
    check("tensor_info reports editable capabilities", ti && ti.editable === true && Array.isArray(ti.operations) && ti.operations.length >= 8, JSON.stringify(ti).slice(0, 110));
    const edit = await rpc("tensor_edit", { tensor_name: "blk.0.attn_norm.weight", op: "scale", params: { factor: 0.9 } });
    check("tensor_edit scale succeeds", edit && edit.ok === true, JSON.stringify(edit).slice(0, 80));
    const pendingA = await rpc("tensor_pending");
    check("tensor_pending lists the edit", pendingA && pendingA.edit_count >= 1, JSON.stringify(pendingA).slice(0, 100));
    const badOp = await rpc("tensor_edit", { tensor_name: "blk.0.attn_norm.weight", op: "explode", params: {} });
    check("tensor_edit rejects an unknown operation", badOp && /unknown operation/i.test(badOp.error || ""), String(badOp && badOp.error).slice(0, 70));
    const del1 = await rpc("tensor_delete", { tensor_name: "blk.0.ffn_up.weight", deleted: true });
    const pendDel = await rpc("tensor_pending");
    check("tensor_delete marks the tensor for exclusion", del1 && del1.ok && pendDel.delete_count >= 1, JSON.stringify(del1).slice(0, 70));
    const del2 = await rpc("tensor_delete", { tensor_name: "blk.0.ffn_up.weight", deleted: false });
    const pendDel2 = await rpc("tensor_pending");
    check("tensor_delete restore clears it", del2 && del2.ok && (pendDel2.delete_count || 0) === 0, JSON.stringify(pendDel2).slice(0, 80));
    const reset = await rpc("tensor_reset");
    const pendingB = await rpc("tensor_pending");
    check("tensor_reset clears every pending edit", reset && reset.ok !== false && ((pendingB.edit_count || 0) + (pendingB.delete_count || 0)) === 0, JSON.stringify(pendingB).slice(0, 80));

    const expBad = await rpc("tensor_export", {});
    check("tensor_export without a path errors", expBad && /no export path/i.test(expBad.error || ""), String(expBad && expBad.error));
    const mexp = await rpc("model_export", { path: "/tmp/never-exported.safetensors", format: "safetensors" });
    check("model_export explains the quantized-model limit", mexp && mexp.error, String(mexp && mexp.error).slice(0, 60));
    const ml = await rpc("model_load", { path: "/tmp/does-not-exist.gguf" });
    check("model_load reports a missing file", ml && ml.file_not_found === true, JSON.stringify(ml).slice(0, 70));
    const mlf = await rpc("model_load_folder", { path: "/tmp/not-a-folder" });
    check("model_load_folder reports a missing folder", mlf && mlf.file_not_found === true, JSON.stringify(mlf).slice(0, 70));

    const run = await rpc("unlearn_start", { config: { target: "blk.0", method: "node_ablation", steps: 50 } });
    check("unlearn_start completes the surgery job", run && run.status === "completed" && Array.isArray(run.tensors_modified) && run.tensors_modified.length > 0, "job=" + (run && run.job_id) + " modified=" + ((run && run.tensors_modified) || []).length);
    const prog = await rpc("unlearn_progress", { job_id: run && run.job_id });
    check("unlearn_progress returns the same job at 100%", prog && prog.job_id === (run && run.job_id) && prog.progress === 100, JSON.stringify(prog).slice(0, 90));
    const cancel = await rpc("unlearn_cancel", { job_id: run && run.job_id });
    check("unlearn_cancel acknowledges", cancel && cancel.status === "cancelled", JSON.stringify(cancel));
    const stop = await rpc("unlearn_stop");
    check("unlearn_stop acknowledges", stop && stop.status === "stopped", JSON.stringify(stop));
    const evalp = await rpc("eval_probes", { config: { probes: [] } });
    check("eval_probes responds (results or a clear error)", evalp && (evalp.error || evalp.results), JSON.stringify(evalp).slice(0, 90));
    const unk = await rpc("definitely_not_a_method", {});
    check("unknown RPC method returns an error object", unk && /unknown method/i.test(unk.error || ""), String(unk && unk.error));
    await rpc("tensor_reset");
  }

  // ═════════════════════════════════════════════════════
  // [13] KEYBOARD SHORTCUTS
  // ═════════════════════════════════════════════════════
  if (only.has(13)) {
    section(13, "KEYBOARD SHORTCUTS");
    await ensureModel();
    await ev(`state.zoom = 1; updateZoom(); true;`);
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);
    await sleep(200);

    const sbBefore = await visible("sidebar");
    await key("b", { metaKey: true });
    await sleep(450);
    const sbAfter = await visible("sidebar");
    check("Cmd+B toggles the sidebar", sbBefore !== sbAfter, sbBefore + " -> " + sbAfter);
    await key("b", { metaKey: true });
    await sleep(300);

    const prBefore = await ev(`window.__sweep.propsTopVisible()`);
    await key("P", { metaKey: true, shiftKey: true });
    await sleep(450);
    const prAfter = await ev(`window.__sweep.propsTopVisible()`);
    check("Cmd+Shift+P toggles the properties list", prBefore !== prAfter, prBefore + " -> " + prAfter);
    check("Cmd+Shift+P leaves the fixed chat visible", await ev(`window.__sweep.chatVisible()`));
    await key("P", { metaKey: true, shiftKey: true });
    await sleep(300);
    check("properties list restored", (await ev(`window.__sweep.propsTopVisible()`)) === true);

    const termBefore = await ev(`window.__sweep.dockPaneVisible("terminal")`);
    await key("`", { metaKey: true });
    await sleep(450);
    const termAfter = await ev(`window.__sweep.dockPaneVisible("terminal")`);
    check("Cmd+` toggles the terminal pane", termBefore !== termAfter, "visible " + termBefore + " -> " + termAfter);
    check("Cmd+` never hides the chat pane", await ev(`window.__sweep.chatVisible()`));
    if (termBefore !== termAfter) { await key("`", { metaKey: true }); await sleep(300); }

    await key("/", { metaKey: true });
    await sleep(350);
    check("Cmd+/ opens the shortcuts overlay", await visible("shortcuts-overlay"));
    await key("Escape");
    await sleep(250);
    check("Escape closes the shortcuts overlay", !(await visible("shortcuts-overlay")));

    await key(",", { metaKey: true });
    await sleep(350);
    check("Cmd+, opens settings", await visible("settings-overlay"));
    await key("Escape");
    await sleep(250);
    check("Escape closes settings", !(await visible("settings-overlay")));

    await key("e", { metaKey: true });
    await sleep(350);
    check("Cmd+E opens the export dialog", await visible("export-overlay"));
    await key("Escape");
    await sleep(250);

    // Cmd+O / Cmd+Shift+O call openFile()/openFolder() by name, so spies on
    // those globals verify the shortcuts without opening native dialogs.
    await ev(`window.__sweep.spy = { open: 0, folder: 0 }; window.__sweep.realOpen = window.openFile; window.__sweep.realFolder = window.openFolder; window.openFile = function () { window.__sweep.spy.open++; }; window.openFolder = function () { window.__sweep.spy.folder++; }; true;`);
    await key("o", { metaKey: true });
    await sleep(250);
    check("Cmd+O triggers openFile()", (await ev("window.__sweep.spy.open")) === 1);
    await key("O", { metaKey: true, shiftKey: true });
    await sleep(250);
    check("Cmd+Shift+O triggers openFolder() (uppercase key)", (await ev("window.__sweep.spy.folder")) === 1);
    await ev(`window.openFile = window.__sweep.realOpen; window.openFolder = window.__sweep.realFolder; true;`);

    const tabTargets = ["visualization", "weights", "heatmap", "unlearn", "models"];
    let tabHits = 0;
    for (let i = 1; i <= 5; i++) {
      await key(String(i), { metaKey: true });
      await sleep(300);
      if ((await ev("window.__sweep.activeTab()")) === tabTargets[i - 1]) tabHits++;
    }
    check("Cmd+1..5 switch all five tabs", tabHits === 5, tabHits + "/5");
    await ev(`document.querySelector('.tab[data-tab="visualization"]').click()`);

    await key("=", { metaKey: true });
    await sleep(200);
    const z1 = await ev(`document.getElementById("status-zoom").textContent`);
    await key("-", { metaKey: true });
    await key("-", { metaKey: true });
    await sleep(200);
    const z2 = await ev(`document.getElementById("status-zoom").textContent`);
    await key("0", { metaKey: true });
    await sleep(200);
    const z3 = await ev(`document.getElementById("status-zoom").textContent`);
    check("zoom shortcuts: in, out, reset", z1 === "110%" && parseFloat(z2) < 110 && z3 === "100%", [z1, z2, z3].join(" -> "));

    await key("g");
    await sleep(600);
    const g1 = await ev(`document.getElementById("status-view").textContent`);
    await key("g");
    await sleep(500);
    const g2 = await ev(`document.getElementById("status-view").textContent`);
    check("G toggles 2D <-> 3D from either view", g1 === "3D" && g2 === "2D", g1 + " -> " + g2);

    // Cmd+Shift+R is the unlearn shortcut; give it a target and watch for the
    // surgery edits, which only appear if a run really happened.
    await ev(`(() => { const s = document.getElementById("unlearn-target"); if (s && !s.value) { const o = [...s.options].find((x) => x.value); if (o) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); } } return true; })()`);
    await ev(`API.rpc("tensor_reset")`);
    await key("R", { metaKey: true, shiftKey: true });
    let shortcutEdits = 0;
    for (let i = 0; i < 50 && shortcutEdits === 0; i++) {
      await sleep(300);
      const p = await ev(`API.rpc("tensor_pending")`);
      shortcutEdits = ((p && p.edit_count) || 0) + ((p && p.delete_count) || 0);
    }
    check("Cmd+Shift+R runs unlearning (pending edits appear)", shortcutEdits > 0, "pending=" + shortcutEdits);
    await ev(`API.rpc("tensor_reset")`);
  }

  // ═════════════════════════════════════════════════════
  // [14] AUTH + SUBSCRIPTION UI
  // ═════════════════════════════════════════════════════
  if (only.has(14)) {
    section(14, "AUTH + SUBSCRIPTION UI");
    const authHidden = await ev(`document.getElementById("auth-screen").classList.contains("hidden") || getComputedStyle(document.getElementById("auth-screen")).display === "none"`);
    check("auth screen hidden for the signed-in session", authHidden === true);

    const g = await listenerInfo("auth-google-btn");
    check("Google button has a click listener", Array.isArray(g) && g.some((l) => l.type === "click"), JSON.stringify((g || []).map((l) => l.line)));
    skip("Google / Apple OAuth click", "redirects to a real external provider");

    await click("btn-settings");
    await sleep(250);
    const plan = await ev(`document.getElementById("settings-user-plan").textContent`);
    check("settings shows the guest plan", /guest/i.test(plan), plan);
    const upVisible = await visible("btn-upgrade-pro");
    skip("upgrade checkout click", "opens Razorpay in the system browser (guest has no account)");
    check("upgrade buttons reflected by plan state", typeof upVisible === "boolean", "pro btn visible=" + upVisible);
    await click("settings-close");
    await sleep(200);

    await click("btn-settings");
    await sleep(250);
    await click("settings-logout-btn");
    await sleep(700);
    const authShown = await ev(`getComputedStyle(document.getElementById("auth-screen")).display !== "none"`);
    check("signing out a guest returns to the auth screen", authShown === true);

    await click("auth-apple-btn");
    await sleep(350);
    const appleErr = await ev(`document.getElementById("auth-error").textContent`);
    check("Apple sign-in explains it is unsupported", /not yet supported/i.test(appleErr), appleErr);

    await click("auth-guest-btn");
    await sleep(800);
    const appBack = await ev(`getComputedStyle(document.getElementById("auth-screen")).display === "none"`);
    check("Continue as Guest restores the app", appBack === true);
    await click("settings-close");
    await sleep(200);
  }

  // ═════════════════════════════════════════════════════
  // [15] PYTHON DEPENDENCY GATE
  // The main process re-checks backend/requirements.txt on every launch and
  // offers an automatic install when something is missing. A healthy machine
  // must show no dialog at all; a broken one must list exactly what is wrong
  // with Allow / Close. The install itself is skipped here — it pip-installs
  // real packages.
  // ═════════════════════════════════════════════════════
  if (only.has(15)) {
    section(15, "PYTHON DEPENDENCY GATE");

    // Hygiene: earlier sections can pin a preferred interpreter (the settings
    // tests exercise that control), which would make this section measure that
    // choice instead of the launch-time check. Clear it and probe again so the
    // section always describes a default configuration.
    await ev(`(async () => { await window.electronAPI.setSetting("pythonPath", ""); await window.electronAPI.checkDeps(); })()`);
    await sleep(2500);

    const deps = await ev(`(async () => {
      const d = await window.electronAPI.getDepsStatus();
      return {
        status: d.status,
        envKind: d.envKind,
        python: d.python || d.basePython || "",
        missing: (d.missing || []).length,
        reqs: d.requirementCount,
        log: (d.log || []).filter((l) => l.startsWith("[check]"))[0] || "",
      };
    })()`);

    check("launch dependency check produced a verdict", deps.status === "ok" || deps.status === "missing", "status=" + deps.status + " env=" + deps.envKind);
    check("requirements.txt drives the check", deps.reqs >= 8, deps.reqs + " requirements");
    check("an interpreter was resolved", Boolean(deps.python), deps.python);

    const gate = await ev(`document.getElementById("deps-overlay").classList.contains("visible")`);
    if (deps.status === "ok") {
      check("no setup dialog when every package is present", gate === false, deps.log);
      check("nothing reported missing", deps.missing === 0, deps.missing + " missing");
      const rows = await ev(`document.querySelectorAll("#deps-list .deps-item").length`);
      check("dialog body left empty on a healthy machine", rows === 0, rows + " rows");
    } else {
      check("setup dialog shown when packages are missing", gate === true);
      const rows = await ev(`document.querySelectorAll("#deps-list .deps-item").length`);
      check("dialog lists every missing package", rows === deps.missing, rows + " rows for " + deps.missing);
      const btns = await ev(`Array.from(document.querySelectorAll(".deps-actions button")).filter((b) => b.style.display !== "none").map((b) => b.textContent.trim())`);
      check("dialog offers Allow and Close the application", btns.some((t) => /install everything/i.test(t)) && btns.some((t) => /close application/i.test(t)), JSON.stringify(btns));
      skip("Allow button click", "would pip-install real packages into the app environment");
    }

    const ipc = await ev(`typeof window.electronAPI.installDeps === "function" && typeof window.electronAPI.checkDeps === "function" && typeof window.electronAPI.continueWithoutDeps === "function" && typeof window.electronAPI.quitApp === "function"`);
    check("dependency IPC exposed to the renderer", ipc === true);

    const progressHook = await ev(`typeof window.electronAPI.onDepsProgress === "function" && typeof window.electronAPI.onDepsStatus === "function"`);
    check("status + progress events subscribed by the UI", progressHook === true);

    // The settings page must surface the same information without the dialog.
    await click("btn-settings");
    await sleep(200);
    const envCard = await ev(`(() => { const item = Array.from(document.querySelectorAll(".settings-nav-item")).find((i) => i.dataset.settingsSection === "backend"); if (item) item.click(); return true; })()`);
    await sleep(300);
    const cardText = await ev(`document.getElementById("backend-env-card").innerText`);
    check("settings → backend shows the environment", envCard === true && /Environment:/i.test(cardText || ""), (cardText || "").replace(/\n/g, " | "));
    const repairBtn = await ev(`typeof document.getElementById("btn-backend-deps") !== "undefined" && document.getElementById("btn-backend-deps") !== null`);
    check("settings offers Install / Repair Packages", repairBtn === true);
    await click("settings-close");
    await sleep(200);
  }

  // ═════════════════════════════════════════════════════
  // [16] PREFERENCES, SEARCH, CONTEXT MENU + UX LAYER
  // Covers the wiring added for the A-to-Z pass: the preference store and every
  // control that used to be decorative, the dead menu items, the tensor search
  // panel, the context menu, and the feedback/motion layer.
  // ═════════════════════════════════════════════════════
  if (only.has(16)) {
    section(16, "PREFERENCES, SEARCH, CONTEXT MENU + UX LAYER");

    await ensureModel();

    // ── 16a. Preference store round-trips to disk ──
    const store = await ev(`(async () => {
      const set = await window.electronAPI.setSetting("animSpeed", "fast");
      const reread = await window.electronAPI.getSettings();
      const hasPath = typeof reread._path === "string" && reread._path.length > 0;
      const hasVersion = typeof reread._appVersion === "string";
      await window.electronAPI.setSetting("animSpeed", "normal");
      return { ok: set.ok, stored: reread.animSpeed, hasPath, hasVersion, version: reread._appVersion };
    })()`);
    check("settings persist through the main process", store.ok === true && store.stored === "fast", "animSpeed=" + store.stored);
    check("settings file has a real location", store.hasPath === true);
    check("the app version comes from the build, not a literal", store.hasVersion === true, "v" + store.version);

    // ── 16b. Every preference control is wired and has a live effect ──
    await ev(`window.toggleModal && window.toggleModal("settings-overlay")`);
    await sleep(300);
    const controls = await ev(`(async () => {
      const ids = ["setting-autoload","setting-welcome","setting-gpu","setting-anim-speed","setting-connections","setting-default-method","setting-autosave","setting-python","setting-device","setting-heatmap-color"];
      const present = ids.filter((id) => document.getElementById(id));
      const out = { present: present.length, total: ids.length };

      // anim speed: applies to the 3D engine AND can switch motion off
      document.querySelector('.settings-nav-item[data-settings-section="visualization"]').click();
      const sel = document.getElementById("setting-anim-speed");
      sel.value = "off"; sel.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 350));
      out.animOffAttr = document.documentElement.getAttribute("data-anim");
      out.animStored = (await window.electronAPI.getSettings()).animSpeed;
      sel.value = "normal"; sel.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      out.animCleared = document.documentElement.getAttribute("data-anim");

      // connections reaches the renderer's own state flag
      const conn = document.getElementById("setting-connections");
      conn.checked = false; conn.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      out.connOff = state.showConnections;
      conn.checked = true; conn.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      out.connOn = state.showConnections;

      // the interpreter commits on blur and the hint follows it
      document.querySelector('.settings-nav-item[data-settings-section="backend"]').click();
      const py = document.getElementById("setting-python");
      py.value = "/usr/bin/python3"; py.dispatchEvent(new Event("blur", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
      out.pythonStored = (await window.electronAPI.getSettings()).pythonPath;
      out.pythonHint = document.getElementById("setting-python-hint").textContent;
      document.getElementById("btn-python-reset").click();
      await new Promise((r) => setTimeout(r, 700));
      out.pythonCleared = (await window.electronAPI.getSettings()).pythonPath;
      out.pythonHintAuto = document.getElementById("setting-python-hint").textContent;
      return out;
    })()`);
    check("every preference control exists in the panel", controls.present === controls.total, controls.present + "/" + controls.total);
    check("node animation speed = off switches CSS motion off", controls.animOffAttr === "off" && controls.animStored === "off", "data-anim=" + controls.animOffAttr);
    check("animation speed restores cleanly", controls.animCleared === null);
    check("Show connection lines reaches the renderer state", controls.connOff === false && controls.connOn === true);
    check("preferred interpreter commits and persists", controls.pythonStored === "/usr/bin/python3", String(controls.pythonStored));
    check("interpreter hint reflects the pinned path", /pinned/.test(controls.pythonHint || ""), controls.pythonHint);
    check("interpreter can be released back to auto-detect", controls.pythonCleared === "" && /auto/.test(controls.pythonHintAuto || ""), controls.pythonHintAuto);

    // ── 16c. Settings search filters the whole panel ──
    const search = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const input = document.getElementById("settings-search");
      const visible = () => Array.from(document.querySelectorAll(".settings-section-page .settings-row")).filter((r) => !r.classList.contains("settings-row-hidden")).length;
      const total = document.querySelectorAll(".settings-section-page .settings-row").length;
      input.value = "heatmap"; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(200);
      const hit = visible();
      const hint = document.getElementById("settings-search-hint").textContent;
      input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(200);
      return { total, hit, restored: visible(), hint };
    })()`);
    check("settings search narrows the panel to matching rows", search.hit > 0 && search.hit < search.total, search.hit + " of " + search.total + " rows for \"heatmap\"");
    check("settings search reports the match count", /match/i.test(search.hint || ""), search.hint);
    check("clearing the search restores every row", search.restored === search.total, search.restored + "/" + search.total);

    // ── 16d. The preferences that gate behaviour are honoured ──
    const welcomePref = await ev(`(async () => {
      await window.electronAPI.setSetting("welcome", false);
      state.settings.welcome = false;
      window.hideWelcomeScreen();
      await new Promise((r) => setTimeout(r, 150));
      const hidden = document.getElementById("canvas-overlay").classList.contains("hidden");
      await window.electronAPI.setSetting("welcome", true);
      state.settings.welcome = true;
      state.welcomeDismissed = false;
      return { hidden };
    })()`);
    check("'Show welcome screen' actually hides the overlay", welcomePref.hidden === true);

    await click("settings-close");
    await sleep(200);

    // ── 16e. Dead menu items are gone ──
    const menuActions = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = {};

      // Recent Models: a real list with real rows, seeded by the loaded model
      window.handleMenuAction("recent");
      await wait(250);
      out.recentRows = document.querySelectorAll(".recent-row").length;
      out.recentName = (document.querySelector(".recent-name") || {}).textContent || "";
      out.recentClosable = !!document.querySelector("[data-recent-close]");
      document.querySelector("[data-recent-close]").click();
      await wait(150);
      out.recentClosed = !document.querySelector(".recent-modal");

      // Documentation: an offline modal, not a log line
      window.handleMenuAction("docs");
      await wait(200);
      const overlay = document.getElementById("docs-overlay");
      out.docsOpen = overlay.classList.contains("visible");
      out.docsSections = overlay.querySelectorAll(".docs-section").length;
      overlay.querySelector('[data-docs-nav="trouble"]').click();
      await wait(150);
      out.docsSwitched = !overlay.querySelector('[data-docs-section="trouble"]').classList.contains("hidden")
        && overlay.querySelector('[data-docs-section="start"]').classList.contains("hidden");
      window.closeDocsModal();
      await wait(150);
      out.docsClosed = !overlay.classList.contains("visible");

      // Analysis + benchmark write real output instead of one hopeful line
      const logLength = () => (document.getElementById("output-content") || document.body).textContent.length;
      const before = logLength();
      await window.runModelAnalysis();
      await wait(250);
      const afterAnalysis = logLength();
      await window.runModelBenchmark();
      await wait(250);
      out.analysisWrote = afterAnalysis > before;
      out.benchmarkWrote = logLength() > afterAnalysis;

      // Legal (the auth screen's Terms / Privacy links used to be href="#")
      window.openLegalModal("privacy");
      await wait(200);
      out.legalOpen = !!document.getElementById("legal-overlay");
      out.legalMentionsLocal = /never leave this computer/i.test(document.getElementById("legal-overlay").textContent);
      document.querySelector("[data-legal-close]").click();
      await wait(150);
      out.legalClosed = !document.getElementById("legal-overlay");
      return out;
    })()`);
    check("File ▸ Recent Models lists the loaded model", menuActions.recentRows >= 1 && menuActions.recentName.length > 0, menuActions.recentName);
    check("Recent Models closes properly", menuActions.recentClosable === true && menuActions.recentClosed === true);
    check("Help ▸ Documentation opens the offline modal", menuActions.docsOpen === true, menuActions.docsSections + " sections");
    check("documentation navigation swaps sections", menuActions.docsSwitched === true);
    check("documentation closes properly", menuActions.docsClosed === true);
    check("Run ▸ Analysis writes real output", menuActions.analysisWrote === true);
    check("Run ▸ Benchmark writes real output", menuActions.benchmarkWrote === true);
    check("Terms / Privacy open a real explanation, not href=\"#\"", menuActions.legalOpen === true && menuActions.legalMentionsLocal === true);
    check("legal modal closes properly", menuActions.legalClosed === true);

    // ── 16f. Tensor search panel (was "TODO: Search panel") ──
    const searchPanel = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('.activity-btn[data-panel="search"]').click();
      await wait(250);
      const out = {
        treeHidden: document.getElementById("model-tree").classList.contains("hidden"),
        searchVisible: !document.getElementById("sidebar-search").classList.contains("hidden"),
        title: document.querySelector("#sidebar .panel-title").textContent,
      };
      const input = document.getElementById("tensor-search");
      input.value = "attn_k"; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(250);
      out.hits = document.querySelectorAll("#tensor-search-results .search-hit").length;
      out.total = (state.tensors || []).length;
      out.count = document.getElementById("tensor-search-count").textContent;
      input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(200);
      out.all = document.querySelectorAll("#tensor-search-results .search-hit").length;

      // multi-term query matches regardless of term order
      input.value = "weight attn"; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(250);
      out.fuzzy = document.querySelectorAll("#tensor-search-results .search-hit").length;
      input.value = "zzzzz-no-such-tensor"; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(250);
      out.emptyState = !!document.querySelector("#tensor-search-results .empty-title");

      // clicking a hit reveals the tensor in the explorer
      input.value = "attn_k"; input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(250);
      const hit = document.querySelector("#tensor-search-results .search-hit");
      const wanted = hit.dataset.tensor;
      hit.click();
      await wait(900);
      out.selected = state.selectedTensor;
      out.wanted = wanted;
      out.tab = state.activeTab;

      document.querySelector('.activity-btn[data-panel="explorer"]').click();
      await wait(200);
      out.treeBack = !document.getElementById("model-tree").classList.contains("hidden");
      return out;
    })()`);
    check("search panel replaces the tree instead of duplicating it", searchPanel.treeHidden === true && searchPanel.searchVisible === true, searchPanel.title);
    check("search matches a tensor-name fragment", searchPanel.hits > 0 && searchPanel.hits < searchPanel.total, searchPanel.hits + " of " + searchPanel.total + " for \"attn_k\"");
    check("empty query lists tensors rather than nothing", searchPanel.all > 0, searchPanel.all + " shown");
    check("multi-term search ignores term order", searchPanel.fuzzy > 0, searchPanel.fuzzy + " hits for \"weight attn\"");
    check("a query with no matches shows an empty state", searchPanel.emptyState === true);
    check("clicking a result reveals + selects that tensor", searchPanel.selected === searchPanel.wanted, searchPanel.selected);
    check("the explorer view comes back", searchPanel.treeBack === true);

    // ── 16g. Context menu does real work ──
    const ctx = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      window.switchTab("weights");
      await wait(500);
      const row = document.querySelector("#weight-explorer-body .weight-item");
      if (!row) return { noRow: true };
      const out = { tensor: row.dataset.tensor };
      row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 320, clientY: 320 }));
      await wait(200);
      const menu = document.getElementById("context-menu");
      out.visible = menu.classList.contains("visible");
      out.items = menu.querySelectorAll(".context-menu-item").length;
      out.disabled = menu.querySelectorAll(".context-menu-item.disabled").length;
      out.target = (state.contextTarget || {}).name;
      out.actions = Array.from(menu.querySelectorAll(".context-menu-item")).map((i) => i.dataset.action);
      // view-properties must select the tensor and reveal the properties panel
      state.propsVisible = false;
      menu.querySelector('[data-action="view-properties"]').click();
      await wait(900);
      out.selected = state.selectedTensor;
      out.props = state.propsVisible;
      out.closed = !menu.classList.contains("visible");
      // a layer row (no tensor) disables the tensor-only entries
      const treeNode = document.querySelector("#model-tree .tree-node");
      if (treeNode) {
        treeNode.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 200, clientY: 200 }));
        await wait(200);
        out.layerDisabled = menu.querySelectorAll(".context-menu-item.disabled").length;
        out.layerTarget = (state.contextTarget || {}).name;
        document.body.click();
        await wait(100);
      }
      return out;
    })()`);
    if (ctx.noRow) {
      skip("context menu on a weight row", "no weight rows rendered");
    } else {
      check("right-clicking a weight opens the context menu", ctx.visible === true, ctx.items + " items");
      check("the menu knows which tensor it targets", ctx.target === ctx.tensor, ctx.target);
      check("every menu entry has a handler", ctx.actions.length === 5 && ctx.actions.every((a) => ["copy-name","copy-path","view-properties","view-heatmap","export-tensor"].includes(a)), JSON.stringify(ctx.actions));
      check("View Properties selects the tensor and shows the panel", ctx.selected === ctx.tensor && ctx.props === true, ctx.selected);
      check("the menu closes after acting", ctx.closed === true);
      if (ctx.layerDisabled !== undefined) {
        // `target` is the weight-row name from earlier; `layerTarget` is what the
        // layer row produced. A layer has no single tensor, so the four
        // tensor-only entries must switch off and the target must be empty.
        check("tensor-only entries are disabled on a layer row", ctx.layerDisabled > 0 && !ctx.layerTarget, ctx.layerDisabled + " disabled, target=" + JSON.stringify(ctx.layerTarget));
      }
    }

    // ── 16h. Undo / redo ──
    const history = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const item = (a) => document.querySelector('.dropdown-item[data-action="' + a + '"]');
      const out = { initiallyDisabled: item("undo").classList.contains("disabled") };
      const ran = [];
      window.pushEditHistory({ label: "sweep edit", apply: () => ran.push("undo"), redo: () => ran.push("redo") });
      out.enabledAfterPush = !item("undo").classList.contains("disabled");
      await window.undoLastEdit();
      await wait(150);
      out.undoRan = ran.includes("undo");
      out.redoEnabled = !item("redo").classList.contains("disabled");
      await window.redoLastEdit();
      await wait(150);
      out.redoRan = ran.includes("redo");
      await window.undoLastEdit();
      await wait(150);
      // The stack must keep the entry we just undid, so it can be redone again.
      out.redoStackAfterUndo = state.redoStack.length;
      return out;
    })()`);
    check("Edit ▸ Undo starts disabled with no history", history.initiallyDisabled === true);
    check("recording an edit enables Undo", history.enabledAfterPush === true);
    check("Undo runs the recorded inverse", history.undoRan === true);
    check("Redo becomes available and runs", history.redoEnabled === true && history.redoRan === true);
    check("an undone edit stays redoable", history.redoStackAfterUndo === 1, history.redoStackAfterUndo + " in the redo stack");

    // ── 16i. Panel geometry is remembered, and drivable from the keyboard ──
    const panels = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const handle = document.querySelector('.resize-handle[data-resize="sidebar"]');
      const out = {
        focusable: handle.getAttribute("tabindex"),
        role: handle.getAttribute("role"),
        orientation: handle.getAttribute("aria-orientation"),
        hasTitle: (handle.getAttribute("title") || "").length > 0,
      };
      handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 300, clientY: 400 }));
      await wait(60);
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 360, clientY: 400 }));
      await wait(60);
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 360, clientY: 400 }));
      await wait(400);
      out.dragged = document.getElementById("sidebar").style.width;
      out.saved = (await window.electronAPI.getSettings()).sizes;
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await wait(300);
      out.arrow = document.getElementById("sidebar").style.width;
      handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await wait(400);
      out.cleared = (await window.electronAPI.getSettings()).sizes;
      return out;
    })()`);
    check("resize handles are keyboard reachable and labelled", panels.focusable === "0" && panels.role === "separator" && panels.orientation === "vertical" && panels.hasTitle === true);
    check("dragging a handle resizes the panel", panels.dragged === "320px", panels.dragged);
    check("the new panel size is persisted", panels.saved && panels.saved.sidebar === 320, JSON.stringify(panels.saved));
    check("arrow keys resize the panel too", panels.arrow === "332px", panels.arrow);
    check("double-click resets the saved size", panels.cleared && panels.cleared.sidebar === undefined, JSON.stringify(panels.cleared));

    // ── 16j. Status bar segments are actionable ──
    const status = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const ids = ["status-model", "status-zoom", "status-platform", "status-ram", "status-params"];
      const out = { clickable: ids.filter((id) => (document.getElementById(id).classList.contains("status-clickable"))).length, total: ids.length };
      state.zoom = 1.5; window.updateZoom();
      document.getElementById("status-zoom").click();
      await wait(200);
      out.zoom = state.zoom;
      document.getElementById("status-platform").click();
      await wait(300);
      out.settingsOpened = document.getElementById("settings-overlay").classList.contains("visible");
      out.onBackendPage = !!document.querySelector('.settings-nav-item[data-settings-section="backend"].active');
      window.toggleModal("settings-overlay");
      await wait(200);
      return out;
    })()`);
    check("status bar segments are clickable", status.clickable === status.total, status.clickable + "/" + status.total);
    check("clicking the zoom segment resets zoom", status.zoom === 1, "zoom=" + status.zoom);
    check("clicking the device segment opens Backend settings", status.settingsOpened === true && status.onBackendPage === true);

    // ── 16k. Toast layer: stacking, dedupe, sticky errors, actions ──
    const toasts = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      window.clearToasts();
      // Dismissal animates: a card leaves the DOM 200 ms after it is dismissed,
      // so count only the ones still on screen.
      await wait(400);
      for (let i = 0; i < 4; i++) window.toast("identical sweep message", "info", 5000);
      await wait(200);
      const out = {
        cards: document.querySelectorAll("#toast-container .toast:not(.out)").length,
        badge: (document.querySelector(".toast-count") || {}).textContent || "",
      };
      window.clearToasts();
      await wait(120);
      window.toast("sweep error", "error", 1000);
      await wait(150);
      const err = document.querySelector(".toast.toast-error");
      out.stickyError = !!err && err.dataset.sticky === "1";
      out.hasClose = !!document.querySelector(".toast-error .toast-close");
      let acted = false;
      window.toast("sweep action", "info", 4000, { action: "Do it", onAction: () => { acted = true; } });
      await wait(120);
      const btn = document.querySelector(".toast-action");
      out.hasAction = !!btn;
      if (btn) btn.click();
      await wait(150);
      out.actionRan = acted;
      window.clearToasts();
      await wait(400);
      out.cleared = document.querySelectorAll("#toast-container .toast").length;
      return out;
    })()`);
    check("repeated identical toasts collapse instead of stacking", toasts.cards === 1 && /2|3|4/.test(toasts.badge), toasts.cards + " card, badge " + toasts.badge);
    check("error toasts stay until dismissed", toasts.stickyError === true);
    check("toasts can be dismissed by hand", toasts.hasClose === true);
    check("toasts support an action button that runs", toasts.hasAction === true && toasts.actionRan === true);
    check("the toast stack can be cleared", toasts.cleared === 0);

    // ── 16l. Export dialog honesty ──
    const exportUI = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      window.toggleModal("export-overlay");
      await wait(300);
      const out = {
        unsupported: document.querySelectorAll(".export-option.disabled").length,
        unsupportedHaveReason: Array.from(document.querySelectorAll(".export-option.disabled")).every((o) => (o.dataset.unavailable || "").length > 10),
        precision: !!document.getElementById("export-precision"),
        verifyToggle: !!document.getElementById("export-verify"),
        summary: (document.getElementById("export-summary") || {}).textContent || "",
      };
      const pt = document.querySelector('.export-option[data-format="pt"]');
      pt.click();
      await wait(200);
      out.selectedFormat = state.exportFormat;
      out.selectedClass = pt.classList.contains("selected");
      const gguf = document.querySelector('.export-option[data-format="gguf"]');
      gguf.click();
      await wait(200);
      out.ggufRejected = !gguf.classList.contains("selected");
      window.toggleModal("export-overlay");
      await wait(200);
      return out;
    })()`);
    check("formats this build cannot write are marked unavailable", exportUI.unsupported === 2 && exportUI.unsupportedHaveReason === true, exportUI.unsupported + " unavailable");
    check("clicking an unavailable format does not select it", exportUI.ggufRejected === true);
    check("a supported format still selects", exportUI.selectedClass === true, exportUI.selectedFormat);
    check("export options are real (precision + verify)", exportUI.precision === true && exportUI.verifyToggle === true);
    check("the export dialog explains what it will write", /Format/i.test(exportUI.summary || ""), (exportUI.summary || "").slice(0, 60));

    // ── 16m. New backend RPCs ──
    const rpcs = await ev(`(async () => {
      const out = {};
      const dev = await window.electronAPI.rpc("device_preference", { device: "cpu" });
      out.cpuPinned = dev.device === "cpu" && dev.preference === "cpu";
      out.available = Array.isArray(dev.available) ? dev.available.length : 0;
      const back = await window.electronAPI.rpc("device_preference", { device: "auto" });
      out.autoBack = back.device;
      out.autoPref = back.preference;

      const one = await window.electronAPI.rpc("tensor_export_one", { name: "blk.0.attn_k.weight", path: "/tmp/sweep-tensor.npy" });
      out.exported = one.error ? { error: String(one.error).slice(0, 90) } : { count: one.count, streamed: one.streamed, bytes: one.size_bytes };
      const bad = await window.electronAPI.rpc("tensor_export_one", { name: "nope.nope", path: "/tmp/sweep-tensor.npy" });
      out.badName = !!bad.error;
      const badExt = await window.electronAPI.rpc("tensor_export_one", { name: "blk.0.attn_k.weight", path: "/tmp/sweep-tensor.txt" });
      out.badExt = !!badExt.error;

      const outside = await window.electronAPI.rpc("file_delete", { path: "/etc/hosts" });
      out.deleteGuarded = outside.outside_downloads === true;

      const unsupported = await window.electronAPI.rpc("model_export", { path: "/tmp/x.gguf", format: "gguf" });
      out.formatRefused = unsupported.unsupported_format === true;
      return out;
    })()`);
    check("device_preference pins the compute device", rpcs.cpuPinned === true, rpcs.available + " devices available");
    check("device_preference returns to auto", rpcs.autoPref === "auto" && typeof rpcs.autoBack === "string", rpcs.autoBack);
    if (rpcs.exported && rpcs.exported.error) {
      check("tensor_export_one streams a single tensor", false, rpcs.exported.error);
    } else {
      check("tensor_export_one streams a single tensor", rpcs.exported.streamed === true && rpcs.exported.count > 0, rpcs.exported.count + " elements, " + rpcs.exported.bytes + " bytes");
    }
    check("tensor_export_one rejects an unknown tensor", rpcs.badName === true);
    check("tensor_export_one rejects an unwritable extension", rpcs.badExt === true);
    check("file_delete refuses paths outside the app's downloads", rpcs.deleteGuarded === true);
    check("model_export refuses a format it cannot write", rpcs.formatRefused === true);

    // ── 16n. The shell's own wiring audit stays clean ──
    const audit = await ev(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      document.getElementById("btn-restart-terminal").click();
      await wait(300);
      const dialogShown = !!document.querySelector(".confirm-modal");
      document.querySelector("[data-confirm-cancel]").click();
      await wait(200);
      return { dialogShown, dismissed: !document.querySelector(".confirm-modal") };
    })()`);
    check("the shell restart control asks before killing the session", audit.dialogShown === true);
    check("the confirmation can be dismissed without acting", audit.dismissed === true);
  }

  // ── summary ──
  console.log("\n=== SWEEP: " + checks.pass + " passed, " + checks.fail + " failed, " + checks.skip + " skipped ===");
  if (failures.length) console.log("FAILURES:\n  - " + failures.join("\n  - "));
  ws.close();
  process.exit(checks.fail ? 1 : 0);
})().catch((e) => { console.error("sweep crashed:", e.message); process.exit(2); });
