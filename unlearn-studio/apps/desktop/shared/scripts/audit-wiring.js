// Static wiring audit for Remap Studios.
//
// Cross-references every layer of the app so dead ends are found without
// clicking through the UI:
//
//   main.js  ipcMain handlers  <->  preload.js exposed API  <->  renderer usage
//   index.html data-action     <->  handleMenuAction() cases
//   index.html interactive ids <->  renderer/script references
//   COMMANDS palette entries   <->  callable actions
//
// Usage: node scripts/audit-wiring.js [--json]
// Exit code is 0 unless a hard dead end is found (a control that can never
// do anything), so it can be used as a gate in CI.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const mainJs = read("main.js");
const preloadJs = read("preload.js");
const appJs = read("renderer/app.js");
const indexHtml = read("renderer/index.html");
const nn3dJs = read("renderer/nn3d.js");

const findings = [];
const note = (severity, area, message) => findings.push({ severity, area, message });

// ── 1. IPC handlers in main.js ──
const mainHandlers = new Set();
for (const m of mainJs.matchAll(/ipcMain\.(?:handle|on)\(\s*"([^"]+)"/g)) mainHandlers.add(m[1]);

// ── 2. IPC channels preload.js exposes ──
// Both `invoke("x")` and `send("x")` and `on("x")` count as touching a channel.
const preloadChannels = new Set();
for (const m of preloadJs.matchAll(/ipcRenderer\.(?:invoke|send|on)\(\s*"([^"]+)"/g)) preloadChannels.add(m[1]);

// Channels main.js pushes to the renderer are one-way (webContents.send) and
// correctly have no ipcMain handler — do not flag those.
const pushChannels = new Set();
for (const m of mainJs.matchAll(/\.webContents\.send\(\s*"([^"]+)"/g)) pushChannels.add(m[1]);
// main.js also pushes through a sendToRenderer(channel, payload) helper.
for (const m of mainJs.matchAll(/sendToRenderer\(\s*"([^"]+)"/g)) pushChannels.add(m[1]);

for (const ch of preloadChannels) {
  if (!mainHandlers.has(ch) && !pushChannels.has(ch)) {
    note("error", "ipc", `preload exposes "${ch}" but main.js neither handles nor pushes it`);
  }
}
for (const ch of mainHandlers) {
  if (!preloadChannels.has(ch) && !ch.startsWith("terminal:")) {
    note("warn", "ipc", `main.js handles "${ch}" but preload never exposes it`);
  }
}

// ── 3. preload API methods vs renderer usage ──
const apiMethods = [];
{
  const body = preloadJs.split("exposeInMainWorld")[1] || "";
  for (const m of body.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*[:(]/gm)) apiMethods.push(m[1]);
}
const unusedApi = [];
for (const name of apiMethods) {
  // Any mention in the renderer counts (helper wrappers often alias these).
  const re = new RegExp(`\\b${name}\\b`);
  if (!re.test(appJs) && !re.test(nn3dJs)) unusedApi.push(name);
}
for (const name of unusedApi) {
  note("warn", "api", `electronAPI.${name} is exposed but never used by the renderer`);
}

// ── 4. Menu actions declared in HTML vs handled in app.js ──
// Two independent action handlers: `.dropdown-item` goes through
// handleMenuAction(), `.context-menu-item` through handleContextAction().
// They are checked separately so a context-only action does not look dead.
function casesOf(fnName) {
  const fn = appJs.split(`function ${fnName}(`)[1] || "";
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  return new Set([...body.matchAll(/case\s+"([^"]+)"/g)].map((m) => m[1]));
}

// Walk the HTML so each data-action is attributed to the control it sits on.
const declaredActions = new Set();
const declaredContextActions = new Set();
for (const m of indexHtml.matchAll(/<div class="([^"]*)"[^>]*data-action="([^"]+)"/g)) {
  const cls = m[1];
  if (cls.includes("context-menu-item")) declaredContextActions.add(m[2]);
  else declaredActions.add(m[2]);
}

const handledActions = casesOf("handleMenuAction");
const handledContextActions = casesOf("handleContextAction");

for (const a of declaredActions) {
  if (!handledActions.has(a)) note("error", "menu", `dropdown item data-action="${a}" is not handled`);
}
for (const a of declaredContextActions) {
  if (!handledContextActions.has(a)) note("error", "menu", `context-menu item data-action="${a}" is not handled`);
}
for (const a of handledActions) {
  if (!declaredActions.has(a)) note("warn", "menu", `handleMenuAction case "${a}" has no menu item`);
}
for (const a of handledContextActions) {
  if (!declaredContextActions.has(a)) note("warn", "menu", `handleContextAction case "${a}" has no context-menu item`);
}

// ── 5. Stub handlers — branches that only log and do nothing real ──
for (const fnName of ["handleMenuAction", "handleContextAction"]) {
  const fn = appJs.split(`function ${fnName}(`)[1] || "";
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  for (const line of body.split("\n")) {
    const m = line.match(/case\s+"([^"]+)":\s*(.+)/);
    if (!m) continue;
    const impl = m[2].trim();
    // A branch is a stub when the whole body is a log/toast and nothing else
    // — no call into a real feature, no state change.
    const callsNothing = !/\b(open|set|cycle|toggle|switchTab|load|run|export|copy|undo|redo|select|handle|close|quit|apply|render)[A-Za-z]*\s*\(/.test(impl);
    const onlyMessaging = /^(if\s*\([^)]*\)\s*)?(log|toast)\s*\(/.test(impl);
    if (callsNothing && onlyMessaging) {
      note("error", "stub", `${fnName} case "${m[1]}" only writes a message: ${impl}`);
    }
  }
}

// ── 6. Interactive controls in index.html that no script references ──
// A control is "referenced" when its id appears anywhere in app.js (as a
// getElementById, querySelector, or inline handler argument).
const ids = new Set();
for (const m of indexHtml.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);
const interactiveTagRe = /<(button|input|select|textarea|a)\b[^>]*>/g;
const orphanControls = [];
for (const tag of indexHtml.matchAll(interactiveTagRe)) {
  const el = tag[0];
  if (/onclick=/.test(el)) continue; // inline handler present
  const idm = el.match(/id="([^"]+)"/);
  const cls = el.match(/class="([^"]*)"/);
  const id = idm ? idm[1] : null;
  if (id && new RegExp(`["'#]${id}["')]`).test(appJs)) continue;
  if (id && new RegExp(`getElementById\\(\\s*["']${id}["']`).test(appJs)) continue;
  if (cls) {
    const classes = cls[1].split(/\s+/).filter(Boolean);
    if (classes.some((c) => new RegExp(`["'\\.]${c}["'\\)]`).test(appJs))) continue;
  }
  // Generic delegated wiring: a listener bound via a data-* attribute (e.g.
  // querySelectorAll("[data-pane-close]") or btn.dataset.panel) is coverage too.
  const dataAttrs = [...el.matchAll(/data-([a-z-]+)="/g)].map((m) => m[1]);
  const covered = dataAttrs.some((attr) => {
    const camel = attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return new RegExp(`\\[data-${attr}\\]`).test(appJs) || new RegExp(`dataset\\.${camel}`).test(appJs);
  });
  if (covered) continue;
  if (/(type="hidden"|class="[^"]*hidden)/.test(el)) continue;
  orphanControls.push(id || el.slice(0, 60));
}for (const c of orphanControls) note("warn", "dom", `no renderer reference for control: ${c}`);

// ── 7. Command palette entries ──
{
  const cmdsBlock = appJs.split("const COMMANDS = [")[1] || "";
  const block = cmdsBlock.slice(0, cmdsBlock.indexOf("\n];"));
  const labels = [...block.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const actions = [...block.matchAll(/action:\s*([^,\n]+)/g)].map((m) => m[1].trim());
  if (!labels.length) note("error", "palette", "COMMANDS list could not be parsed");
  // Every entry must have an action callback.
  if (actions.length !== labels.length) {
    note("error", "palette", `${labels.length} palette labels but ${actions.length} actions`);
  }
  // Palette actions should not call log() only (that is a stub).
  for (const a of actions) {
    if (/^\(\s*\)\s*=>\s*log\(/.test(a)) note("warn", "palette", `palette action is log-only: ${a}`);
  }
  console.log(`palette entries: ${labels.length}`);
}

// ── 8. Reported in the UI but never implemented anywhere in the shell ──
// Every `openExternal` style link and TERMS/PRIVACY style href must resolve.
const hrefs = [...indexHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
for (const h of new Set(hrefs)) {
  if (h.startsWith("#") || h.startsWith("http")) continue;
  const rel = path.join(ROOT, "renderer", h);
  if (!fs.existsSync(rel)) note("error", "link", `href="${h}" does not resolve to a file`);
}

console.log(`\nmain.js IPC handlers:  ${mainHandlers.size}`);
console.log(`preload channels:      ${preloadChannels.size} (${pushChannels.size} pushed from main)`);
console.log(`preload API methods:   ${apiMethods.length}`);
console.log(`menu actions:          ${declaredActions.size} dropdown (${handledActions.size} handled) + ${declaredContextActions.size} context (${handledContextActions.size} handled)`);
console.log(`unused API methods:    ${unusedApi.length}${unusedApi.length ? " -> " + unusedApi.join(", ") : ""}`);
console.log(`unreferenced controls: ${orphanControls.length}${orphanControls.length ? " -> " + orphanControls.join(", ") : ""}`);

const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");
console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`);
for (const f of [...errors, ...warns]) console.log(`  [${f.severity === "error" ? "ERROR" : "warn"}] ${f.area}: ${f.message}`);

if (process.argv.includes("--json")) {
  console.log("\n" + JSON.stringify(findings, null, 1));
}
process.exitCode = errors.length ? 1 : 0;
