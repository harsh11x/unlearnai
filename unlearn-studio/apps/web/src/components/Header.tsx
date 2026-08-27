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
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass shadow-[0_1px_0_0_var(--color-border)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1320px] mx-auto flex items-center justify-between px-6 md:px-10 h-[72px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-ink rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <span className="text-white font-serif font-bold text-sm italic">N</span>
          </div>
          <span className="font-serif font-bold text-xl tracking-tight">
            Null<span className="italic">Mind</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-ink-muted hover:text-ink transition-colors duration-300 tracking-wide uppercase"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-border rounded-full animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-border hover:border-ink/20 transition-all duration-300"
                >
                  <div className="w-7 h-7 bg-ink rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden xl:block">{user.name}</span>
                  <ChevronDown size={14} className="text-ink-muted" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-border shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-border/50">
                        <div className="text-sm font-semibold">{user.name}</div>
                        <div className="text-xs text-ink-muted truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-bg-alt transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={15} className="text-ink-muted" />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-error hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink-muted hover:text-ink transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 -mr-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden glass border-t border-border animate-fade-in">
          <div className="flex flex-col p-6 gap-1">
            {[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#features", label: "Features" },
              { href: "/#research", label: "Research" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium py-3 px-4 rounded-lg hover:bg-bg-alt transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-ink rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs text-ink-muted">{user.email}</div>
                  </div>
                </div>
                <Link href="/dashboard" className="text-sm font-medium py-3 px-4 rounded-lg hover:bg-bg-alt" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }} className="text-sm font-medium py-3 px-4 text-left text-error hover:bg-red-50 rounded-lg">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium py-3 px-4 rounded-lg hover:bg-bg-alt" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-sm text-center mt-1" onClick={() => setMenuOpen(false)}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
