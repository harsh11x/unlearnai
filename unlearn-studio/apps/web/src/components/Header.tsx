"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black">
      <div className="container mx-auto flex items-center justify-between h-[64px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-black flex items-center justify-center group-hover:bg-[#f0ff00] transition-colors">
            <span className="text-white group-hover:text-black font-bold text-sm tracking-tighter">N</span>
          </div>
          <span className="font-black text-lg tracking-tight">NULLMIND</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-mono font-bold text-black/60 hover:text-black uppercase tracking-widest transition-colors"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-black/20 mx-2" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-black hover:bg-[#f0ff00] transition-colors"
                >
                  <div className="w-6 h-6 bg-black flex items-center justify-center">
                    <span className="text-white text-xs font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono uppercase tracking-wide hidden xl:block">{user.name}</span>
                  <ChevronDown size={12} className="text-black stroke-[3px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] z-50">
                      <div className="p-3 border-b-2 border-black bg-[#f0ff00]">
                        <div className="text-xs font-bold uppercase truncate">{user.name}</div>
                        <div className="text-[10px] font-mono text-black/60 truncate mt-0.5">{user.email}</div>
                      </div>
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold font-mono uppercase hover:bg-black hover:text-white transition-colors" onClick={() => setShowUserMenu(false)}>
                        <LayoutDashboard size={12} />
                        Dashboard
                      </Link>
                      <button onClick={() => { setShowUserMenu(false); logout(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold font-mono uppercase bg-[#dc2626] text-white hover:bg-black transition-colors border-t-2 border-black">
                        <LogOut size={12} />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-xs font-mono font-bold uppercase tracking-widest text-black/60 hover:text-black transition-colors">
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button className="lg:hidden p-2 border-2 border-black" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t-2 border-black">
          <div className="container mx-auto flex flex-col py-4 gap-1">
            {[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#features", label: "Features" },
              { href: "/#research", label: "Research" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-mono font-bold uppercase py-3 px-3 hover:bg-[#f0ff00] transition-colors tracking-wide border-b border-black/10"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login" className="text-sm font-mono font-bold uppercase py-3 px-3 border-2 border-black text-center" onClick={() => setMenuOpen(false)}>
                Log In
              </Link>
              <Link href="/signup" className="btn-primary text-center" onClick={() => setMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
