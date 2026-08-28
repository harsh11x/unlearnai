"use client";

import { useState } from "react";
import { RefreshCw, Skull, CheckSquare } from "lucide-react";

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
    <div className="comic-card p-6 md:p-10 bg-white space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-6">
        <div>
          <div className="comic-badge mb-2">PLAYABLE SANDBOX</div>
          <h2 className="text-3xl font-black text-black tracking-tighter uppercase">
            NEURAL NODE ERASURE
          </h2>
          <p className="font-sans text-sm font-bold text-gray-600 mt-2">
            Click target nodes below to trigger live erasure and watch model size & compute drop.
          </p>
        </div>

        <button onClick={resetAll} className="comic-btn-secondary text-xs py-2 px-4 flex items-center gap-2">
          <RefreshCw size={16} strokeWidth={3} /> RESET
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Node Grid Selector (Span 7) */}
        <div className="lg:col-span-7 space-y-4 font-sans">
          <div className="text-sm font-black text-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">
            SELECT TARGET NODE TO ERASE:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => toggleDelete(node.id)}
                className={`p-4 border-4 transition-all relative overflow-hidden text-left ${
                  node.deleted
                    ? "bg-gray-200 border-gray-400 text-gray-500 shadow-none line-through"
                    : "bg-white border-black hover:bg-black hover:text-white shadow-[4px_4px_0_0_#000]"
                }`}
              >
                {animatingId === node.id && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center font-mono text-sm font-black text-black uppercase">
                    ERASING...
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border-2 ${
                    node.deleted ? "bg-gray-300 border-gray-400 text-gray-600" : "bg-white text-black border-black"
                  }`}>
                    {node.category}
                  </span>
                  <span className={`text-[11px] font-mono font-bold ${node.deleted ? "" : "text-gray-500"}`}>{node.paramImpact}</span>
                </div>

                <div className="font-black text-sm uppercase pr-6 leading-tight h-10">{node.name}</div>
                
                <div className="mt-4 flex items-center justify-between text-[11px] font-black uppercase">
                  <span>
                    -{node.computeOverhead}% COMPUTE
                  </span>
                  <span className="flex items-center gap-1">
                    {node.deleted ? <CheckSquare size={14} /> : <Skull size={14} />}
                    {node.deleted ? "ERASED" : "CLICK TO ERASE"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Model Impact Dashboard (Span 5) */}
        <div className="lg:col-span-5 border-4 border-black p-6 bg-black text-white shadow-[8px_8px_0_0_#d1d5db] flex flex-col justify-between halftone-bg-dense">
          
          <div className="w-[100%] bg-black p-4 border-2 border-white space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-700 pb-3">
              <span className="font-mono text-[10px] text-gray-400 font-black tracking-widest">// SHRUNK MODEL TELEMETRY</span>
              <span className="font-mono text-[10px] bg-white text-black px-2 py-0.5 font-black uppercase">{deletedCount} NODES ERASED</span>
            </div>

            <div>
              <div className="font-sans text-[10px] text-gray-400 font-black uppercase tracking-widest">COMPUTE OVERHEAD SAVED</div>
              <div className="font-sans text-5xl font-black text-white mt-1">
                {initialCompute - currentCompute}%
              </div>
              <div className="font-sans text-xs text-gray-300 font-bold mt-2">
                Model shrunk & retrained without full cluster re-run
              </div>
            </div>

            {/* Meter Bar */}
            <div className="space-y-2 pt-4 border-t-2 border-gray-700">
              <div className="flex justify-between font-mono text-[10px] font-bold text-gray-400 uppercase">
                <span>COMPUTE LOAD METER:</span>
                <span className="text-white">{currentCompute}% ACTIVE</span>
              </div>
              <div className="h-4 bg-gray-800 border-2 border-white w-full">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${currentCompute}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white text-black border-2 border-black flex items-center gap-3">
            <CheckSquare size={24} strokeWidth={3} className="shrink-0" />
            <div>
              <div className="font-black text-sm uppercase">TARGETS ERASED</div>
              <div className="text-[10px] font-bold text-gray-600 mt-1">100% collateral skills remain intact.</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
