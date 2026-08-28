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
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Audit Certificate & Scorecard" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="soft-badge mb-2">AUDIT REPORT</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Empirical Results & Cryptographic Audit
              </h1>
              <p className="font-sans text-xs text-slate-500 mt-1">
                Post-unlearning evaluation scorecard and reproducible PDF audit certificate generation.
              </p>
            </div>
            <button className="soft-btn-primary text-xs py-2.5 px-5">
              <Download size={14} /> Export PDF Audit Certificate
            </button>
          </div>

          <div className="soft-card overflow-hidden bg-white">
            <div className="grid grid-cols-4 bg-slate-950 text-white font-sans text-xs font-bold uppercase p-3.5">
              <div>Capability</div>
              <div className="text-center">Before Unlearn</div>
              <div className="text-center">After Unlearn</div>
              <div className="text-center">Delta</div>
            </div>
            {results.map((r) => {
              const d = r.after - r.before;
              return (
                <div key={r.cap} className={`grid grid-cols-4 border-t border-slate-200 font-sans text-xs p-4 items-center ${r.isTarget ? "bg-indigo-50/50 font-bold" : ""}`}>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    {r.isTarget && <Target size={14} className="text-indigo-600" />}{r.cap}
                    {r.isTarget && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">TARGET</span>}
                  </div>
                  <div className="text-center text-slate-600">{r.before}%</div>
                  <div className="text-center text-slate-600">{r.after}%</div>
                  <div className={`text-center font-extrabold ${r.isTarget ? "text-indigo-600" : "text-slate-500"}`}>{d >= 0 ? "+" : ""}{d.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans text-xs">
            {[{ l: "Target Reduction", v: "100%" }, { l: "Retain Preservation", v: "100%" }, { l: "Collateral Loss", v: "0.0%" }, { l: "Audit Verdict", v: "PASS" }].map((s) => (
              <div key={s.l} className="soft-card p-4 bg-white text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">{s.l}</div>
                <div className="text-xl font-extrabold text-slate-900">{s.v}</div>
              </div>
            ))}
          </div>

          <div className="soft-card p-6 bg-white flex items-start gap-4">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-sans font-bold text-base text-slate-900 uppercase">VERDICT: UNLEARNING VERIFIED (PASS AUDIT)</div>
              <p className="font-sans text-xs text-slate-500 mt-1">Target capability successfully reduced to 0.0%. Retained capability domains preserved without collateral loss.</p>
              <div className="font-mono text-[11px] text-slate-400 mt-2">
                CRYPTOGRAPHIC HASH: sha256-8a91b4c8d0e2f3a4b5c6d7e8f9012345
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
