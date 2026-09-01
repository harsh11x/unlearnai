import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PLATFORMS = [
  {
    os: "macOS",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M22.4 16.8c0-3.4 2.8-5 2.9-5.1-1.6-2.3-4-2.6-4.9-2.7-2.1-.2-4 1.2-5.1 1.2-1.1 0-2.7-1.2-4.4-1.1-2.3.1-4.4 1.3-5.5 3.4-2.4 4.2-.6 10.3 1.7 13.6 1.1 1.6 2.5 3.4 4.3 3.3 1.7-.1 2.3-1.1 4.3-1.1 2 0 2.6 1.1 4.4 1 1.8 0 3-1.6 4.1-3.3 1.3-1.9 1.8-3.7 1.8-3.8-.1-.1-3.4-1.3-3.4-5.2zM19.2 6.3c.9-1.1 1.5-2.7 1.4-4.2-1.3.1-2.9.9-3.9 2-0.9 1-1.6 2.6-1.4 4.1 1.4.1 2.9-.7 3.9-1.9z" fill="currentColor"/>
      </svg>
    ),
    builds: [
      {
        name: "Apple Silicon",
        arch: "arm64",
        tag: "Recommended for M1/M2/M3/M4",
        file: "Remap Studios-1.0.0-arm64.dmg",
        size: "~94 MB",
        format: "DMG",
        primary: true,
        comingSoon: false,
      },
      {
        name: "Intel Mac",
        arch: "x64",
        tag: "For 2019 and earlier Macs",
        file: "Remap Studios-1.0.0-x64.dmg",
        size: "~102 MB",
        format: "DMG",
        primary: false,
        comingSoon: true,
      },
    ],
  },
  {
    os: "Windows",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M1 6.5l13-1.8v13.1H1V6.5zM16 4.4L29.5 2v14.3H16V4.4zM1 17.8h13v13.1L1 29.4V17.8zM16 18.1h13.5v14.3L16 29.9V18.1z" fill="currentColor"/>
      </svg>
    ),
    builds: [
      {
        name: "Windows x64",
        arch: "x64",
        tag: "For most Windows PCs",
        file: "Remap Studios Setup 1.0.0.exe",
        size: "~88 MB",
        format: "EXE Installer",
        primary: true,
        comingSoon: true,
      },
      {
        name: "Windows x64 Portable",
        arch: "x64-portable",
        tag: "No installation required",
        file: "Remap Studios-portable-1.0.0.exe",
        size: "~82 MB",
        format: "Portable EXE",
        primary: false,
        comingSoon: true,
      },
      {
        name: "Windows ARM64",
        arch: "arm64",
        tag: "For Surface Pro X, Snapdragon PCs",
        file: "Remap Studios Setup 1.0.0-arm64.exe",
        size: "~85 MB",
        format: "EXE Installer",
        primary: false,
        comingSoon: true,
      },
    ],
  },
  {
    os: "Linux",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 2C11 2 7 6.6 7 12.2c0 3.4 1.8 6.4 4.5 8.2l-.5 5.6c-.1.8.5 1.4 1.2 1.2l3.3-1.3c1.1.3 2.2.5 3.3.5 2 0 3.8-.7 5.2-1.8.5-.4.2-1.1-.4-1.1H8.5c-.6 0-.9-.7-.5-1.1C9.4 21.4 11 19 11 16.2c0-4.4 3.6-8 8-8s8 3.6 8 8c0 2.8-1.6 5.2-3 6.7-.5.4-.2 1.1.4 1.1h9.6c.6 0 .9-.7.5-1.1C34.4 18.8 36 16 36 12.8 36 6.6 31 2 26 2h-10z" fill="currentColor" transform="scale(0.75) translate(2, 2)"/>
      </svg>
    ),
    builds: [
      {
        name: "AppImage",
        arch: "x64",
        tag: "Universal — runs on any distro",
        file: "Remap Studios-1.0.0-linux-x86_64.AppImage",
        size: "~96 MB",
        format: "AppImage",
        primary: true,
        comingSoon: true,
      },
      {
        name: "Debian / Ubuntu",
        arch: "x64-deb",
        tag: "For Ubuntu 20.04+, Debian 11+",
        file: "unlearn-studio_1.0.0_amd64.deb",
        size: "~88 MB",
        format: ".deb",
        primary: false,
        comingSoon: true,
      },
      {
        name: "Fedora / RHEL",
        arch: "x64-rpm",
        tag: "For Fedora 36+, RHEL 9+",
        file: "unlearn-studio-1.0.0-1.x86_64.rpm",
        size: "~86 MB",
        format: ".rpm",
        primary: false,
        comingSoon: true,
      },
    ],
  },
];

export default function DownloadsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="section-label mb-4 inline-block">Download</span>
            <h1 className="heading-xl mt-6">Get Remap Studios</h1>
            <p className="body-lg mt-4">
              Desktop app for macOS, Windows, and Linux. Requires Python 3.9+ with PyTorch.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
              <span className="mono text-xs text-text-subtle border border-border px-3 py-1.5">
                PyTorch 2.x
              </span>
              <span className="mono text-xs text-text-subtle border border-border px-3 py-1.5">
                Python 3.9+
              </span>
              <span className="mono text-xs text-text-subtle border border-border px-3 py-1.5">
                4 GB RAM minimum
              </span>
            </div>
          </div>

          {/* Platform sections */}
          <div className="space-y-8 sm:space-y-12">
            {PLATFORMS.map((platform) => (
              <div key={platform.os}>
                {/* Platform header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-text-muted">{platform.icon}</div>
                  <h2 className="font-display font-bold text-2xl tracking-tight">{platform.os}</h2>
                </div>

                {/* Builds grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-border">
                  {platform.builds.map((build, i) => (
                    <div
                      key={build.arch}
                      className={`p-6 border-b ${
                        i < platform.builds.length - 1 ? "md:border-b-0" : ""
                      } ${
                        i % 3 < 2 ? "lg:border-r" : ""
                      } ${
                        i % 2 === 0 && i < platform.builds.length - 1 ? "md:border-r" : ""
                      } border-border group relative ${
                        build.primary ? "bg-surface" : ""
                      }`}
                    >
                      {build.primary && (
                        <div className="absolute top-4 right-4">
                          <span className="mono text-[9px] font-bold tracking-widest uppercase text-highlight border border-highlight/30 px-2 py-0.5">
                            Recommended
                          </span>
                        </div>
                      )}

                      <div className="mb-4">
                        <h3 className="font-display font-semibold text-base text-text">
                          {build.name}
                        </h3>
                        <p className="body-sm mt-1">{build.tag}</p>
                      </div>

                      <div className="flex items-center gap-3 mb-5">
                        <span className="mono text-xs text-text-muted border border-border px-2 py-0.5">
                          {build.arch}
                        </span>
                        <span className="mono text-xs text-text-subtle">
                          {build.format}
                        </span>
                        <span className="mono text-xs text-text-subtle">
                          {build.size}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href="#"
                          className={`flex-1 block text-center py-2.5 px-5 no-underline font-display font-semibold text-sm transition-all ${
                            build.primary && !build.comingSoon
                              ? "bg-accent text-accent-inv hover:opacity-85"
                              : build.comingSoon
                              ? "border border-border text-text-subtle cursor-not-allowed"
                              : "border border-border text-text hover:bg-surface hover:border-border-strong"
                          }`}
                        >
                          {build.comingSoon ? "Coming Soon" : `Download ${build.format}`}
                        </a>
                        {build.comingSoon && (
                          <span className="mono text-[9px] font-bold tracking-widest uppercase text-text-subtle border border-border px-2 py-1 flex items-center">
                            Soon
                          </span>
                        )}
                      </div>

                      {/* File info */}
                      <p className="mono text-[10px] text-text-subtle mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {build.file}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div className="mt-10 sm:mt-16 border border-border p-4 sm:p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className="font-display font-bold text-lg mb-4">System Requirements</h3>
                <div className="space-y-3">
                  {[
                    ["OS", "macOS 12+, Windows 10+, Ubuntu 20.04+"],
                    ["RAM", "4 GB minimum, 8 GB recommended"],
                    ["Disk", "500 MB for app + space for models"],
                    ["Python", "3.9+ with pip"],
                    ["PyTorch", "2.1+ (installed via pip)"],
                    ["GPU", "Optional — CUDA, MPS, or CPU fallback"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-4">
                      <span className="mono text-xs text-text-subtle w-16 flex-shrink-0">{label}</span>
                      <span className="text-sm text-text-muted">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-display font-bold text-lg mb-4">Install Python Dependencies</h3>
                <div className="bg-bg border border-border p-4">
                  <pre className="mono text-xs text-text-muted leading-relaxed overflow-x-auto">
{`# Install PyTorch (CPU)
pip3 install torch safetensors psutil numpy

# Install PyTorch (CUDA)
pip3 install torch --index-url \\
  https://download.pytorch.org/whl/cu121

# Install PyTorch (Apple Silicon GPU)
pip3 install torch safetensors psutil numpy`}
                  </pre>
                </div>
                <p className="body-sm mt-3">
                  The desktop app will detect your GPU automatically and use the fastest available device.
                </p>
              </div>
            </div>
          </div>

          {/* Changelog teaser */}
          <div className="mt-12 text-center">
            <p className="body-sm">
              Need help? Check the{" "}
              <a href="/docs" className="text-text hover:text-text-muted transition-colors underline">
                Documentation
              </a>{" "}
              or contact us at remapstudios@gmail.com.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
