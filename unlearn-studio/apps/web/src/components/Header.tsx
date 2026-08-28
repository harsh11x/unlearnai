"use client";

import { useState } from "react";
import { useAuthModal } from "./AppShell";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const { openAuth } = useAuthModal();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <span className="text-accent-inv text-xs font-bold font-display">R</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-text">
            remap<span className="text-text-subtle font-normal">studios</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <a href="/#how-it-works" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            How it works
          </a>
          <a href="/#sandbox" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Sandbox
          </a>
          <a href="/#architecture" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Architecture
          </a>
          <a href="/docs" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Docs
          </a>

          {/* Pricing dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setPricingOpen(true)}
            onMouseLeave={() => setPricingOpen(false)}
          >
            <a href="/pricing" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
              Pricing ▾
            </a>

            {pricingOpen && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-bg border border-border shadow-lg animate-fade-up">
                <div className="p-4">
                  <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Plans</span>
                  <div className="mt-3 space-y-2">
                    {[
                      { name: "Free", price: "$0", desc: "1 model, CPU only" },
                      { name: "Basic", price: "$20/mo", desc: "5 models, GPU access" },
                      { name: "Pro", price: "$59/mo", desc: "Unlimited, API access", highlight: true },
                      { name: "Business", price: "$99/mo", desc: "Multi-GPU, SLA" },
                    ].map((plan) => (
                      <a
                        key={plan.name}
                        href="/pricing"
                        className="flex items-center justify-between p-2 hover:bg-surface transition-colors no-underline group"
                      >
                        <div>
                          <span className={`text-sm font-display font-semibold ${plan.highlight ? "text-text" : "text-text-muted"} group-hover:text-text`}>
                            {plan.name}
                          </span>
                          <span className="body-sm ml-2">{plan.desc}</span>
                        </div>
                        <span className="mono text-xs text-text-subtle">{plan.price}</span>
                      </a>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <a href="/pricing" className="block text-center text-xs text-text-muted hover:text-text transition-colors no-underline font-display font-medium">
                      Compare all plans →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <a href="/downloads" className="text-sm text-text-muted hover:text-text transition-colors no-underline font-medium">
            Download
          </a>

          {/* CTA */}
          {user ? (
            <a href="/pricing" className="bg-accent text-accent-inv text-sm font-display font-semibold py-2 px-5 no-underline hover:opacity-85 transition-opacity">
              Dashboard
            </a>
          ) : (
            <button
              onClick={() => openAuth("signup")}
              className="bg-accent text-accent-inv text-sm font-display font-semibold py-2 px-5 no-underline hover:opacity-85 transition-opacity cursor-pointer border-none"
            >
              Get Started
            </button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer"
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? "rotate-45 translate-y-[4.5px]" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[4.5px]" : ""}`} />
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-border bg-bg px-6 py-4 flex flex-col gap-3">
          <a href="/#how-it-works" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="/#sandbox" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Sandbox</a>
          <a href="/#architecture" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Architecture</a>
          <a href="/pricing" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Pricing</a>
          <a href="/docs" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Docs</a>
          <a href="/about" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>About</a>
          <a href="/downloads" className="text-sm text-text-muted no-underline py-2" onClick={() => setMobileOpen(false)}>Download</a>
          <button
            onClick={() => { setMobileOpen(false); openAuth("signup"); }}
            className="btn-primary text-sm py-2.5 px-5 no-underline text-center cursor-pointer border-none w-full font-display font-semibold"
          >
            Get Started Free
          </button>
        </nav>
      )}
    </header>
  );
}
