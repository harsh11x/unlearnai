"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 pt-16 pb-12 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center font-black text-sm">
                N
              </div>
              <span className="font-sans font-black text-lg tracking-tight text-white">NULLMIND AI</span>
            </div>
            <p className="font-sans text-xs text-slate-400 max-w-sm leading-relaxed">
              Measured LLM unlearning & selective retraining engine. Surgically erase copyrighted code, PII, and memorized data parameters without spending $100k+ to retrain full model weights.
            </p>
            <div className="font-mono text-[11px] text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GDPR ARTICLE 17 & CCPA COMPLIANT</span>
            </div>
          </div>

          <div>
            <div className="font-sans font-bold text-xs uppercase tracking-wider text-white mb-4">PLATFORM VISUALS</div>
            <ul className="space-y-2.5 font-sans text-xs">
              <li><Link href="/#deep-mind" className="hover:text-white transition-colors">Deep Mind Visualizer</Link></li>
              <li><Link href="/#transformation" className="hover:text-white transition-colors">Before vs After Slider</Link></li>
              <li><Link href="/#node-sandbox" className="hover:text-white transition-colors">Node Erasure Sandbox</Link></li>
              <li><Link href="/#calculator" className="hover:text-white transition-colors">Compute Calculator</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-sans font-bold text-xs uppercase tracking-wider text-white mb-4">TECHNICAL SPEC</div>
            <ul className="space-y-2.5 font-sans text-xs">
              <li><span className="text-slate-400">89-Probe Evaluation Battery</span></li>
              <li><span className="text-slate-400">Dual-Loss Objective (L_forget + λ L_retain)</span></li>
              <li><span className="text-slate-400">Gradient Ascent Optimization</span></li>
              <li><span className="text-slate-400">Cryptographic PDF Audit Reports</span></li>
            </ul>
          </div>

          <div>
            <div className="font-sans font-bold text-xs uppercase tracking-wider text-white mb-4">COMPLIANCE</div>
            <ul className="space-y-2.5 font-sans text-xs">
              <li><span className="text-slate-400">GDPR Right to be Forgotten</span></li>
              <li><span className="text-slate-400">CCPA Model Erasure Spec</span></li>
              <li><span className="text-slate-400">Zero Collateral Loss Guarantee</span></li>
              <li><span className="text-slate-400">Paraphrase Resistance (99.4%)</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-500">
          <div>© {new Date().getFullYear()} NULLMIND AI INC. ALL RIGHTS RESERVED.</div>
          <div className="flex items-center gap-6">
            <span>PRIVACY POLICY</span>
            <span>TERMS OF SERVICE</span>
            <span>SECURITY SPEC</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
