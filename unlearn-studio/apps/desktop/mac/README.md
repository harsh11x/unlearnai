# Unlearn Studio — macOS Build

## Prerequisites

- macOS 12+ (Monterey or later recommended)
- Xcode Command Line Tools: `xcode-select --install`
- Node.js 18+
- Python 3.11+ (for model parsing)

## Build & Run

```bash
cd shared
npm install
npm run dev        # Development mode
npm run build:mac  # Production build (creates .dmg)
```

## Output

The built `.dmg` will be in `../../dist/mac/`.

## Code Signing

For distribution outside the App Store, you'll need:

1. An Apple Developer account
2. A Developer ID Application certificate
3. Set `CSC_LINK` and `CSC_KEY_PASSWORD` env vars:

```bash
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"
npm run build:mac
```

For development/testing, you can skip signing by setting:
```bash
export CSC_IDENTITY=""
```

## Notarization

To notarize the app for Gatekeeper:

1. Set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`:

```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run build:mac
```

electron-builder handles notarization automatically when these are set.

## Universal Binary

The build produces a universal binary (x64 + arm64) by default. This means it runs natively on both Intel and Apple Silicon Macs.
