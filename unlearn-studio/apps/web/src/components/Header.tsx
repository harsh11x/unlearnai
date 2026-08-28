"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight, Cpu } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#deep-mind", label: "Deep Mind Visualizer" },
    { href: "/#transformation", label: "Before vs After" },
    { href: "/#node-sandbox", label: "Node Deletion Sandbox" },
    { href: "/#calculator", label: "Compute Calculator" },
    { href: "/#probe-sandbox", label: "Live Sandbox" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 mx-auto flex items-center justify-between h-[72px]">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md group-hover:scale-105 transition-transform">
            N
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              NULLMIND AI
              <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md">
                v1.0
              </span>
            </span>
            <span className="font-mono text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              LLM Unlearning Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-slate-200 mx-3" />

          <div className="flex items-center gap-3">
            <Link
              href="/#probe-sandbox"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2"
            >
              Demo Sandbox
            </Link>
            <Link href="/#calculator" className="clean-btn-primary text-xs py-2.5 px-5">
              Compute Savings <ArrowUpRight size={14} />
            </Link>
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
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 p-4 space-y-2 font-sans">
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
            <Link href="/#calculator" className="block text-center p-3 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-md" onClick={() => setMenuOpen(false)}>
              Compute Savings Calculator →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
