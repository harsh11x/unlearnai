# Unlearn Studio — Windows Build

## Prerequisites

- Windows 10/11 (64-bit)
- Node.js 18+ (LTS recommended)
- Python 3.11+ (for model parsing)
- Visual Studio Build Tools (for native modules, if any)

## Build & Run

```bash
cd shared
npm install
npm run dev         # Development mode
npm run build:win   # Production build
```

## Output

Two builds are generated in `../../dist/win/`:

1. **NSIS Installer** — `Unlearn Studio Setup x.x.x.exe`
   - Standard Windows installer with install wizard
   - Creates Start Menu and Desktop shortcuts
   - Supports custom install directory

2. **Portable** — `Unlearn Studio-portable-x.x.x.exe`
   - No installation required, runs from any directory
   - Good for USB drives or testing

## Code Signing

For distributing signed executables (recommended for Windows SmartScreen):

1. Purchase an EV or Standard code signing certificate from a CA (DigiCert, Sectigo, etc.)
2. Set environment variables:

```bash
set CSC_LINK=path\to\certificate.pfx
set CSC_KEY_PASSWORD=your-password
npm run build:win
```

## Windows SmartScreen

Unsigned executables will trigger SmartScreen warnings. Options:

1. **Sign the executable** (recommended)
2. **Purchase an EV certificate** — eliminates SmartScreen warnings entirely
3. **Users can click "More info" → "Run anyway"** — but this looks unprofessional

## Antivirus False Positives

Some antivirus software may flag Electron apps. To reduce false positives:

1. Code sign the executable
2. Submit the binary to major AV vendors for whitelisting
3. The NSIS installer format is generally less likely to trigger false positives than the portable exe
