"use client";

import { useState } from "react";
import { Trash2, RefreshCw, CheckCircle2, ShieldAlert, Cpu, Sparkles } from "lucide-react";

interface TargetNode {
  id: string;
  name: string;
  category: string;
  paramImpact: string;
  computeOverhead: number;
  deleted: boolean;
}

export default function NeuralNodeErasureSandbox() {
  const [nodes, setNodes] = useState<TargetNode[]>([
    { id: "node-1", name: "AWS Secret Access Key Parser", category: "Copyrighted Code", paramImpact: "1.4B Weights", computeOverhead: 22, deleted: false },
    { id: "node-2", name: "PII Entity SSN / Address Index", category: "Privacy Leakage", paramImpact: "850M Weights", computeOverhead: 18, deleted: false },
    { id: "node-3", name: "Proprietary Algorithm Snippet #409", category: "Proprietary IP", paramImpact: "2.1B Weights", computeOverhead: 28, deleted: false },
    { id: "node-4", name: "Unsafe Alignment Vector #82", category: "Safety Alignment", paramImpact: "620M Weights", computeOverhead: 14, deleted: false },
  ]);

  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const toggleDelete = (id: string) => {
    setAnimatingId(id);
    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, deleted: !n.deleted } : n))
      );
      setAnimatingId(null);
    }, 400);
  };

  const resetAll = () => {
    setNodes((prev) => prev.map((n) => ({ ...n, deleted: false })));
  };

  const deletedCount = nodes.filter((n) => n.deleted).length;
  const initialCompute = 82;
  const currentCompute = initialCompute - nodes.filter((n) => n.deleted).reduce((acc, n) => acc + n.computeOverhead, 0);

  return (
    <div className="clean-card p-6 md:p-10 bg-white space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="clean-badge mb-2">PLAYABLE INTERACTIVE NODE SANDBOX</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Interactive Neural Node Erasure & Retraining
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1">
            Click target nodes below to trigger live gradient ascent erasure and watch model size & compute drop.
          </p>
        </div>

        <button onClick={resetAll} className="clean-btn-secondary text-xs py-2 px-4 flex items-center gap-2">
          <RefreshCw size={14} /> Reset Sandbox
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Node Grid Selector (Span 7) */}
        <div className="lg:col-span-7 space-y-3 font-sans">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            CLICK A TARGET NODE TO SURGICALLY ERASE IT:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => toggleDelete(node.id)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  node.deleted
                    ? "bg-slate-50 border-slate-200 opacity-60 line-through"
                    : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md"
                }`}
              >
                {animatingId === node.id && (
                  <div className="absolute inset-0 bg-amber-500/10 animate-pulse flex items-center justify-center font-mono text-xs font-bold text-amber-700">
                    Dissolving Node...
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                    node.deleted ? "bg-slate-200 text-slate-600" : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  }`}>
                    {node.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{node.paramImpact}</span>
                </div>

                <div className="font-bold text-xs text-slate-900 pr-6">{node.name}</div>
                
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
                  <span className={node.deleted ? "text-slate-400" : "text-rose-600"}>
                    -{node.computeOverhead}% Compute Load
                  </span>
                  <span className={node.deleted ? "text-emerald-600 font-bold" : "text-slate-500"}>
                    {node.deleted ? "ERASED ✓" : "CLICK TO ERASE"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Model Impact Dashboard (Span 5) */}
        <div className="lg:col-span-5 rounded-2xl p-6 bg-slate-950 text-white space-y-6 border border-slate-800 shadow-2xl flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-mono text-xs text-slate-400 font-semibold">// LIVE SHRUNK MODEL TELEMETRY</span>
              <span className="font-mono text-xs text-emerald-400 font-bold">{deletedCount} NODES ERASED</span>
            </div>

            <div>
              <div className="font-sans text-xs text-slate-400 font-semibold uppercase">TOTAL COMPUTE OVERHEAD SAVINGS</div>
              <div className="font-sans text-4xl sm:text-5xl font-extrabold text-white mt-1">
                {initialCompute - currentCompute}% SAVED
              </div>
              <div className="font-sans text-xs text-emerald-400 font-medium mt-1">
                Model shrunk & retrained without full cluster re-run
              </div>
            </div>

            {/* Meter Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span>COMPUTE LOAD METER:</span>
                <span className="text-white font-bold">{currentCompute}% ACTIVE</span>
              </div>
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentCompute}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Target Erased via Dual Loss</div>
              <div className="text-[11px] text-slate-400">100% of collateral skills (JS/TS/C++) remain untouched.</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
