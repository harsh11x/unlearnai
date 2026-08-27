"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
              UNLEARN<span className="text-brutal-accent">STUDIO</span>
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
            <Link href="/login" className="font-display text-sm uppercase tracking-widest text-brutal-mid" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup" className="btn-brutal bg-brutal-accent text-brutal-black text-sm text-center" onClick={() => setMenuOpen(false)}>
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
