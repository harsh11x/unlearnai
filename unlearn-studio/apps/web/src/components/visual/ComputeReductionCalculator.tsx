"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

export default function ComputeReductionCalculator() {
  const [modelSize, setModelSize] = useState(70); // 1 to 200 (Billion params)
  const [targetPercent, setTargetPercent] = useState(5); // 0.1 to 20%

  const baseCostPerBillion = 450; // Base cost to train 1B params
  const fullRetrainCost = modelSize * baseCostPerBillion * 1.5; 
  const unlearnCost = modelSize * baseCostPerBillion * 0.08 * (targetPercent / 5);

  const savings = fullRetrainCost - unlearnCost;
  const savingsPercent = Math.min(98, ((savings / fullRetrainCost) * 100));

  return (
    <div className="comic-card p-6 md:p-10 space-y-8 font-sans bg-white">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-6">
        <div>
          <div className="comic-badge mb-2">ROI CALCULATOR</div>
          <h2 className="text-3xl font-black text-black tracking-tighter uppercase">
            COMPUTE SAVINGS
          </h2>
        </div>
        <div className="hidden md:flex">
          <Calculator size={48} strokeWidth={2} className="text-black" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Sliders Input */}
        <div className="space-y-8">
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="font-black text-sm uppercase tracking-widest text-black">
                TOTAL MODEL SIZE
              </label>
              <span className="font-mono text-xl font-black">{modelSize}B</span>
            </div>
            <div className="relative h-6 flex items-center">
              <input
                type="range"
                min="1"
                max="200"
                value={modelSize}
                onChange={(e) => setModelSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 border-2 border-black appearance-none cursor-pointer outline-none slider-thumb-black"
                style={{
                  background: `linear-gradient(to right, #000 0%, #000 ${(modelSize / 200) * 100}%, #e5e7eb ${(modelSize / 200) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              BASE PARAMETERS IN BILLIONS
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="font-black text-sm uppercase tracking-widest text-black">
                TARGET ERASURE DATA
              </label>
              <span className="font-mono text-xl font-black">{targetPercent}%</span>
            </div>
            <div className="relative h-6 flex items-center">
              <input
                type="range"
                min="1"
                max="20"
                value={targetPercent}
                onChange={(e) => setTargetPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 border-2 border-black appearance-none cursor-pointer outline-none slider-thumb-black"
                style={{
                  background: `linear-gradient(to right, #000 0%, #000 ${(targetPercent / 20) * 100}%, #e5e7eb ${(targetPercent / 20) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              PERCENTAGE OF CORPUS TO UNLEARN
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .slider-thumb-black::-webkit-slider-thumb {
              appearance: none;
              width: 24px;
              height: 24px;
              background: #fff;
              border: 4px solid #000;
              cursor: pointer;
              border-radius: 0;
            }
          `}} />

        </div>

        {/* Results output */}
        <div className="border-4 border-black p-6 bg-black text-white shadow-[8px_8px_0_0_#d1d5db] flex flex-col justify-between">
          <div className="text-center pb-6 border-b-2 border-gray-700">
            <div className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2">PROJECTED SAVINGS</div>
            <div className="text-6xl font-black tracking-tighter text-white">
              ${(savings / 1000).toFixed(1)}k
            </div>
            <div className="comic-badge mt-4 bg-white text-black border-black px-3 py-1 text-sm inline-block shadow-none">
              {savingsPercent.toFixed(1)}% LESS COMPUTE
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div>
              <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">FULL RETRAIN COST</div>
              <div className="text-xl font-black mt-1 line-through text-gray-400 decoration-gray-500 decoration-2">
                ${(fullRetrainCost / 1000).toFixed(1)}k
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-gray-300 tracking-wider">NULLMIND ERASE COST</div>
              <div className="text-xl font-black mt-1 text-white">
                ${(unlearnCost / 1000).toFixed(1)}k
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
