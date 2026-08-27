"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black transition-none">
      <div className="w-full px-[5px] mx-auto flex items-center justify-between h-[70px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center group-hover:bg-highlight group-hover:text-black transition-none">
            <span className="text-white group-hover:text-black font-serif font-bold text-lg">N</span>
          </div>
          <span className="font-serif font-black text-xl tracking-tighter uppercase">
            NullMind
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {[
            { href: "/#how-it-works", label: "How It Works" },
            { href: "/#features", label: "Features" },
            { href: "/#research", label: "Research" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-mono font-bold text-black border-b-2 border-transparent hover:border-black transition-none uppercase"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-[2px] h-6 bg-black mx-2" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-black border-t-highlight animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 border-2 border-black bg-white hover:bg-highlight hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                >
                  <div className="w-6 h-6 bg-black flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono hidden xl:block uppercase">{user.name}</span>
                  <ChevronDown size={14} className="text-black stroke-[3px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] z-50">
                      <div className="p-3 border-b-2 border-black bg-highlight">
                        <div className="text-xs font-bold uppercase truncate">{user.name}</div>
                        <div className="text-[10px] font-mono text-black truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold font-mono uppercase hover:bg-black hover:text-white transition-none"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={14} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold font-mono uppercase bg-error text-white hover:bg-black transition-none border-t-2 border-black"
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
                  className="text-xs font-bold font-mono uppercase text-black hover:bg-highlight px-3 py-1.5 border-2 border-transparent hover:border-black transition-none"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-xs px-4 py-2 border-2 shadow-[2px_2px_0_0_#ffff00]">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-1.5 border-2 border-black bg-highlight shadow-[2px_2px_0_0_#000]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} className="stroke-[3px]" /> : <Menu size={20} className="stroke-[3px]" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t-4 border-black border-b-4">
          <div className="flex flex-col p-4 gap-2">
            {[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#features", label: "Features" },
              { href: "/#research", label: "Research" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-bold font-mono uppercase py-3 px-3 border-2 border-black hover:bg-highlight hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-[2px] bg-black my-2" />
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-3 bg-highlight border-2 border-black">
                  <div className="w-8 h-8 bg-black flex items-center justify-center">
                    <span className="text-white text-sm font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase">{user.name}</div>
                    <div className="text-[10px] font-mono">{user.email}</div>
                  </div>
                </div>
                <Link href="/dashboard" className="text-sm font-bold font-mono uppercase py-3 px-3 border-2 border-black hover:bg-black hover:text-white mt-2" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }} className="text-sm font-bold font-mono uppercase py-3 px-3 text-left bg-error text-white border-2 border-black hover:bg-black mt-2">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold font-mono uppercase py-3 px-3 border-2 border-black hover:bg-highlight hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-sm text-center mt-3 w-full border-2 shadow-[4px_4px_0_0_#ffff00]" onClick={() => setMenuOpen(false)}>
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
