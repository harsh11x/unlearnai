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
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto flex items-center justify-between h-[80px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-black border-2 border-black flex items-center justify-center group-hover:bg-highlight group-hover:text-black transition-none">
            <span className="text-white group-hover:text-black font-serif font-bold text-xl">N</span>
          </div>
          <span className="font-serif font-black text-2xl tracking-tighter uppercase">
            NullMind
          </span>
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
              className="text-sm font-mono font-bold text-black border-b-2 border-transparent hover:border-black transition-none uppercase tracking-wide"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-[2px] h-6 bg-black mx-4" />

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-black border-t-highlight animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 border-2 border-black bg-white hover:bg-highlight hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0_0_#000] transition-all"
                >
                  <div className="w-8 h-8 bg-black flex items-center justify-center">
                    <span className="text-white text-xs font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <span className="text-sm font-bold font-mono hidden xl:block uppercase tracking-wide">{user.name}</span>
                  <ChevronDown size={16} className="text-black stroke-[3px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-4 w-56 bg-white border-2 border-black shadow-[6px_6px_0_0_#000] z-50">
                      <div className="p-4 border-b-2 border-black bg-highlight">
                        <div className="text-sm font-bold uppercase truncate">{user.name}</div>
                        <div className="text-xs font-mono text-black truncate mt-1">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold font-mono uppercase hover:bg-black hover:text-white transition-none"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold font-mono uppercase bg-error text-white hover:bg-black transition-none border-t-2 border-black"
                      >
                        <LogOut size={16} />
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
                  className="text-sm font-bold font-mono uppercase text-black hover:bg-highlight px-4 py-2 border-2 border-transparent hover:border-black transition-none tracking-wide"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-sm px-6 py-3 border-2 shadow-[4px_4px_0_0_#ffff00]">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 border-2 border-black bg-highlight shadow-[4px_4px_0_0_#000]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} className="stroke-[3px]" /> : <Menu size={24} className="stroke-[3px]" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t-4 border-black border-b-4">
          <div className="flex flex-col p-6 gap-4">
            {[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#features", label: "Features" },
              { href: "/#research", label: "Research" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-bold font-mono uppercase py-4 px-4 border-2 border-black hover:bg-highlight hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all tracking-wide"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-[2px] bg-black my-4" />
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-4 px-4 py-4 bg-highlight border-2 border-black">
                  <div className="w-10 h-10 bg-black flex items-center justify-center">
                    <span className="text-white text-base font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold uppercase">{user.name}</div>
                    <div className="text-xs font-mono mt-1">{user.email}</div>
                  </div>
                </div>
                <Link href="/dashboard" className="text-base font-bold font-mono uppercase py-4 px-4 border-2 border-black hover:bg-black hover:text-white mt-4 tracking-wide" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }} className="text-base font-bold font-mono uppercase py-4 px-4 text-left bg-error text-white border-2 border-black hover:bg-black mt-4 tracking-wide">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-base font-bold font-mono uppercase py-4 px-4 border-2 border-black hover:bg-highlight hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all tracking-wide" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-base text-center mt-4 w-full border-2 shadow-[6px_6px_0_0_#ffff00] py-4" onClick={() => setMenuOpen(false)}>
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
