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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f4efe4] border-b-3 border-[#0f172a] shadow-sm">
      {/* Scotch tape on left & right of header */}
      <div className="tape top-1 left-4 w-20 h-5 rotate-2 hidden md:block"></div>
      <div className="tape top-1 right-4 w-20 h-5 -rotate-2 hidden md:block"></div>

      <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center justify-between h-[68px]">
        {/* Logo as an Index Label / Sticky Tag */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative bg-[#fef08a] border-2 border-[#0f172a] px-3 py-1 -rotate-2 group-hover:rotate-0 transition-transform shadow-[3px_3px_0_0_#0f172a]">
            <span className="font-mono font-black text-lg text-[#0f172a]">NULLMIND</span>
            <span className="absolute -top-2 -right-2 bg-[#ef4444] text-white text-[9px] font-mono font-black px-1 border border-[#0f172a] rotate-12">v1.0</span>
          </div>
          <span className="font-hand text-xl font-bold text-slate-700 hidden sm:inline-block">
            ~ AI Unlearning Studio ~
          </span>
        </Link>

        {/* Desktop Nav as Sticky Tags */}
        <nav className="hidden lg:flex items-center gap-6">
          {[
            { href: "/#how-it-works", label: "How It Works", bg: "bg-[#bae6fd]", rot: "-rotate-1" },
            { href: "/#features", label: "Features", bg: "bg-[#bbf7d0]", rot: "rotate-1" },
            { href: "/#research", label: "Research", bg: "bg-[#fbcfe8]", rot: "-rotate-2" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.bg} ${item.rot} hover:rotate-0 hover:scale-105 border-2 border-[#0f172a] px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#0f172a] shadow-[2px_2px_0_0_#0f172a] transition-all`}
            >
              {item.label}
            </Link>
          ))}

          <div className="w-0.5 h-6 bg-[#0f172a]/30 mx-2" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-[#0f172a] border-t-transparent animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#0f172a] bg-[#fef08a] hover:bg-[#fde047] shadow-[3px_3px_0_0_#0f172a] transition-all"
                >
                  <div className="w-6 h-6 bg-[#0f172a] text-white flex items-center justify-center font-mono font-bold text-xs">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs font-mono font-bold uppercase truncate max-w-[100px]">{user.name}</span>
                  <ChevronDown size={14} className="stroke-[3px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-[#0f172a] shadow-[5px_5px_0_0_#0f172a] z-50 p-2 space-y-2">
                      <div className="p-2 border border-[#0f172a] bg-[#fef08a]">
                        <div className="text-xs font-bold uppercase truncate">{user.name}</div>
                        <div className="text-[10px] font-mono text-slate-600 truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 p-2 text-xs font-mono font-bold uppercase hover:bg-[#bae6fd] border border-transparent hover:border-[#0f172a] transition-all"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={14} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 p-2 text-xs font-mono font-bold uppercase bg-[#fbcfe8] text-[#0f172a] hover:bg-[#ef4444] hover:text-white border border-[#0f172a] transition-all"
                      >
                        <LogOut size={14} />
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
                  className="text-xs font-mono font-bold uppercase text-[#0f172a] hover:underline px-2 py-1"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-sticky text-xs py-1.5 px-4">
                  Get Started 📌
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 border-2 border-[#0f172a] bg-[#fef08a] shadow-[2px_2px_0_0_#0f172a]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-[#fef08a] border-t-2 border-b-2 border-[#0f172a] p-4 space-y-3">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-2 bg-white border-2 border-[#0f172a] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#0f172a]"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="block text-center p-2 bg-[#bae6fd] border-2 border-[#0f172a] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#0f172a]" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup" className="block text-center p-2 bg-[#fbcfe8] border-2 border-[#0f172a] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#0f172a]" onClick={() => setMenuOpen(false)}>
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
