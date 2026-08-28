"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";
import { usePathname } from "next/navigation";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/#how-it-works", label: "Pipeline" },
    { href: "/docs", label: "Docs" },
    { href: "/benchmarks", label: "Benchmarks" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 mx-auto flex items-center justify-between h-[72px]">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            N
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              NULLMIND
              <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-1.5 py-0.5 rounded-md">
                v1.0
              </span>
            </span>
            <span className="font-mono text-[11px] font-medium text-slate-500">
              AI Unlearning & Retrain Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="w-px h-5 bg-slate-200 mx-2" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all text-slate-700"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs font-semibold truncate max-w-[120px]">{user.name}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1.5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={15} className="text-indigo-600" />
                        Workspace Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all"
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
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2"
                >
                  Log In
                </Link>
                <Link href="/signup" className="soft-btn-primary text-xs py-2.5 px-5">
                  <Sparkles size={14} /> Get Started Free
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 p-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/dashboard" className="block text-center p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50" onClick={() => setMenuOpen(false)}>
              Studio Workspace
            </Link>
            <Link href="/login" className="block text-center p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup" className="block text-center p-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/20" onClick={() => setMenuOpen(false)}>
              Get Started Free →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}



