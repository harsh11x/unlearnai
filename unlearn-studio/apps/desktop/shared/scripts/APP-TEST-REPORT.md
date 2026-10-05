# Remap Studios — Full Application Test Report

Date: 2026-10-04 · Branch `main` · macOS arm64
Model under test: `~/Downloads/remap-studio-models/qwen2.5-coder-0.5b-q4_k_m.gguf`
(491 MB, qwen2, 291 tensors, 219 layers, 630.2 M params, Q4_K_M)
Harness: Electron dev build with `--remote-debugging-port=9333` (CDP).

## Test suites (all run against the current file state)

| Suite | What it covers | Result |
|---|---|---|
| `scripts/verify-app-sweep.js` (new) | 14 sections: every page, modal, menu, button, shortcut, real system shell, dock panes, chatbot, heatmap readability, weight-explorer analytics, 3D backdrop + zoom-depth range, and every backend RPC | **202 passed, 0 failed, 6 skipped** |
| `/tmp/cdpdrive/verify-all.js` | Core end-to-end (load → inspect → tree → heatmap → unlearn → CPU/RAM → 3D) | **28 / 28** |
| `/tmp/cdpdrive/uiflow.js` | Real UI flow incl. unlearn + inspector pending banner | **9 / 9** |
| `scripts/verify-nn3d-graph.js` | nn3d graph builder / palettes / layout maths | **all checks passed** |
| `scripts/verify-weight-editing.js` | Backend surgery + real 1.2 GB Safetensors export + reload as trainable | **all checks passed** |
| `scripts/verify-model-load.js` | GGUF load contract, dequant stats, heatmap, surgery | **all checks passed** |
| `backend/test_gguf_dequant.py` | Quantised dequantiser (Q4_K/…/Q8_0) | **27 / 27** |

Skipped on purpose (external flows, not safe to auto-run): Google/Apple OAuth click,
Razorpay upgrade checkout click.

## Fixed AI assistant + minimisable bottom dock (output | terminal)

The AI assistant is not part of the bottom dock any more: `#props-chat` is permanently
docked in the right sidebar **under Properties** and has no close or hide control at all —
nothing in the UI or the internal dock API can cut it down. The only thing that changes is
its height: the horizontal divider above it drags the split (`--chat-h`, 120–600 px) while
Properties takes the rest. Collapsing Properties (⌘⇧P) hides that list only — the assistant
stays up and fills the sidebar.

The bottom dock holds two panes — app output and interactive terminal — and both can be
minimised and closed:

| Pane | Content | Close | Divider |
|---|---|---|---|
| Left `.bp-logs` | app output / problems / log | `×` in the OUTPUT pane header, toolbar toggle, or a tab | `.bp-vhandle[data-resize="logs"]` |
| Right `.bp-terminal` | interactive terminal (`#terminal-log`) | `×` in the pane header, toolbar toggle, ⌘`, Escape while typing | absorbs the leftover width |

**Minimise:** the chevron button — or a click on the empty header strip — collapses the
whole dock to its 28 px header (`#bottom-panel.minimized`); clicking again restores it with
the same panes open. A pane toggle while minimised restores the dock and shows that pane,
and ⌘` restores the dock and toggles the terminal. The chat is untouched by all of it.

**Resizing:** the single divider sizes the output pane and the terminal absorbs the
leftover width, so output + terminal always fill the dock; the top edge of the dock drags
its height (`--bottom-panel-h`, 120–(window − 320) px). CDP-verified geometry at 1440 px
wide: properties 300×592 at x 1140, chat 299×280 at x 1141 y 352 (`chatInProperties: true`,
`chatControls: 0`, no chat toggle in the dock); dragging the output divider 718 → 808 px
left the terminal at 718 → 627 px and the two panes still summed to 1435 of 1440 px.
Screenshot: `dock-fixed-chat.png`.

Sweep section 9 checks the contract end to end: toolbar toggle hides *only* the terminal
(chat stays visible), each `×` closes one pane and the header toggle restores it, the
output fills the dock while the terminal is closed, the dock minimises to 28 px and
restores from both the chevron and the header, `setDockPaneVisible("chat", false)` cannot
hide the chat, the divider + panel-height drags work, and Escape while the terminal input
is focused closes that pane alone.

## Terminal: attached to the real system shell

The terminal pane is not a set of app built-ins any more: it spawns the user's own
shell in the Electron main process (`main.js` → `startTerminalSession`) and streams it
over IPC. macOS/Linux get `$SHELL` (`zsh -i` here); Windows gets `pwsh.exe`,
`powershell.exe`, or `cmd.exe` depending on what is installed. Deliberately no native
modules (no node-pty) — that is what lets the identical code build and ship for macOS
and Windows. The trade-off is pipes instead of a PTY: full-screen TUI apps do not work,
while every ordinary command, `cd`, environment variable and exit status behaves
exactly like the system terminal.

- Output streams line-by-line into the pane (`stdout` plain, `stderr` red); ANSI
escapes are stripped, `\r` redraws collapse to their last segment, and the log is
capped at 3 000 lines.
- The shell's prompt is replaced by one carrying a `__REMAP_CWD__…__END__` marker
(injected for zsh/bash, best-effort for PowerShell), so the pane header shows the live
working directory and the prompt never clutters the log. Shells that ignore it fall
back to raw output after 1.5 s; rc-file errors are still surfaced either way.
- `cd`, exported variables, aliases and rc-file PATH setup persist for the session.
- Ctrl+C sends SIGINT to the shell's process group, but only while a child process is
actually running (checked with `pgrep -P`): signalling an idle zsh makes it discard
the next command line, which a real terminal never does. An idle Ctrl+C just prints
`^C`. Windows pipes cannot deliver a console Ctrl+C, and the pane says so.
- `exit` reports the exit code; the next command starts a fresh session.
- App commands stay local: `clear`, `help`, `status`, `layers`, `tensors`, `export`,
`open <path>`, `unlearn`. Everything else goes to the shell.

Sweep section 9 (`TERMINAL + SYSTEM SHELL`, 45 checks) runs `echo`, `$((6*7))`, `pwd`,
`cd /tmp`, a failing `ls` for stderr, an exported variable, Ctrl+C on a `sleep`, `exit`
and an automatic restart — all against the real machine — alongside the pane/dock
contract from the previous section. The same contract was first proven with a
standalone CDP pass (`/tmp/cdpdrive/remap-terminal-check.js`: 16/16 checks).
Screenshot: `terminal-system-shell.png`.

## Packaged builds (macOS + Windows)

Both installers were built from the same tree with electron-builder 25.1.8 and
Electron 33.4.11, unsigned (`identity` is explicitly null for macOS, no certificate
for Windows):

| Artifact | Path | Size | SHA-256 (first 16) |
|---|---|---|---|
| macOS arm64 DMG | `unlearn-studio/apps/desktop/dist/mac/Remap Studios-1.0.0-arm64.dmg` | 112,171,771 B | `77f44a4fc080e0a8` |
| Windows x64 NSIS installer | `unlearn-studio/apps/desktop/dist/win/Remap Studios-1.0.0-x64.exe` | 93,192,240 B | `c8bec423218591bd` |

Both were rebuilt last after the heatmap + Weight Explorer work and then again after the
3D backdrop / zoom-depth fix (macOS 2026-10-04 23:56, Windows 23:59) and copied to
`~/Desktop` — the copied files hash byte-for-byte identical to the build outputs.
`hdiutil verify` reports the DMG checksum is VALID; the Windows artifact is a
`PE32 … Nullsoft Installer self-extracting archive`, and the payload that goes into it
(`dist/win/win-unpacked/resources/app.asar`) carries the same engine (`nn3d.js` 1.3.2,
`SURFACE_TONE`, `depthRange`, `worldRadius`) as the DMG.

The DMG was mounted, the app extracted to a clean directory and launched with CDP on
port 9455:

- Sections **[6] + [7]** ran green against that payload (36/36, exit 0) with the same
  rendered contrast values as the dev build (p5=72 / p95=182, 253 distinct levels).
- Sections **[5] + [6] + [7]** — including the four new backdrop / zoom-depth checks —
  ran green against the same payload: **55 passed, 0 failed, exit 0**, reporting
  surface 12.86 at both viewport corners, grid 25, `far=1384px`, `0/291` nodes outside
  the frustum at 1.0×–3.2× and the graph painted at every zoom step (11.19% → 2.25%).

Because the terminal is native-module-free, the Windows build cross-compiles cleanly
from macOS: `win-unpacked/resources/app.asar` contains the same terminal code paths,
including the `pwsh.exe`/`powershell.exe`/`cmd.exe` fallbacks, and `Remap Studios.exe`
is a PE32+ x86-64 binary. The packaged macOS app was then launched from
`dist/mac/mac-arm64/Remap Studios.app/Contents/MacOS/Remap Studios` with CDP and
re-ran the terminal contract against the shipped bundle: 16/16 (session start, `echo`,
arithmetic, `pwd`, `cd`, stderr, env vars, Ctrl+C, app commands, clear, exit/restart).

## Inventory tested, one by one

**Pages / tabs (5):** Visualization, Weight Explorer, Heatmap, Unlearn, Model Catalog —
each activates its panel; all reachable via Cmd+1–5.

**Modals (6):** Settings (5 pages), Export, Keyboard Shortcuts, About, Command Palette (29 commands),
menu dropdowns (File 6, Edit 6, View 7, Run 4, Help 4).

**Buttons (43):** command palette, open model (3), open folder (3), export, terminal toggle,
settings (top bar + status bar), upgrade Pro/Business (presence + plan logic), cancel subscription,
sign out, restart backend, export model, close buttons (settings/export/shortcuts/about),
activity settings, refresh tree, collapse all, view 2D/3D, 3D layout/spin/color/reset,
filter weights, heatmap zoom in/out, refresh catalog, start unlearn, unlearn reset,
chatbot send, status view, clear terminal, terminal send, auth guest/google/apple/submit.

**Keyboard shortcuts:** Cmd+K palette, Cmd+O/Cmd+Shift+O open, Cmd+E export, Cmd+, settings,
Cmd+B sidebar, Cmd+Shift+P properties, Cmd+` terminal, Cmd+Shift+R unlearn, Cmd+/ shortcuts,
Cmd+1–5 tabs, Cmd++/−/0 zoom, G 2D↔3D, L/C/R/Space in 3D, Escape closes overlays.

**Terminal:** real shell session, `echo`, shell arithmetic, `pwd`, `cd`, `ls`, stderr,
env vars, Ctrl+C, `exit`/restart, app commands (`help`, `status`, `layers`), unknown
command, clear.

**Backend RPC methods (23):** system_info, device_info, device_monitor, model_load,
model_load_folder, model_layers, model_summary, weight_list, weight_stats, weight_heatmap,
weight_gradient, tensor_info, tensor_edit, tensor_delete, tensor_reset, tensor_pending,
tensor_export, model_export, unlearn_start, unlearn_progress, unlearn_cancel, unlearn_stop,
eval_probes — plus unknown-method error handling.

## Bugs found and fixed during this sweep

1. **7 dead buttons** had no listeners at all: refresh tree, collapse all, filter weights,
   heatmap zoom in/out, unlearn reset → now wired with real behaviour (filter input,
   zoom with scroll + pixelated scaling, tree collapse, idle-canvas reset).
   `btn-new-file` was decorative with no backend — removed from the UI.
2. **The entire viewport HUD was invisible** — `#viewport-hud` shipped with `class="hidden"`
   and nothing ever removed it, so the 2D/3D switch, layout/colour/spin/reset controls and the
   fps readout were unreachable. Now revealed at init; 3D-only groups still toggle per mode.
3. **`Cmd+Shift+P` / `Cmd+Shift+O` / `Cmd+Shift+R` never fired** — with Shift held `e.key` is
   uppercase (`"P"`) but handlers compared to lowercase. Keys are now normalised; all three
   shortcuts verified to invoke their actions (properties toggle, open-folder, unlearn run).
4. **Weight Explorer layer matching was a substring match** — selecting the `output` layer also
   pulled in every `blk.N.attn_output.weight` from all 27 blocks. Now a strict segment-prefix match.
5. **Collapsed tree groups showed a broken “+N more” row** that did nothing; expanding a group
   also didn’t lift its collapsed flag. Fixed both, and collapse state now resets on model load.
6. **Terminal unknown commands** printed `Error: Unknown method: shell_exec`. Now
   “Unknown command: X. Type 'help' for available commands.”
7. **GGUF export dead-end:** with no pending edits, “Export Model” called `model_export`, which
   cannot work on a quantised model (“No model loaded”). Quantised models now always route through
   `tensor_export`, which converts to trainable Safetensors (verified: 1.2 GB, 290 tensors, reloads).
8. **Auth timeout limbo:** if Firebase didn’t answer in 5 s the app appeared without a user —
   Settings showed “Not signed in” and Sign Out silently did nothing. The timeout now falls back
   to a guest session, keeping settings/plan/sign-out consistent.
9. **Quantised dtype marker** in the 3D palette was slightly off the intended amber; brightened to
   `[0.93, 0.68, 0.32]` (the nn3d palette suite now passes).
10. **The 3D fps counter never came back after leaving and re-entering 3D.** The readout loop
    stops itself whenever the view mode isn’t `3d`, but it was only started once when the engine
    was created — after any 3D → 2D → 3D round trip the HUD stayed at “— fps” forever while the
    scene kept rendering. The loop is now re-armed on every entry into 3D (`startFpsLoop3D()`,
    called from `setViewMode("3d")`).
11. **Connection geometry was never rebuilt on layout changes.** Node positions were re-laid-out
    on a layout switch, but the fibre vertex buffers still held the previous layout’s coordinates —
    switching Layers → Sphere kept drawing the old woven grid. Fibres, stage planes, flow
    particles and stage metadata are now rebuilt together with the nodes.
12. **The heatmap rendered as a flat grey square** — the panel really was “not working”, just not
    in the way the RPC suggested: min–max normalisation over a weight tensor puts ~95% of the
    values (which cluster tightly around zero) into a single shade, because a handful of outliers
    pin `min`/`max`. Measured on `blk.0.attn_k.weight`: the rendered luminance spanned 104→120
    with 95.1% of pixels in one bucket. Normalisation now runs on a robust 1–99% window with the
    tails clamped (and reported), which took the same tensor to p5=72 / p95=182 across 253 levels.
13. **The heatmap tensor picker had no `change` listener at all.** Choosing a different tensor
    updated the `<select>` value and nothing else — the canvas, the label and `state.heatmapData`
    all kept pointing at the tensor the tab was opened with. The old sweep check only asked for
    “pixels are painted”, so a stale repaint passed it; the check now requires the label and
    `state.heatmapData.tensor` to follow the selection.
14. **The Settings “Heatmap color scheme” select did nothing.** `renderHeatmap()` wrote
    `R=G=B` unconditionally, so grayscale/viridis/magma/inferno were all identical. All four now
    paint real ramps, plus a diverging `coolwarm` option for signed weights.

## Cinematic 3D redesign — engine v1.1.0 (`nn3d.js`)

Visual target: the reference “cinematic neural network dataflow” image. The redesign is an
upgrade of the existing engine — same public API, same data pipeline, no feature removed.

What changed:

- **Palette** — continuous architecture-depth ramp: cool white → ice → electric blue → indigo →
  violet → magenta → coral (`#F1F4FA … #FF8FA3`). The legend gradient in CSS mirrors it.
- **Near-black stage** — the composite exposure chain is tuned so the background actually
  renders at ~#050607 (it previously gamma-lifted to a visible grey), fog fades distant nodes
  into black, and the faint reference grid stays barely visible.
- **Volumetric clusters** — each architectural stage is a Fibonacci sphere shell in XYZ
  (rotating reveals real depth — no flat discs).
- **Glass layer planes** — one translucent YZ panel per stage, tinted by the stage colour with a
  faint luminous frame; real 3D geometry that moves with the camera. *Removed in v1.3.1 — see
  “Background slabs removed” below.*
- **Curved weight-aware fibres** — every connection is a sagging quadratic bezier sampled into 8
  screen-space chords, with global-t endpoint fades; strength derives from the endpoint
  parameters (strong pathways brighter and slightly thicker).
- **Flow particles + input/output streams** — per-fibre particles travel along the curve
  (additive, subtle); a scattered field converges on the input stage and another streams out of
  the output stage.
- **Stage ordering** — stages are re-ordered into architecture reading order (embeddings first,
  blocks ascending, outputs last) instead of tensor-list order, which for GGUF/state-dicts can
  start with `output.weight`.
- **Floating stage labels** — “01 / INPUT EMBEDDING / n = 1”, “02 / BLOCK 01 / n = 12”, … every
  value from the loaded model, projected from the live camera; end stages always show and dense
  mid-stages follow a size-based level-of-detail rule.
- **Unlearning marks** — `setUnlearnTargets()` tints marked neurons orange/red with an ember halo
  and lights every attached fibre; the app mirrors pending surgery edits onto the scene after
  edits, deletes, reverts, unlearn runs and model loads.

Verified on the real model (qwen2.5-coder-0.5b, 291 nodes / 580 links / 27 stages): stage 01 =
INPUT EMBEDDING (white, n=1) → BLOCK 01…26 (n=12) → stage 27 = OUTPUT LAYER (coral, n=1); the
scene spans 83–84% of the viewport (target 75–85%); 70.6% of canvas pixels are near-black after
re-exposure; marking BLOCK 01 produced 2 778 orange pixels where the unmarked capture had none;
switching Layers → Sphere shrinks the lit bounding box (0.83 → 0.45 width) proving fibres follow
the nodes. Console clean, 60–61 fps, all suites re-run green.

## Straight stage line + visible connections — engine v1.2.0 (`nn3d.js`)

Two problems reported against v1.1.0: the Layers layout was a serpentine zig-zag (input top
to output bottom), and most connection fibres were invisible.

- **One straight row.** `applyLayout()` no longer wraps stages into a serpentine grid. All
  stages sit on a single line at y = 0 with a fixed pitch (2.35 × the busiest cluster radius),
  input on the left and the output stages on the right — the layout *is* the reading order.
  `frameGraph()` fits that line with tighter margins (1.15 horizontal, 1.35 depth) so the row
  fills ~87% of the viewport width.
- **The invisible strings were three separate bugs.**
  1. *Depth was never cleared between frames.* Fibres are depth-tested and drawn before the
     neurons, so each frame tested against the **previous** frame's sphere depths — stale
     occluders silently clipped fibres as soon as the camera moved. The scene depth buffer is
     now cleared every frame.
  2. *Premultiplied output with straight-alpha blending.* `FS_LINE` wrote `vec4(col * a, a)` while
     the pass blends with `SRC_ALPHA, ONE_MINUS_SRC_ALPHA`, so every fibre colour was multiplied
     by alpha twice (colour ≈ a², ~0.04 at the old opacity). It now writes `vec4(col, a)`.
  3. *Fades ate the fibres.* Endpoint fades covered 16% of each end (short links started and
     ended inside the fade), the directional ramp dimmed one end to 0.55, and fog multiplied
     brightness by up to 0.15. Fades are now 8%, the ramp bottoms out at 0.78 and fog at 0.5.
  Opacity 0.20 → 0.34, line width 0.72 → 1.05 px.
- **Labels for every stage.** In the row layout captions alternate above and below the line
  (so all 27 read at once) on a compact 8 px type scale; measured 27/27 shown with **zero
  bounding-box overlaps**. Wrapped layouts keep the old size-gated LOD.
- **Last two stages are named properly:** `output.weight` = OUTPUT LAYER, `output_norm.weight`
  = FINAL NORM (previously both read “OUTPUT LAYER”).

Verified on the real model: rows Y spread ±0.39 world units (a true line), stage X strictly
monotonic, 27 stages over x −276…277; **26/26 inter-stage gaps contain visible fibres**
(peak brightness 157–182 over a ~11 background) with 21.6 K fibre-band pixels; 60–61 fps;
zero console errors; unlearn marks still tint the scene (BLOCK 01 → 667 orange pixels vs 0
unmarked). Screenshots: `nn3d-straight-row.png`, `dock-independent-panes.png`.

## Wide volumetric columns — engine v1.3.0 (`nn3d.js`)

Reported against v1.2.0: the straight line rendered as a thin, shrunken necklace of beads in
an otherwise empty viewport. The row itself was already full width — it was using ~5% of the
viewport's height, and a 27-column line fitted to the window leaves all of that height spare.

- **Columns instead of beads.** Each stage in the straight-line layout is now a tall, slightly
deep sheet of neurons (sunflower/Vogel disc in Y–Z, ranked top→bottom so fibre bundles flow
down the line). `spreadY` is derived from the world-space height that stays visible once
`frameGraph()` has fitted the row's width (~52% of it), so the columns fill the viewport at any
window shape; a lone input/output tensor sits exactly on the row's centre line. Every column is
re-centred on its line after jitter — a dozen points are not a balanced pattern and a drifting
column broke the even rhythm of the row.
- **Neurons sized for the sheet.** The straight-line layout draws neurons at 0.28 × local
nearest-neighbour spacing (other layouts keep 0.30): measured 4.6 / 8.4 / 15.1 px radii
(9 / 17 / 30 px diameters) on a 29.6 px column pitch — the largest neuron still fits between
columns.
- **Framing.** Layered margins are now 1.07 horizontal / 0.98 vertical (the vertical term must
not fight the columns); sphere/helix keep 1.15/1.15/1.35. `canvasAspect()` falls back to the
host element when the canvas is hidden, and the framing distance is stored for the zoom-out
clamp — the old fixed `180` clamp snapped the camera forward the moment the wheel turned.- **Panels wrap the stage volume per axis** (tall column → tall panel) — *the panels themselves
  were removed in v1.3.1; `extentY` now only drives caption clearance* — and `setLayout()` now
  also re-frames, since each layout lives on its own world scale.

- **Fibres widened and smoothed:** `EDGE_SEG` 8 → 12, width 1.15 → 1.5, opacity 0.34 → 0.40,
and fog pushed out (lines 1.15R–2.9R, spheres 1.10R–3.0R) so the ends of the row stay bright.
- **Captions** use a 9 px scale (was 8), long titles wrap inside 74 px, and each caption sits
directly above/below its column — the x comes from the column projection, not the raised anchor
point (the camera's elevation fanned raised anchors outwards). A hairline stem joins caption to
column, end captions are nudged inside the frame instead of being clipped, and when the camera
foreshortens the columns the line thins its captions (lower lane first, then every 2nd/3rd/6th)
rather than smearing them together.
- **Reshape on a material canvas change:** a `|Δlog aspect| > 0.10` in `resize()` rebuilds the
layout and re-frames, so dock drags and window resizes keep the row filling the viewport. A
user-adjusted camera (orbit/pan/zoom/focus) survives the reshape — the columns are rebuilt but
the view is not thrown away. Measured across dock heights: canvas 824×556 → extentY 97, 824×676
→ 109, 824×376 → 72, captions 27/27 inside the frame at every shape, 60–61 fps, no errors.

Verified on the real model (canvas 824×556): stage pitch 28–33 px, X strictly monotonic, clusters
span 52% of the viewport; **26/26 inter-stage gaps contain visible fibres** (peak brightness
174–189); **27/27 captions shown, zero overlaps, none outside the frame** head-on, thinning to
14 / 6 labels at 20° / 50° with no clipping; unlearn marks BLOCK 01 → 10 773 orange pixels vs 0
unmarked; litPct 82, colouredPct 16 (still not neon); 60–61 fps; zero console errors. Suites:
sweep 153 / 0 / 6, verify-all 28/28, uiflow 9/9, nn3d graph checks green. Screenshot:
`nn3d-wide-columns.png`.

## Background slabs removed — engine v1.3.1 (`nn3d.js`)

Reported against v1.3.0: “remove that black sheet from background” — the straight-line view drew
large dark rectangular sheets standing behind and between the neuron columns.

**Cause.** The layer-plane pass (one instanced translucent YZ quad per architectural stage). Each
quad's own fill is nearly invisible (`alpha ≈ 0.025 × 0.30`), but the v1.3.0 tall columns made every
quad ~110 world units high and 27 of them stack along the dataflow axis. Viewed off-axis they
overlap into a continuous slab, and the compositing chain darkens the result: the fill sits below
the backdrop's own luminance, so each additional panel multiplied the background down instead of
glowing over it. Isolated by toggling the pass (`quality: "low"` skips it) at a fixed pose — the
sheets vanished and the reference look returned.

**Fix.** The plane pass is deleted outright: `VS_PLANE`/`FS_PLANE`, `progPlane`, the instanced
`planeVAO` + five instance buffers, the static quad setup, `uploadPlanes()`, its call sites in
`relayout()` and `setModel()`, the Pass 3 draw block, and the program/VAO teardown entries. The
render pass comments were renumbered (connections → Pass 3, neurons → Pass 4, flow → Pass 5) and
the now-unused `extentZ` field was dropped from `refreshStageMeta()`; `extentY` and `nodeR` stay,
because `stageAnchors()` still uses them to place captions clear of each column. No other geometry,
shader, uniform or public API method changed.

Verified after removal (canvas 824×556, 27 stages, 291 nodes): the slabs are absent at every
angle — head-on and at 20° / 50°; **26/26 inter-stage gaps still contain visible fibres** (peak
brightness 178–188, up from 174–189); 27/27 captions head-on with 0 overlaps and none outside the
frame, thinning to 14 shown / 2 tiny overlaps (123 px²) at 20° — identical to the v1.3.0 label
behaviour, so nothing regressed; node px radii unchanged at 4.6 / 8.4 / 15.1; litPct 81.1,
colouredPct 16.5; 60 fps; zero console errors. Suites re-run green: sweep **153 / 0 / 6**,
verify-all **28/28**, uiflow **9/9**. Screenshot: `nn3d-no-planes.png`.

## Backdrop fill removed + zoom depth range fixed — engine v1.3.2 (`nn3d.js`)

Reported against v1.3.1: “i told you to remove that black filter in visualiazation, that black
background — keep that grid only as it was originally. When i zoom out the network goes behind it.”

**Two separate defects, one symptom.**

1. *The backdrop painted a black wash.* The background pass drew an opaque vertical charcoal
   gradient (linear 0.0012 → 0.0004, i.e. ~#0c0c0c at the top of the viewport down to ~#070707 at
   the bottom) under the reference grid. That is darker than the app's own `--bg` (#0d0d0d) and it
   differed from top to bottom, so the viewport read as a black image laid over the panel instead
   of as the panel itself. Measured on the old build, right-hand strip of the viewport in 20 px
   bands: 11.99 luma at the top → 7.22 at the bottom.
2. *A fixed far plane clipped the graph.* `drawScene()` built its projection with
   `m4perspective(…, 0.1, 600)` no matter where the camera was. The framed distance is ~411–590
   and the graph's far side already sat at 686, so the far half of the network was cut away even at
   the default view — and from ≈1.6× the framing distance (**r ≈ 660**) *every* node was past the
   far plane. Measured before the fix by reading the engine's own frame back while zooming out:
   12.37% lit (r 500) → 9.80 (560) → 6.59 (590) → 2.87 (620) → **0.00% (660 and beyond)**. The
   scene kept drawing the grid and nothing else — which is exactly “the network goes behind it”.

**Fix.**

- **Grid only, on the panel's own surface.** The pass now paints `SURFACE_TONE =
  vec3(0.0016, 0.0017, 0.0020)` — the value `--bg` (#0d0d0d) resolves to through the composite
  exposure chain — plus the reference grid. No gradient, no wash. The grid keeps its 24 × 14
  geometry and now lands ~#1a1c22 on the #0d0d0d surface. Neuron/fibre fog fades into the same
  tone instead of `vec3(0.0008, …)`, so distant geometry dissolves into the panel rather than into
  a darker halo of its own.
- **Depth range derived from the camera and the graph.** `state.worldRadius` (bounding radius of
  the laid-out nodes including their neuron radii, refreshed by `setModel()` and `relayout()`)
  drives `near = max(0.1, dRadius − worldRadius × 1.9)` and
  `far = dRadius + worldRadius × 2.8 + 20`. A new `depthRange()` accessor returns the planes the
  last frame actually used, so tests check the real frustum instead of re-deriving the formula.
  `NN3D.version` → **1.3.2**.

**Verification** (real model, 291 nodes / 27 stages / 580 links, frames read back with
`readScenePixels()`):

- Backdrop: top-left corner **12.86** and bottom-right corner **12.86** — identical, so no vertical
  gradient — with grid lines at **25.72** against that surface (a grid you can see, no black image).
- Depth: **0 of 291 nodes outside the frustum** at 1.0×, 1.3×, 1.8×, 2.4× and 3.2× the framing
  distance; lit pixels 10.57% → 5.74% → 3.42% → 2.10% down the zoom-out range, i.e. the graph
  shrinks but never vanishes. The same sweep against the old projection reported 291/291 nodes
  outside the frustum from 1.8× on.
- Section **[5]** gained four checks for this — “3D backdrop is the panel surface, not a dark
  wash”, “3D backdrop keeps the reference grid”, “network stays inside the frustum through the
  whole zoom-out range”, “network still painted at every zoom-out step”. All four were confirmed to
  **fail against a copy of the file with the old fixed far plane** (291/291 out, 0.00% painted)
  before being accepted. Sweep **202 / 0 / 6**, `verify-nn3d-graph.js` green, 60–62 fps.
- Screenshots: `nn3d-backdrop-grid.png` (framed view — panel surface + grid only) and
  `nn3d-zoomout-full-graph.png` (maximum zoom-out — the whole graph still on screen).

Both installers were rebuilt after this fix and copied to the Desktop; sections [5] + [6] + [7]
of the sweep pass against the payload extracted from the finished DMG (55/0, see “Packaged
builds”).

## Heatmap readability + Weight Explorer 2.0

### Heatmap

- **Robust display window.** `weight_editor.heatmap()` normalises on the 1–99 percentile window
  instead of `min`/`max` and clamps what falls outside it, reporting
  `display_min/display_max`, `clipped_below_pct`, `clipped_above_pct`, `median`, `param_count`,
  the sampled `grid` size and the `peak` value with its tensor coordinates. The label still shows
  the tensor's true `min=/max=/mean=` so the statistics stay honest about outliers.
- **Five real palettes** (grayscale, viridis, magma, inferno + diverging coolwarm), interpolated
  from anchor stops and cached as a 256-entry LUT. Diverging ramps re-project the window
  symmetrically around zero so the neutral colour lands exactly on `w = 0`. The choice persists in
  `localStorage` and re-colours from the cached sample without re-reading the tensor.
- **Colour legend** with the real value at each end (plus the `0` marker on diverging ramps) and a
  hover tooltip naming the display window.
- **Header chips**: tensor name, storage type, `rows × cols`, params, `N×N sampled`, active scheme,
  `peak <value> @ [row, col]` and a `clamped N%` warning when the tails were truncated.
- **Hover readout** reports the value under the cursor in tensor coordinates
  (`w[90922, 268] = -0.0139 · grid 76,38`), and clicking the map opens that tensor in Properties.

### Weight Explorer

- **Global search** across all 291 tensors (not just the chosen layer), with its own summary and a
  clear “no match” state; the header filter stays layer-scoped so the two work independently.
- **Sort** by model order / name / params / size.
- **Summary bar** per view: tensor count, total params, total bytes, storage-type mix, plus edited
  and deleted counters.
- **Per-tensor statistics streamed into each row** — `μ`, `σ`, `|max|`, `zeros %` and a 48-bin
  distribution sparkline drawn from the real histogram. Rows paint instantly and fill in behind a
  3-way concurrency pool; any in-flight work is invalidated when the selection changes.
- **Cost-aware profiling**: tensors above 2 M params (the 136 M embeddings, `lm_head`) wait for an
  explicit “Load stats” click instead of running a full streaming pass unprompted. The header
  chart button toggles per-tensor statistics on/off entirely.
- **Layer picker labels** now carry the tensor count per layer (`blk.0.attn_q · 2 tensors · 803.7K`),
  and rows badge pending surgery (`N edits`) and deletion, and offer a `▦` action that opens that
  tensor directly in the Weight Heatmap.

### Verification added for both

Section **[6]** now asserts the toolbar, per-layer tensor counts, the summary totals, streamed
statistics + sparklines (2/2 rows), sort ordering by name and size, global search across layers,
and the on-demand profiling of huge tensors. Section **[7]** asserts rendered contrast
(`distinct > 32`, `p95 − p5 > 40`) instead of merely-lit pixels, the header chips, the legend and
its diverging zero marker, all five palettes (grayscale monochrome vs colourmaps), the
selection-follows-tensor check that used to pass vacuously, the hover readout, click-to-inspect,
and the weight-row → heatmap jump end to end. **36/36 in sections 6+7, 198 passed overall.**

Both installers were rebuilt afterwards, so `dist/mac` + `dist/win` now carry this work
(`../backend/**/*.py` is bundled as extraResources — verified present in both payloads).

## Known limitations observed (not bugs)

- `weight_gradient` / `eval_probes` report “No model loaded” for GGUF — a quantised model has no
  autograd graph to read gradients or run probes from.
- `model_export` can only export live (non-quantised) state dicts; GGUF goes through
  `tensor_export` by design.
- “Start Unlearning” stays enabled with no target selected; clicking logs
  “Select a target capability first”. Could be disabled until a target is chosen.
- Full test-export artifacts clean themselves up (verified no 1.2 GB leftovers).

## Test hygiene changes (harness, not app)

- `verify-all.js`: heatmap probe resets pending surgery edits first; 3D palette probe now pins
  colour mode + layout + camera so the reading is deterministic.
- `uiflow.js`: reads `textContent` instead of `innerText` (innerText is empty inside hidden
  panels — that was the source of intermittent “empty button label” failures).
- `verify-app-sweep.js`: the 3D fps readout is now polled up to 12 s (with a resize + render
  nudge midway); the unlearn “button returns to idle” check polls up to 30 s instead of
  sampling immediately after the edits appear.
- `verify-all.js`: CPU variation is sampled from the raw `cpuUsagePercent` RPC value (the HUD
  rounds to whole percent, so displayed samples can look constant while usage varies).
- `main.js` (dev only, no packaged behaviour change): Chromium switches
  `disable-backgrounding-occluded-windows` / `disable-renderer-backgrounding` plus
  `backgroundThrottling: false` keep rAF and timers alive while the window is covered by other
  apps, so CDP verification is deterministic. Packaged builds keep the default throttling.

## Still pending (next phase for the visualizer)

The cinematic engine core is landed. Not yet built (phase 2, from the same spec): search/locate
with camera fly-to, trace upstream/downstream path highlighting, camera presets (front/side/top/
back, layer/node focus), before/after unlearning comparison with ghosted nodes, activation
inspector and the WEIGHTS / ACTIVATIONS / FEATURE MAPS inset panels, smart LOD tiers, and the
extended toolbar (Focus / Connections / Activations / Labels / Performance). The DMG should be
rebuilt once that phase lands.
