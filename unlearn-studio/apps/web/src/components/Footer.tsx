"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#09090b] text-white border-t-2 border-[#09090b] pt-16 pb-12">
      <div className="w-full max-w-[1400px] px-6 sm:px-10 md:px-12 mx-auto">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-zinc-800">
          
          {/* Column 1: Brand & Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white text-[#09090b] border-2 border-white px-3 py-1 font-mono font-black text-base">
              <span>NULLMIND</span>
              <span className="bg-[#09090b] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 border border-white">
                v1.0
              </span>
            </div>
            
            <p className="font-mono text-xs md:text-sm text-zinc-400 leading-relaxed max-w-sm">
              An open-source production engine for measured LLM capability unlearning. Erase targeted knowledge parameters without retraining full model weights.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://github.com/harsh11x/unlearnai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-white hover:text-[#09090b] text-white font-mono text-xs font-bold px-3.5 py-2 border border-zinc-700 transition-all shadow-[2px_2px_0_0_#ffffff]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub Repository <ArrowUpRight size={14} />
              </a>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1">
                [ PASS AUDIT ]
              </span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-white font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2 mb-3">
              // NAVIGATION
            </div>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">00. Home</Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition-colors">01. Pipeline</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">02. Capabilities</Link>
              </li>
              <li>
                <Link href="/#results" className="hover:text-white transition-colors">03. Scorecard</Link>
              </li>
              <li>
                <Link href="/#research" className="hover:text-white transition-colors">04. Research</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Apps */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-white font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2 mb-3">
              // WORKSPACE
            </div>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Terminal size={14} /> Unlearn Studio
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">Account Log In</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">Create Account</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">Run Probe Battery</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Legal */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-white font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2 mb-3">
              // COMPLIANCE
            </div>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <span className="text-zinc-500 cursor-default">GDPR Right to Be Forgotten</span>
              </li>
              <li>
                <span className="text-zinc-500 cursor-default">CCPA Model Erasure</span>
              </li>
              <li>
                <span className="text-zinc-500 cursor-default">Reproducible PDF Audit</span>
              </li>
              <li>
                <span className="text-zinc-500 cursor-default">Immutable Checkpoints</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-zinc-300" />
            <span>Built with PyTorch · HuggingFace · FastAPI · Next.js</span>
          </div>
          <div>
            © 2026 NullMind Studio. Open-source research platform.
          </div>
        </div>

      </div>
    </footer>
  );
}

