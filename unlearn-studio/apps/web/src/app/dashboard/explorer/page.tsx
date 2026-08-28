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
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="89-Probe Capability Explorer" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="soft-badge mb-2">PROBE SUITE</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                89-Probe Capability Explorer
              </h1>
              <p className="font-sans text-xs text-slate-500 mt-1">
                Evaluating model accuracy across 20+ capability categories and 89 empirical probes.
              </p>
            </div>
            <button className="soft-btn-primary text-xs py-2.5 px-5">
              <Play size={14} /> Re-Run All Probes
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-indigo-600" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-900">Python (Target Domain)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cats.map((c) => (
                <div key={c.name} className="soft-card p-4 bg-white">
                  <div className="flex justify-between mb-2 font-sans text-xs font-semibold">
                    <span className="text-slate-900">{c.name}</span>
                    <span className="text-indigo-600 font-bold">{c.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-900">Retention Skill Sets</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {retain.map((c) => (
                <div key={c.name} className="soft-card p-4 bg-white">
                  <div className="flex justify-between mb-2 font-sans text-xs font-semibold">
                    <span className="text-slate-900">{c.name}</span>
                    <span className="text-emerald-600 font-bold">{c.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card p-5 bg-indigo-50 border border-indigo-200/80 flex items-center justify-between font-sans">
            <span className="font-bold text-sm text-slate-900 uppercase">Overall Baseline Accuracy Score</span>
            <span className="text-2xl font-extrabold text-indigo-600">40.4%</span>
          </div>

        </main>
      </div>
    </div>
  );
}
