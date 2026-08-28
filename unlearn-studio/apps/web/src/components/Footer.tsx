"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white border-t-8 border-gray-900 pt-16 pb-12 font-sans halftone-bg-dense text-gray-100">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto bg-black p-8 sm:p-12 border-4 border-white shadow-[8px_8px_0_0_#fff]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b-4 border-white">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-black text-xl border-4 border-white">
                N
              </div>
              <span className="font-sans font-black text-3xl tracking-tighter text-white uppercase">NULLMIND</span>
            </div>
            <p className="font-sans text-sm text-gray-300 max-w-sm leading-relaxed font-medium border-l-4 border-gray-600 pl-4">
              Measured LLM unlearning & selective retraining engine. Surgically erase copyrighted code, PII, and memorized data parameters without spending $100k+ to retrain full model weights.
            </p>
            <div className="comic-badge-dark mt-4">
              GDPR & CCPA COMPLIANT
            </div>
          </div>

          <div>
            <div className="font-mono font-black text-sm uppercase tracking-widest text-white mb-6 border-b-2 border-gray-700 pb-2">VISUALS</div>
            <ul className="space-y-3 font-sans text-sm font-bold uppercase">
              <li><Link href="/#deep-mind" className="hover:text-gray-400 hover:underline transition-all">DEEP MIND CANVAS</Link></li>
              <li><Link href="/#transformation" className="hover:text-gray-400 hover:underline transition-all">BEFORE VS AFTER</Link></li>
              <li><Link href="/#node-sandbox" className="hover:text-gray-400 hover:underline transition-all">NODE SANDBOX</Link></li>
              <li><Link href="/#calculator" className="hover:text-gray-400 hover:underline transition-all">COMPUTE CALCULATOR</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-mono font-black text-sm uppercase tracking-widest text-white mb-6 border-b-2 border-gray-700 pb-2">TECH SPEC</div>
            <ul className="space-y-3 font-sans text-sm font-bold uppercase text-gray-400">
              <li>89-PROBE BATTERY</li>
              <li>DUAL-LOSS OBJECTIVE</li>
              <li>GRADIENT ASCENT</li>
              <li>CRYPTOGRAPHIC PDF</li>
            </ul>
          </div>

          <div>
            <div className="font-mono font-black text-sm uppercase tracking-widest text-white mb-6 border-b-2 border-gray-700 pb-2">LEGAL</div>
            <ul className="space-y-3 font-sans text-sm font-bold uppercase text-gray-400">
              <li>RIGHT TO BE FORGOTTEN</li>
              <li>ZERO COLLATERAL LOSS</li>
              <li>TERMS OF SERVICE</li>
              <li>PRIVACY POLICY</li>
            </ul>
          </div>

        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono font-bold text-xs text-gray-500 uppercase tracking-wider">
          <div>© {new Date().getFullYear()} NULLMIND INC.</div>
          <div>SYSTEM STATUS: ONLINE</div>
        </div>

      </div>
    </footer>
  );
}
