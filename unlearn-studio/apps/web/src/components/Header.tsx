"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#deep-mind", label: "VISUALIZER" },
    { href: "/#transformation", label: "BEFORE/AFTER" },
    { href: "/#node-sandbox", label: "SANDBOX" },
    { href: "/#calculator", label: "CALCULATOR" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black transition-all">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 mx-auto flex items-center justify-between h-[80px]">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black transition-transform group-hover:-translate-y-1 group-hover:-translate-x-1 group-hover:shadow-[4px_4px_0px_0px_rgba(209,213,219,1)]">
            N
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-xl tracking-tighter text-black uppercase flex items-center gap-2">
              NULLMIND
              <span className="comic-badge hidden sm:flex text-[10px] px-2 py-0.5">
                v1.0
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2 font-mono text-xs font-bold uppercase">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-black hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-all"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-1 h-6 bg-black mx-4" />

          <div className="flex items-center gap-4">
            <Link
              href="/#probe-sandbox"
              className="text-black hover:bg-gray-100 px-4 py-2 border-2 border-transparent hover:border-black transition-all"
            >
              PROBE DEMO
            </Link>
            <Link href="/#calculator" className="comic-btn-primary py-2 px-5 text-xs">
              SAVINGS <ArrowUpRight size={16} strokeWidth={3} />
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 bg-white border-2 border-black shadow-[2px_2px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-b-4 border-black p-4 space-y-3 font-mono text-sm font-bold uppercase">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4">
            <Link href="/#calculator" className="comic-btn-primary w-full py-3" onClick={() => setMenuOpen(false)}>
              CALCULATE SAVINGS
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
