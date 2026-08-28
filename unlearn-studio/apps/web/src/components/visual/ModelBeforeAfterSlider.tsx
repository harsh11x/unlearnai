"use client";

import { useState } from "react";
import { ArrowLeftRight, Crosshair, CheckSquare, XSquare } from "lucide-react";

export default function ModelBeforeAfterSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="comic-card p-6 md:p-10 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-6">
        <div>
          <div className="comic-badge mb-2">INTERACTIVE SPLIT COMPARISON SLIDER</div>
          <h2 className="text-3xl font-black text-black tracking-tighter uppercase">
            BLOATED VS. SHRUNK MODEL
          </h2>
          <p className="font-sans text-sm font-bold text-gray-600 mt-2">
            Drag the slider to contrast the bloated pre-unlearn model with the shrunk, retrained model.
          </p>
        </div>
        <div className="comic-badge-dark px-3 py-1.5">
          94% COMPUTE SAVED
        </div>
      </div>

      {/* Interactive Split View Slider Box */}
      <div className="relative border-4 border-black shadow-[8px_8px_0_0_#000] overflow-hidden min-h-[420px] select-none bg-white">
        
        {/* RIGHT SIDE: AFTER NULLMIND (Base Layer - White/Stark) */}
        <div className="absolute inset-0 bg-white text-black p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b-4 border-black pb-3">
            <span className="comic-badge bg-white">
              AFTER (SHRUNK)
            </span>
            <span className="font-mono text-xs font-black uppercase text-black">● OPTIMIZED</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans my-6">
            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0_0_#d1d5db]">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">COMPUTE COST</div>
              <div className="text-2xl font-black text-black mt-1">$8,500/MO</div>
              <div className="text-[10px] font-bold mt-1 text-black">94% Compute Saved</div>
            </div>

            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0_0_#d1d5db]">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">RESIDUAL TARGET</div>
              <div className="text-2xl font-black text-black mt-1">0.0%</div>
              <div className="text-[10px] font-bold mt-1 text-black">Target Erased</div>
            </div>

            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0_0_#d1d5db]">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">UNLEARN TIME</div>
              <div className="text-2xl font-black text-black mt-1">4.2 MIN</div>
              <div className="text-[10px] font-bold mt-1 text-black">A100 GPU Run</div>
            </div>

            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0_0_#d1d5db]">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">COMPLIANCE</div>
              <div className="text-xl font-black text-black mt-1 flex items-center gap-1.5">
                <CheckSquare size={20} strokeWidth={3} /> GDPR PASS
              </div>
              <div className="text-[10px] font-bold mt-1 text-black">PDF Certificate</div>
            </div>
          </div>

          <div className="font-mono text-xs font-bold bg-white p-3.5 border-2 border-black flex items-center justify-between shadow-[4px_4px_0_0_#d1d5db]">
            <span>Target knowledge erased while 100% of collateral skills (JS/TS/C++) remain intact.</span>
            <span className="font-black text-black">[ PASS AUDIT ]</span>
          </div>
        </div>

        {/* LEFT SIDE: BEFORE NULLMIND (Clipped Overlay - Black/Inverted with Halftone) */}
        <div
          className="absolute inset-y-0 left-0 bg-black text-white p-6 sm:p-8 flex flex-col justify-between border-r-4 border-black overflow-hidden halftone-bg-dense"
          style={{ width: `${sliderPos}%` }}
        >
          {/* We use an inner wrapper with fixed width to prevent wrapping text as the container shrinks */}
          <div className="w-[1000px] h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-4 border-white pb-3 max-w-[1000px]">
              <span className="comic-badge-dark">
                BEFORE (BLOATED)
              </span>
              <span className="font-mono text-xs font-black uppercase text-white">● HIGH ERROR & COMPUTE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans my-6 max-w-[1000px]">
              <div className="p-4 border-2 border-white bg-black shadow-[4px_4px_0_0_#fff]">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">COMPUTE COST</div>
                <div className="text-2xl font-black text-white mt-1">$140,000/MO</div>
                <div className="text-[10px] font-bold mt-1 text-white">Full Cluster Retraining</div>
              </div>

              <div className="p-4 border-2 border-white bg-black shadow-[4px_4px_0_0_#fff]">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">RESIDUAL TARGET</div>
                <div className="text-2xl font-black text-white mt-1">50.0%</div>
                <div className="text-[10px] font-bold mt-1 text-white">Unwanted Data</div>
              </div>

              <div className="p-4 border-2 border-white bg-black shadow-[4px_4px_0_0_#fff]">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">RETRAIN TIME</div>
                <div className="text-2xl font-black text-white mt-1">14 DAYS</div>
                <div className="text-[10px] font-bold mt-1 text-white">Cluster Retrain</div>
              </div>

              <div className="p-4 border-2 border-white bg-black shadow-[4px_4px_0_0_#fff]">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">COMPLIANCE</div>
                <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
                  <XSquare size={20} strokeWidth={3} /> NON-COMPLIANT
                </div>
                <div className="text-[10px] font-bold mt-1 text-white">PII Leakage Risk</div>
              </div>
            </div>

            <div className="font-mono text-xs font-bold bg-black text-white p-3.5 border-2 border-white max-w-[1000px] flex items-center justify-between shadow-[4px_4px_0_0_#fff]">
              <span>Model permanently retains copyrighted data, PII, and unsafe representations.</span>
              <span className="font-black text-white">[ HIGH RISK ]</span>
            </div>
          </div>
        </div>

        {/* Drag Handle Controls */}
        <div
          className="absolute inset-y-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-12 h-12 bg-white text-black border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000] pointer-events-auto cursor-ew-resize -ml-6 hover:scale-110 transition-transform active:scale-95">
            <ArrowLeftRight size={20} strokeWidth={3} />
          </div>
          {/* A thick black line in the middle */}
          <div className="absolute top-0 bottom-0 w-1 bg-black -z-10" />
        </div>

        {/* Hidden Range Input */}
        <input
          type="range"
          min="5"
          max="95"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] font-black uppercase text-gray-500 tracking-wider">
        <span>← DRAG SLIDER TO CONTRAST BEFORE & AFTER</span>
        <span>SLIDER POSITION: {sliderPos}%</span>
      </div>

    </div>
  );
}
