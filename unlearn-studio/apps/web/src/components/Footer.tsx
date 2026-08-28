"use client";

import Link from "next/link";
import { Github, ArrowUpRight, ShieldCheck, Cpu, Terminal, FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] text-white border-t-4 border-[#0f172a] pt-16 pb-12">
      <div className="w-full max-w-[1400px] px-6 sm:px-10 md:px-12 mx-auto">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Column 1: Brand & Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#fef08a] border-2 border-white px-3 py-1 -rotate-1">
              <span className="font-mono font-black text-lg text-[#0f172a]">NULLMIND</span>
              <span className="bg-[#ef4444] text-white text-[9px] font-mono font-black px-1">v1.0</span>
            </div>
            
            <p className="font-mono text-xs md:text-sm text-slate-300 leading-relaxed max-w-sm">
              An open-source production platform for measured LLM capability reduction. Erase targeted knowledge without retraining full model parameters.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://github.com/harsh11x/unlearnai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold px-3 py-2 border border-slate-700 transition-all"
              >
                <Github size={16} /> GitHub Repo <ArrowUpRight size={14} />
              </a>
              <span className="stamp stamp-green text-[10px] py-1 px-2">PASS AUDIT</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[#fef08a] font-black uppercase tracking-wider text-sm border-b border-slate-800 pb-2 mb-3">
              NAVIGATION
            </div>
            <ul className="space-y-2.5 text-slate-300">
              <li>
                <Link href="/" className="hover:text-[#fef08a] transition-colors">Home Page</Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#fef08a] transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#fef08a] transition-colors">Engine Capabilities</Link>
              </li>
              <li>
                <Link href="/#research" className="hover:text-[#fef08a] transition-colors">Research Transparency</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Apps */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[#bae6fd] font-black uppercase tracking-wider text-sm border-b border-slate-800 pb-2 mb-3">
              PLATFORM APPS
            </div>
            <ul className="space-y-2.5 text-slate-300">
              <li>
                <Link href="/dashboard" className="hover:text-[#bae6fd] transition-colors flex items-center gap-1.5">
                  <Terminal size={14} /> Unlearn Studio
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#bae6fd] transition-colors">Sign In</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#bae6fd] transition-colors">Create Account</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#bae6fd] transition-colors">Run Probe Suite</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Legal */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[#fbcfe8] font-black uppercase tracking-wider text-sm border-b border-slate-800 pb-2 mb-3">
              COMPLIANCE
            </div>
            <ul className="space-y-2.5 text-slate-300">
              <li>
                <span className="text-slate-400 cursor-default">GDPR Right to Be Forgotten</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-default">CCPA Model Erasure</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-default">Reproducible PDF Audit</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-default">Immutable Checkpoints</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-[#bbf7d0]" />
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
