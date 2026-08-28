"use client";

import { DashboardHeader, DashboardSidebar } from "../page";
import { Brain, Play, Target, CheckCircle2 } from "lucide-react";

export default function ExplorerPage() {
  const cats = [
    { name: "Syntax & Grammar", score: 50 }, { name: "Functions & Scope", score: 75 }, { name: "Classes & Inheritance", score: 25 },
    { name: "Iterators & Loops", score: 67 }, { name: "Generators & Yield", score: 33 }, { name: "Decorators & Wrappers", score: 67 },
    { name: "Debugging & Errors", score: 33 }, { name: "Algorithms & Complexity", score: 29 },
  ];
  const retain = [
    { name: "JavaScript", score: 50 }, { name: "TypeScript", score: 100 },
    { name: "C++", score: 75 }, { name: "General Programming", score: 17 },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Capability Explorer & Probing Battery" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="brutalist-badge mb-2">STEP 02 // PROBE SUITE</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
                89-Probe Capability Explorer
              </h1>
              <p className="font-mono text-xs text-[#52525b] mt-1">
                Evaluating model accuracy across 20+ capability categories and 89 empirical probes.
              </p>
            </div>
            <button className="brutalist-btn-primary text-xs px-5 py-2.5">
              <Play size={14} /> Re-Run All Probes
            </button>
          </div>

          {/* Target Domain Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-[#09090b]" />
              <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#09090b]">Python (Target Domain)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cats.map((c) => (
                <div key={c.name} className="brutalist-card p-4 bg-white">
                  <div className="flex justify-between mb-2 font-mono text-xs font-bold">
                    <span>{c.name}</span>
                    <span>{c.score}%</span>
                  </div>
                  <div className="h-2 bg-[#f7f6f2] border border-[#09090b] overflow-hidden">
                    <div className="h-full bg-[#09090b]" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retention Domain Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-[#09090b]" />
              <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#09090b]">Retention Skill Sets</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {retain.map((c) => (
                <div key={c.name} className="brutalist-card p-4 bg-white">
                  <div className="flex justify-between mb-2 font-mono text-xs font-bold">
                    <span>{c.name}</span>
                    <span>{c.score}%</span>
                  </div>
                  <div className="h-2 bg-[#f7f6f2] border border-[#09090b] overflow-hidden">
                    <div className="h-full bg-[#09090b]" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brutalist-card p-5 bg-[#f7f6f2] flex items-center justify-between font-mono">
            <span className="font-extrabold text-sm uppercase">Overall Baseline Accuracy Score</span>
            <span className="text-2xl font-extrabold text-[#09090b]">40.4%</span>
          </div>

        </main>
      </div>
    </div>
  );
}
