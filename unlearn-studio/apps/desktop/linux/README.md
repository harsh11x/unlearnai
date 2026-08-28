# Unlearn Studio — Linux Build

## Prerequisites

- Ubuntu 20.04+ / Debian 11+ / Fedora 36+ / Arch
- Node.js 18+ (LTS recommended)
- Python 3.11+ (for model parsing)

### Install Dependencies (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libnotify-dev \
  libnss3-dev \
  libxss-dev \
  libxtst-dev \
  libatspi2.0-dev \
  libdrm-dev \
  libgbm-dev \
  libsecret-1-dev
```

### Install Dependencies (Fedora)

```bash
sudo dnf install -y \
  gtk3-devel \
  libnotify-devel \
  nss-devel \
  libXScrnSaver-devel \
  libXtst-devel \
  alsa-lib-devel \
  libsecret-devel
```

## Build & Run

```bash
cd shared
npm install
npm run dev          # Development mode
npm run build:linux  # Production build
```

## Output

Three packages are generated in `../../dist/linux/`:

| Format | File | Notes |
|--------|------|-------|
| **AppImage** | `Unlearn Studio-x.x.x-linux-x86_64.AppImage` | Universal — runs on any distro |
| **DEB** | `unlearn-studio_x.x.x_amd64.deb` | For Ubuntu/Debian |
| **RPM** | `unlearn-studio-x.x.x.x86_64.rpm` | For Fedora/RHEL/openSUSE |

## Running the AppImage

```bash
chmod +x "Unlearn Studio"*.AppImage
./Unlearn-Studio-*.AppImage
```

No installation needed. The AppImage is self-contained.

## Installing the DEB

```bash
sudo dpkg -i unlearn-studio_*.deb
sudo apt-get install -f  # Fix any missing dependencies
```

## Installing the RPM

```bash
sudo rpm -i unlearn-studio-*.rpm
```

## AppArmor / Flatpak

If running in a sandboxed environment, you may need to grant filesystem access:

```bash
# AppArmor
sudo aa-complain /usr/bin/unlearn-studio

# Flatpak (if building flatpak bundle)
flatpak install flathub com.unlearnstudio.desktop
```

## GPU Acceleration (NVIDIA)

For CUDA-accelerated model operations, ensure:

1. NVIDIA drivers are installed
2. `nvidia-smi` works
3. Run with: `--enable-features=VaapiVideoDecoder --ignore-gpu-blocklist`

## Wayland Support

Electron apps may need flags for Wayland:

```bash
./Unlearn-Studio-*.AppImage --ozone-platform-hint=auto
```
