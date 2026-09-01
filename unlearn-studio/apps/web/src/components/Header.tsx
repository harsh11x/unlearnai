"use client";

import { useState, useEffect } from "react";
import { useAuthModal } from "./AppShell";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const { openAuth } = useAuthModal();
  const { user, userData } = useAuth();
  const planBadge = userData?.plan && userData.plan !== "free" ? userData.plan.toUpperCase() : null;

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          <img src="/logo.png" alt="Remap Studios" className="w-7 h-7 object-contain" />
          <span className="font-display font-bold text-lg tracking-tight text-text">
            remap<span className="text-text-subtle font-normal">studios</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 lg:gap-2.5 xl:gap-4 flex-nowrap min-w-0">
          <a href="/#how-it-works" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
            How it works
          </a>
          <a href="/#sandbox" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
            Sandbox
          </a>
          <a href="/#architecture" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
            Architecture
          </a>
          <a href="/docs" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
            Docs
          </a>

          {/* Pricing dropdown */}
          <div
            className="relative inline-flex items-center leading-none"
            onMouseEnter={() => setPricingOpen(true)}
            onMouseLeave={() => setPricingOpen(false)}
          >
            <a href="/pricing" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
              Pricing
              <svg className="ml-0.5 w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3" /></svg>
            </a>

            {pricingOpen && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-bg border border-border shadow-lg animate-fade-up">
                <div className="p-4">
                  <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Plans</span>
                  <div className="mt-3 space-y-2">
                    {[
                      { name: "Free", price: "$0", desc: "1 model, CPU only" },
                      { name: "Basic", price: "$20/mo", desc: "5 models, GPU access" },
                      { name: "Pro", price: "$59/mo", desc: "Unlimited models, GPU", highlight: true },
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

          <a href="/downloads" className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors no-underline font-medium whitespace-nowrap px-2 py-1 leading-none">
            Download
          </a>

          {/* CTA */}
          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              {planBadge && (
                <span className="mono text-[9px] font-bold tracking-widest text-highlight border border-highlight/30 px-2 py-0.5">
                  {planBadge}
                </span>
              )}
              <button
                onClick={() => openAuth("profile")}
                className="flex items-center gap-2 bg-surface border border-border py-1.5 px-3 cursor-pointer hover:bg-surface/80 transition-colors"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <span className="w-5 h-5 bg-accent text-accent-inv flex items-center justify-center text-[10px] font-bold">{(userData?.displayName || user.email || "U")[0].toUpperCase()}</span>
                )}
                <span className="text-sm text-text-muted font-medium hidden xl:inline">{userData?.displayName || user.displayName || "Account"}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth("signup")}
              className="bg-accent text-accent-inv text-sm font-display font-semibold py-2 px-5 no-underline hover:opacity-85 transition-opacity cursor-pointer border-none whitespace-nowrap shrink-0"
            >
              Get Started
            </button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer -mr-2"
          aria-label="Toggle menu"
        >
          <span className={`w-5 h-[1.5px] bg-text transition-transform duration-200 ${mobileOpen ? "rotate-45 translate-y-[4.5px]" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`w-5 h-[1.5px] bg-text transition-transform duration-200 ${mobileOpen ? "-rotate-45 -translate-y-[4.5px]" : ""}`} />
        </button>
      </div>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div className="mobile-menu-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile nav */}
      <nav
        className={`lg:hidden fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-bg border-t border-border flex flex-col z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-1">
            {[
              { href: "/#how-it-works", label: "How it works" },
              { href: "/#sandbox", label: "Sandbox" },
              { href: "/#architecture", label: "Architecture" },
              { href: "/pricing", label: "Pricing" },
              { href: "/docs", label: "Docs" },
              { href: "/about", label: "About" },
              { href: "/downloads", label: "Download" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center text-base text-text-muted no-underline py-3 border-b border-border/50 hover:text-text transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Mobile menu CTA */}
        <div className="px-6 pb-6 pt-4 border-t border-border safe-bottom">
          <button
            onClick={() => { setMobileOpen(false); openAuth("signup"); }}
            className="btn-primary text-sm py-3.5 px-5 no-underline text-center cursor-pointer border-none w-full font-display font-semibold"
          >
            Get Started Free
          </button>
        </div>
      </nav>
    </header>
  );
}
