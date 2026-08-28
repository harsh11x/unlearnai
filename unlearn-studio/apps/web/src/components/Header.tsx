"use client";

import { useState } from "react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <span className="text-accent-inv text-xs font-bold font-display">U</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-text">
            unlearn<span className="text-text-subtle font-normal">studio</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <a href="/#how-it-works" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            How it works
          </a>
          <a href="/pricing" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Pricing
          </a>
          <a href="/docs" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Docs
          </a>
          <a href="/about" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            About
          </a>
          <a href="/downloads" className="bg-accent text-accent-inv text-sm font-display font-semibold py-2 px-5 no-underline hover:opacity-85 transition-opacity">
            ↓ Download
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer"
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? "rotate-45 translate-y-[4.5px]" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[4.5px]" : ""}`} />
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-bg px-6 py-4 flex flex-col gap-3">
          <a href="/#how-it-works" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="/pricing" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Pricing</a>
          <a href="/docs" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Docs</a>
          <a href="/about" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>About</a>
          <a href="/downloads" className="btn-primary text-sm py-2.5 px-5 no-underline text-center" onClick={() => setMobileOpen(false)}>↓ Download</a>
        </nav>
      )}
    </header>
  );
}
