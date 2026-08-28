"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";
import { usePathname } from "next/navigation";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/#how-it-works", label: "01. Pipeline" },
    { href: "/docs", label: "02. Docs" },
    { href: "/benchmarks", label: "03. Benchmarks" },
    { href: "/pricing", label: "04. Pricing" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f7f6f2] border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 md:px-8 mx-auto flex items-center justify-between h-[68px]">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center gap-2 bg-[#09090b] text-white border-2 border-[#09090b] px-3 py-1 shadow-[3px_3px_0_0_#09090b] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
            <span className="font-mono font-black text-base md:text-lg tracking-wider">NULLMIND</span>
            <span className="bg-white text-[#09090b] text-[10px] font-mono font-bold px-1.5 py-0.5 border border-[#09090b]">
              v1.0
            </span>
          </div>
          <span className="font-mono text-xs md:text-sm font-bold text-[#52525b] uppercase tracking-widest hidden sm:inline-block">
            // UNLEARN & RETRAIN
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-3">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-2 border-[#09090b] px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-[#09090b] text-white shadow-[2px_2px_0_0_#09090b]"
                    : "bg-white text-[#09090b] hover:bg-[#09090b] hover:text-white shadow-[2px_2px_0_0_#09090b]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="w-px h-6 bg-[#09090b]/20 mx-1" />

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-[#09090b] border-t-transparent animate-spin mr-2" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#09090b] bg-white hover:bg-[#09090b] hover:text-white shadow-[3px_3px_0_0_#09090b] transition-all group"
                >
                  <div className="w-5 h-5 bg-[#09090b] group-hover:bg-white group-hover:text-[#09090b] text-white flex items-center justify-center font-mono font-bold text-xs transition-colors">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs font-mono font-bold uppercase truncate max-w-[110px]">{user.name}</span>
                  <ChevronDown size={14} className="stroke-[2.5px]" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-[#09090b] shadow-[5px_5px_0_0_#09090b] z-50 p-2 space-y-2">
                      <div className="p-2.5 border border-[#09090b] bg-[#f7f6f2]">
                        <div className="text-xs font-mono font-bold uppercase truncate">{user.name}</div>
                        <div className="text-[10px] font-mono text-[#52525b] truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 p-2 text-xs font-mono font-bold uppercase hover:bg-[#09090b] hover:text-white border border-transparent hover:border-[#09090b] transition-all"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard size={14} />
                        Workspace Dashboard
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 p-2 text-xs font-mono font-bold uppercase bg-[#09090b] text-white hover:bg-red-600 border border-[#09090b] transition-all"
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
                  className="text-xs font-mono font-bold uppercase text-[#09090b] hover:underline px-3 py-1.5"
                >
                  Log In
                </Link>
                <Link href="/signup" className="brutalist-btn-primary text-xs py-1.5 px-4">
                  Get Started →
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 border-2 border-[#09090b] bg-white shadow-[2px_2px_0_0_#09090b]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-[#f7f6f2] border-t-2 border-b-2 border-[#09090b] p-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-3 bg-white border-2 border-[#09090b] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#09090b]"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/dashboard" className="block text-center p-3 bg-white border-2 border-[#09090b] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#09090b]" onClick={() => setMenuOpen(false)}>
              Studio Workspace
            </Link>
            <Link href="/login" className="block text-center p-3 bg-white border-2 border-[#09090b] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#09090b]" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup" className="block text-center p-3 bg-[#09090b] text-white border-2 border-[#09090b] text-xs font-mono font-bold uppercase shadow-[2px_2px_0_0_#09090b]" onClick={() => setMenuOpen(false)}>
              Get Started Free →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}


