"use client";

import { useState } from "react";
import { Zap, ShieldCheck, AlertCircle, ArrowLeftRight, CheckCircle2, XCircle } from "lucide-react";

export default function ModelComparisonSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="brutalist-card p-6 md:p-10 bg-white space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#09090b] pb-6">
        <div>
          <div className="brutalist-badge mb-2">INTERACTIVE METRIC SLIDER</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans text-[#09090b]">
            Before vs. After Model Transformation
          </h2>
          <p className="font-mono text-xs text-[#52525b] mt-1">
            Drag the slider to contrast the bloated pre-unlearn state with the streamlined, retrained model.
          </p>
        </div>
        <div className="font-mono text-xs font-bold uppercase bg-[#09090b] text-white px-3 py-1.5 border border-[#09090b]">
          // 94% COMPUTE REDUCTION
        </div>
      </div>

      {/* Interactive Split View Slider Box */}
      <div className="relative brutalist-card bg-[#f7f6f2] overflow-hidden min-h-[380px] select-none">
        
        {/* RIGHT SIDE: AFTER NULLMIND (Base Layer) */}
        <div className="absolute inset-0 bg-[#09090b] text-white p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="font-mono text-xs font-extrabold bg-white text-[#09090b] px-2.5 py-1 uppercase">
              AFTER NULLMIND (STREAMLINED & COMPLIANT)
            </span>
            <span className="font-mono text-xs text-emerald-400 font-bold">● OPTIMIZED</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono my-6">
            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">COMPUTE COST</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">$8,500 / mo</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-1">94% Savings</div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">RESIDUAL TARGET</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">0.0%</div>
              <div className="text-[10px] text-zinc-400 mt-1">Target Erased</div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">UNLEARN TIME</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">4.2 MIN</div>
              <div className="text-[10px] text-zinc-400 mt-1">A100 GPU Run</div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">COMPLIANCE</div>
              <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 size={16} /> GDPR PASS
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">PDF Certificate</div>
            </div>
          </div>

          <div className="font-mono text-xs text-zinc-400 bg-zinc-900 p-3 border border-zinc-800 flex items-center justify-between">
            <span>// STATUS: Target knowledge erased while 100% of collateral skills (JS/TS/C++) remain intact.</span>
            <span className="font-extrabold text-white">[ PASS AUDIT ]</span>
          </div>
        </div>

        {/* LEFT SIDE: BEFORE NULLMIND (Clipped Overlay) */}
        <div
          className="absolute inset-y-0 left-0 bg-[#f7f6f2] text-[#09090b] p-6 sm:p-8 flex flex-col justify-between border-r-2 border-[#09090b] overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="w-[1000px]">
            <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-3 max-w-[1000px]">
              <span className="font-mono text-xs font-extrabold bg-[#09090b] text-white px-2.5 py-1 uppercase">
                BEFORE NULLMIND (BLOATED & ERRONEUS)
              </span>
              <span className="font-mono text-xs text-[#09090b] font-bold">● HIGH ERROR</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono my-6 max-w-[1000px]">
              <div className="p-3 bg-white border-2 border-[#09090b] shadow-[2px_2px_0_0_#09090b]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold">COMPUTE COST</div>
                <div className="text-xl sm:text-2xl font-extrabold text-red-600 mt-1">$140,000 / mo</div>
                <div className="text-[10px] text-red-600 font-bold mt-1">Full Retraining</div>
              </div>

              <div className="p-3 bg-white border-2 border-[#09090b] shadow-[2px_2px_0_0_#09090b]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold">RESIDUAL TARGET</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#09090b] mt-1">50.0%</div>
                <div className="text-[10px] text-[#71717a] mt-1">Unwanted Data</div>
              </div>

              <div className="p-3 bg-white border-2 border-[#09090b] shadow-[2px_2px_0_0_#09090b]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold">RETRAIN TIME</div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#09090b] mt-1">14 DAYS</div>
                <div className="text-[10px] text-[#71717a] mt-1">Cluster Retrain</div>
              </div>

              <div className="p-3 bg-white border-2 border-[#09090b] shadow-[2px_2px_0_0_#09090b]">
                <div className="text-[10px] text-[#71717a] uppercase font-bold">COMPLIANCE</div>
                <div className="text-base sm:text-lg font-extrabold text-red-600 mt-1 flex items-center gap-1">
                  <XCircle size={16} /> NON-COMPLIANT
                </div>
                <div className="text-[10px] text-red-600 font-bold mt-1">PII Leakage Risk</div>
              </div>
            </div>

            <div className="font-mono text-xs text-[#52525b] bg-white p-3 border-2 border-[#09090b] max-w-[1000px] flex items-center justify-between shadow-[2px_2px_0_0_#09090b]">
              <span>// STATUS: Model permanently retains copyrighted data, PII, and unsafe representations.</span>
              <span className="font-extrabold text-red-600">[ HIGH RISK ]</span>
            </div>
          </div>
        </div>

        {/* Drag Handle Controls */}
        <div
          className="absolute inset-y-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-9 h-9 bg-[#09090b] text-white border-2 border-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-ew-resize -ml-4 hover:scale-110 transition-transform">
            <ArrowLeftRight size={16} />
          </div>
        </div>

        {/* Hidden Range Input overlay for smooth touch/mouse drag */}
        <input
          type="range"
          min="5"
          max="95"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
        />
      </div>

      <div className="flex justify-between font-mono text-xs font-bold text-[#71717a]">
        <span>← DRAG SLIDER TO CONTRAST BEFORE & AFTER</span>
        <span>SLIDER POSITION: {sliderPos}%</span>
      </div>

    </div>
  );
}
