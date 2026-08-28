"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between h-[72px] px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
            <span className="font-mono font-bold text-sm text-[#0a0f1a]">N</span>
          </div>
          <span className="font-sans font-bold text-lg text-ink tracking-tight">
            Null<span className="text-highlight">Mind</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#results", label: "Results" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden lg:flex items-center gap-3">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-ink-subtle border-t-highlight rounded-full animate-spin" />
          ) : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#0a0f1a]">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="text-sm font-medium text-ink max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown size={14} className="text-ink-subtle" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-bg-elevated border border-border-strong rounded-xl shadow-2xl z-50 p-2 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-border mb-1">
                      <div className="text-sm font-medium text-ink truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-ink-subtle font-mono truncate mt-0.5">
                        {user.email}
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-white/[0.04] rounded-lg transition-all"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <LayoutDashboard size={15} />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-muted hover:text-error hover:bg-error/5 rounded-lg transition-all mt-1"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
              >
                Log In
              </Link>
              <Link href="/signup" className="btn-primary text-sm py-2 px-5">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X size={22} className="text-ink" />
          ) : (
            <Menu size={22} className="text-ink" />
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-bg-alt/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-6 space-y-2">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#results", label: "Results" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-3 px-4 text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/[0.04] rounded-lg transition-all"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <Link
              href="/login"
              className="text-center py-2.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="btn-primary justify-center text-sm py-2.5"
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
