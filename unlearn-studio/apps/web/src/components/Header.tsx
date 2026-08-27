"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-3 border-white bg-brutal-black/90 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-brutal-accent flex items-center justify-center">
            <span className="font-mono text-brutal-black font-bold text-lg">U</span>
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight">
              NULL<span className="text-brutal-accent">MIND</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#how-it-works" className="font-display text-sm uppercase tracking-widest text-brutal-mid hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="/#features" className="font-display text-sm uppercase tracking-widest text-brutal-mid hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/#research" className="font-display text-sm uppercase tracking-widest text-brutal-mid hover:text-white transition-colors">
            Research
          </Link>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-brutal-mid animate-spin" />
            ) : isAuthenticated && user ? (
              /* Logged in — show user menu */
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 border-2 border-white/20 px-3 py-2 hover:border-white/40 transition-colors"
                >
                  <div className="w-6 h-6 bg-brutal-accent flex items-center justify-center">
                    <span className="font-mono text-brutal-black text-xs font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="font-display text-sm font-semibold hidden lg:block">
                    {user.name}
                  </span>
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 border-3 border-white bg-brutal-gray z-50">
                      <div className="p-3 border-b border-white/10">
                        <div className="font-display text-sm font-semibold">{user.name}</div>
                        <div className="font-mono text-xs text-brutal-mid truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={14} />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brutal-accent hover:bg-white/5 transition-colors"
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Not logged in — show login/signup */
              <>
                <Link
                  href="/login"
                  className="font-display text-sm uppercase tracking-widest text-brutal-mid hover:text-white transition-colors px-4 py-2"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="btn-brutal bg-brutal-accent text-brutal-black text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t-3 border-white bg-brutal-black">
          <div className="flex flex-col p-6 gap-4">
            <Link href="/#how-it-works" className="font-display text-sm uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
              How It Works
            </Link>
            <Link href="/#features" className="font-display text-sm uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
              Features
            </Link>
            <Link href="/#research" className="font-display text-sm uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
              Research
            </Link>
            <hr className="border-white/20" />

            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-brutal-accent flex items-center justify-center">
                    <span className="font-mono text-brutal-black text-sm font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold">{user.name}</div>
                    <div className="font-mono text-xs text-brutal-mid">{user.email}</div>
                  </div>
                </div>
                <Link href="/dashboard" className="font-display text-sm uppercase tracking-widest flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="font-display text-sm uppercase tracking-widest text-brutal-accent flex items-center gap-2"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="font-display text-sm uppercase tracking-widest text-brutal-mid" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-brutal bg-brutal-accent text-brutal-black text-sm text-center" onClick={() => setMenuOpen(false)}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
