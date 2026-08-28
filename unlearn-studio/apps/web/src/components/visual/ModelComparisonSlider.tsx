"use client";

import { useState } from "react";
import { Zap, ShieldCheck, AlertCircle, ArrowLeftRight, CheckCircle2, XCircle } from "lucide-react";

export default function ModelComparisonSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="soft-card p-6 md:p-10 bg-white space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="soft-badge mb-2">INTERACTIVE METRIC SLIDER</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900">
            Before vs. After Model Transformation
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1">
            Drag the slider to contrast the bloated pre-unlearn state with the streamlined, retrained model.
          </p>
        </div>
        <div className="font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full">
          94% COMPUTE REDUCTION
        </div>
      </div>

      {/* Interactive Split View Slider Box */}
      <div className="relative rounded-2xl bg-slate-950 overflow-hidden min-h-[380px] select-none border border-slate-800 shadow-2xl">
        
        {/* RIGHT SIDE: AFTER NULLMIND (Base Layer) */}
        <div className="absolute inset-0 bg-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-mono text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
              AFTER NULLMIND (STREAMLINED & COMPLIANT)
            </span>
            <span className="font-mono text-xs text-emerald-400 font-medium">● OPTIMIZED</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans my-6">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">COMPUTE COST</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">$8,500 / mo</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">94% Savings</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">RESIDUAL TARGET</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">0.0%</div>
              <div className="text-[11px] text-slate-400 mt-1">Target Erased</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">UNLEARN TIME</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">4.2 MIN</div>
              <div className="text-[11px] text-slate-400 mt-1">A100 GPU Run</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">COMPLIANCE</div>
              <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> GDPR PASS
              </div>
              <div className="text-[11px] text-slate-400 mt-1">PDF Certificate</div>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span>Target knowledge erased while 100% of collateral skills (JS/TS/C++) remain intact.</span>
            <span className="font-bold text-emerald-400">[ PASS AUDIT ]</span>
          </div>
        </div>

        {/* LEFT SIDE: BEFORE NULLMIND (Clipped Overlay) */}
        <div
          className="absolute inset-y-0 left-0 bg-slate-100 text-slate-900 p-6 sm:p-8 flex flex-col justify-between border-r border-slate-300 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="w-[1000px]">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 max-w-[1000px]">
              <span className="font-mono text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-full uppercase">
                BEFORE NULLMIND (BLOATED & ERRONEUS)
              </span>
              <span className="font-mono text-xs text-rose-600 font-medium">● HIGH ERROR</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans my-6 max-w-[1000px]">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">COMPUTE COST</div>
                <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">$140,000 / mo</div>
                <div className="text-[11px] text-rose-600 font-semibold mt-1">Full Retraining</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">RESIDUAL TARGET</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">50.0%</div>
                <div className="text-[11px] text-slate-500 mt-1">Unwanted Data</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">RETRAIN TIME</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">14 DAYS</div>
                <div className="text-[11px] text-slate-500 mt-1">Cluster Retrain</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">COMPLIANCE</div>
                <div className="text-base sm:text-lg font-extrabold text-rose-600 mt-1 flex items-center gap-1.5">
                  <XCircle size={16} /> NON-COMPLIANT
                </div>
                <div className="text-[11px] text-rose-600 font-semibold mt-1">PII Leakage Risk</div>
              </div>
            </div>

            <div className="font-mono text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 max-w-[1000px] flex items-center justify-between shadow-sm">
              <span>Model permanently retains copyrighted data, PII, and unsafe representations.</span>
              <span className="font-bold text-rose-600">[ HIGH RISK ]</span>
            </div>
          </div>
        </div>

        {/* Drag Handle Controls */}
        <div
          className="absolute inset-y-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 pointer-events-auto cursor-ew-resize -ml-5 hover:scale-110 transition-transform">
            <ArrowLeftRight size={18} />
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

      <div className="flex justify-between font-mono text-xs font-semibold text-slate-500">
        <span>← DRAG SLIDER TO CONTRAST BEFORE & AFTER</span>
        <span>SLIDER POSITION: {sliderPos}%</span>
      </div>

    </div>
  );
}

