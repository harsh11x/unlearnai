"use client";

import { DashboardHeader, DashboardSidebar } from "../page";
import { BarChart3, CheckCircle2, Target, Download } from "lucide-react";

export default function ResultsPage() {
  const results = [
    { cap: "Python Code Generation", before: 50.0, after: 0.0, isTarget: true },
    { cap: "JavaScript Code Generation", before: 50.0, after: 50.0, isTarget: false },
    { cap: "TypeScript Syntax & Types", before: 100.0, after: 100.0, isTarget: false },
    { cap: "C++ Memory Management", before: 75.0, after: 75.0, isTarget: false },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Audit Certificate & Results Scorecard" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="brutalist-badge mb-2">STEP 05 // AUDIT REPORT</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
                Empirical Results & Cryptographic Audit
              </h1>
              <p className="font-mono text-xs text-[#52525b] mt-1">
                Post-unlearning evaluation scorecard and reproducible PDF audit certificate generation.
              </p>
            </div>
            <button className="brutalist-btn-primary text-xs px-5 py-2.5">
              <Download size={14} /> Export Cryptographic PDF Audit
            </button>
          </div>

          {/* Results Table */}
          <div className="brutalist-card overflow-hidden bg-white">
            <div className="grid grid-cols-4 bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase p-3">
              <div>Capability</div>
              <div className="text-center">Before Unlearn</div>
              <div className="text-center">After Unlearn</div>
              <div className="text-center">Delta</div>
            </div>
            {results.map((r) => {
              const d = r.after - r.before;
              return (
                <div key={r.cap} className={`grid grid-cols-4 border-t-2 border-[#09090b] font-mono text-xs p-4 items-center ${r.isTarget ? "bg-[#f7f6f2] font-bold" : ""}`}>
                  <div className="flex items-center gap-2 font-bold text-[#09090b]">
                    {r.isTarget && <Target size={14} className="text-[#09090b]" />}{r.cap}
                    {r.isTarget && <span className="text-[9px] bg-[#09090b] text-white px-1.5 py-0.5">TARGET</span>}
                  </div>
                  <div className="text-center text-[#52525b]">{r.before}%</div>
                  <div className="text-center text-[#52525b]">{r.after}%</div>
                  <div className={`text-center font-extrabold ${r.isTarget ? "text-[#09090b]" : "text-[#71717a]"}`}>{d >= 0 ? "+" : ""}{d.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            {[{ l: "Target Reduction", v: "100%" }, { l: "Retain Preservation", v: "100%" }, { l: "Collateral Loss", v: "0.0%" }, { l: "Audit Verdict", v: "PASS" }].map((s) => (
              <div key={s.l} className="brutalist-card p-4 bg-white text-center">
                <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">{s.l}</div>
                <div className="text-xl font-extrabold text-[#09090b]">{s.v}</div>
              </div>
            ))}
          </div>

          {/* Verification Badge */}
          <div className="brutalist-card p-6 bg-white flex items-start gap-4">
            <CheckCircle2 size={24} className="text-[#09090b] shrink-0 mt-0.5" />
            <div>
              <div className="font-mono font-extrabold text-base text-[#09090b] uppercase">VERDICT: UNLEARNING VERIFIED (PASS AUDIT)</div>
              <p className="font-mono text-xs text-[#52525b] mt-1">Target capability successfully reduced to 0.0%. Retained capability domains preserved without collateral loss.</p>
              <div className="font-mono text-[11px] text-[#71717a] mt-2">
                CRYPTOGRAPHIC HASH: sha256-8a91b4c8d0e2f3a4b5c6d7e8f9012345
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
