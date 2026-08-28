# Unlearn Studio — Desktop App

Cross-platform Electron IDE for AI model visualization and unlearning.

```
desktop/
├── shared/          # Core Electron app (shared across all platforms)
│   ├── main.js      # Electron main process (IPC, file dialogs, model parsing)
│   ├── preload.js   # Secure context bridge
│   ├── package.json
│   └── renderer/    # Frontend (HTML/CSS/JS — no framework, zero deps)
│       ├── index.html
│       ├── app.js   # All interactivity
│       └── styles/
│           └── main.css
│
├── mac/             # macOS-specific build config
│   ├── electron-builder.json
│   ├── entitlements.mac.plist
│   ├── build/icon.icns
│   └── README.md
│
├── win/             # Windows-specific build config
│   ├── electron-builder.json
│   ├── installer.nsh
│   ├── build/icon.ico
│   └── README.md
│
└── linux/           # Linux-specific build config
    ├── electron-builder.json
    ├── build/icons/
    └── README.md
```

## Quick Start

```bash
cd shared
npm install
npm run dev
```

## Build for Your Platform

| Platform | Command | Output |
|----------|---------|--------|
| macOS | `npm run build:mac` | `.dmg` (universal x64+arm64) |
| Windows | `npm run build:win` | `.exe` installer + portable |
| Linux | `npm run build:linux` | `.AppImage` + `.deb` + `.rpm` |

## What's Inside

### IDE Layout
- **Left sidebar** — Model Explorer (file tree of loaded model layers)
- **Center** — Tabbed workspace (Visualization, Weight Explorer, Heatmap, Unlearn)
- **Right panel** — Properties inspector (click any node to see details)
- **Bottom** — Output terminal (logs, status messages)

### Visualization Engine
- Canvas-rendered neural network with layer grouping
- Nodes sized by parameter count (larger = more params)
- Connections between adjacent layer groups
- Pan, zoom, hover inspection

### Weight Heatmap
- Generates a visual heatmap of weight matrices
- Select any layer from the dropdown
- Monochromatic rendering matching the IDE theme

### Unlearn Panel
- Configure target capability, method, hyperparameters
- Watch the unlearning process in real-time:
  1. **Erase phase** — Nodes are deleted one by one (red X marks)
  2. **Retrain phase** — Progress bar while the lean model retrains
  3. **Done** — Final stats displayed

### Model Support
- `.safetensors` — Full tensor metadata parsing (names, shapes, dtypes)
- `.pt` / `.bin` / `.onnx` — Detected as model files
- Model directories — Browsed for config files

## Architecture Decisions

**No framework, no bundler.** The renderer is plain HTML/CSS/JS for:
- Zero build step — instant `npm run dev`
- Smallest possible bundle size
- Full control over rendering performance
- No React/Vue/Svelte overhead for a canvas-heavy app

**Shared core, platform configs.** All app logic lives in `shared/`. Platform folders only contain:
- `electron-builder.json` (build targets, signing, installer config)
- Platform-specific assets (icons, entitlements)
- Platform-specific README with build instructions

**Canvas-based visualization.** The neural network is rendered with the Canvas 2D API for:
- Smooth 60fps animation
- Direct pixel control for heatmaps
- No SVG DOM overhead with thousands of nodes
- Easy zoom/pan with transform matrix

## Platform Notes

### macOS
- Universal binary (Intel + Apple Silicon)
- Code signing + notarization for Gatekeeper
- Native title bar integration (`titleBarStyle: 'hiddenInset'`)
- See `mac/README.md` for signing setup

### Windows
- NSIS installer with custom install directory
- Portable exe (no installation)
- Code signing recommended for SmartScreen
- See `win/README.md` for signing setup

### Linux
- AppImage (universal, no install needed)
- DEB package (Ubuntu/Debian)
- RPM package (Fedora/RHEL)
- Wayland support via `--ozone-platform-hint=auto`
- See `linux/README.md` for GPU/sandbox setup
