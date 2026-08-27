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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-[8px] border-black transition-none">
      <div className="max-w-[1320px] mx-auto flex items-center justify-between px-6 md:px-10 h-[80px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-black border-2 border-black flex items-center justify-center group-hover:bg-highlight group-hover:text-black transition-none">
            <span className="text-white group-hover:text-black font-serif font-bold text-lg">N</span>
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
              className="text-[14px] font-mono font-bold text-black border-b-4 border-transparent hover:border-black transition-none uppercase"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-[4px] h-8 bg-black mx-2" />

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-black border-t-highlight animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-3 py-2 border-4 border-black bg-white hover:bg-highlight hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
                >
                  <div className="w-7 h-7 bg-black flex items-center justify-center">
                    <span className="text-white text-xs font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <span className="text-sm font-bold font-mono hidden xl:block uppercase">{user.name}</span>
                  <ChevronDown size={18} className="text-black stroke-[3px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] z-50">
                      <div className="p-4 border-b-4 border-black bg-highlight">
                        <div className="text-sm font-bold uppercase truncate">{user.name}</div>
                        <div className="text-xs font-mono text-black truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold font-mono uppercase hover:bg-black hover:text-white transition-none"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={18} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold font-mono uppercase bg-error text-white hover:bg-black transition-none border-t-4 border-black"
                      >
                        <LogOut size={18} />
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
                  className="text-sm font-bold font-mono uppercase text-black hover:bg-highlight px-4 py-2 border-4 border-transparent hover:border-black transition-none"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-sm shadow-[4px_4px_0_0_#ffff00]">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 border-4 border-black bg-highlight shadow-[4px_4px_0_0_#000]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} className="stroke-[3px]" /> : <Menu size={24} className="stroke-[3px]" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t-[8px] border-black border-b-[8px]">
          <div className="flex flex-col p-6 gap-2">
            {[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#features", label: "Features" },
              { href: "/#research", label: "Research" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-lg font-bold font-mono uppercase py-4 px-4 border-4 border-black hover:bg-highlight hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-[4px] bg-black my-4" />
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-4 px-4 py-4 bg-highlight border-4 border-black">
                  <div className="w-10 h-10 bg-black flex items-center justify-center">
                    <span className="text-white text-lg font-bold font-mono">
                      {user.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold uppercase">{user.name}</div>
                    <div className="text-xs font-mono">{user.email}</div>
                  </div>
                </div>
                <Link href="/dashboard" className="text-lg font-bold font-mono uppercase py-4 px-4 border-4 border-black hover:bg-black hover:text-white mt-2" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }} className="text-lg font-bold font-mono uppercase py-4 px-4 text-left bg-error text-white border-4 border-black hover:bg-black mt-2">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-lg font-bold font-mono uppercase py-4 px-4 border-4 border-black hover:bg-highlight hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-primary text-lg text-center mt-4 w-full shadow-[6px_6px_0_0_#ffff00]" onClick={() => setMenuOpen(false)}>
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
