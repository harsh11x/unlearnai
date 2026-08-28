"use client";

import { useState } from "react";
import { Zap, DollarSign, Leaf, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ComputeCalculator() {
  const [paramsBillion, setParamsBillion] = useState(70); // 7B, 13B, 70B, 175B
  const [requestsPerMonth, setRequestsPerMonth] = useState(5); // 1 to 50 requests

  // Calculation Logic
  // Full Retrain Cost: approx $2,000 per Billion parameters per retrain run
  const fullRetrainRunCost = paramsBillion * 2000;
  const fullRetrainAnnualCost = fullRetrainRunCost * requestsPerMonth * 12;

  // NullMind Unlearning Cost: approx $35 per Billion parameters per targeted unlearn run
  const nullmindRunCost = paramsBillion * 35;
  const nullmindAnnualCost = nullmindRunCost * requestsPerMonth * 12;

  // Savings
  const annualSavings = fullRetrainAnnualCost - nullmindAnnualCost;
  const savingsPercent = Math.round((annualSavings / fullRetrainAnnualCost) * 100);

  // Carbon Impact (Tons CO2)
  const fullRetrainCO2 = Math.round((paramsBillion * 1.8 * requestsPerMonth * 12) / 10);
  const nullmindCO2 = Math.round((paramsBillion * 0.05 * requestsPerMonth * 12) / 10);

  return (
    <div className="brutalist-card p-6 md:p-10 bg-white space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#09090b] pb-6">
        <div>
          <div className="brutalist-badge mb-2">FINANCIAL & COMPUTE CALCULATOR</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans text-[#09090b]">
            Compute & Cost Savings Calculator
          </h2>
          <p className="font-mono text-xs text-[#52525b] mt-1">
            Calculate your annual compute cost and CO₂ savings compared to full model retraining.
          </p>
        </div>
        <div className="font-mono text-xs font-bold uppercase bg-[#09090b] text-white px-3 py-1.5 border border-[#09090b]">
          // REAL-TIME COMPUTE ESTIMATOR
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Sliders Control Panel */}
        <div className="lg:col-span-6 space-y-6 font-mono">
          
          {/* Control 1: Model Parameter Size */}
          <div className="brutalist-card p-5 bg-[#f7f6f2] space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="uppercase text-[#09090b]">1. AI Model Parameter Count:</span>
              <span className="text-sm font-extrabold text-[#09090b] bg-white border border-[#09090b] px-2 py-0.5">
                {paramsBillion} BILLION PARAMS
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[7, 13, 70, 175].map((val) => (
                <button
                  key={val}
                  onClick={() => setParamsBillion(val)}
                  className={`py-2 text-xs font-bold border-2 transition-all ${
                    paramsBillion === val
                      ? "bg-[#09090b] text-white border-[#09090b] shadow-[2px_2px_0_0_#09090b]"
                      : "bg-white text-[#09090b] border-[#09090b] hover:bg-white"
                  }`}
                >
                  {val}B
                </button>
              ))}
            </div>
          </div>

          {/* Control 2: Monthly Unlearn Requests */}
          <div className="brutalist-card p-5 bg-[#f7f6f2] space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="uppercase text-[#09090b]">2. Unlearn & Retrain Requests:</span>
              <span className="text-sm font-extrabold text-[#09090b] bg-white border border-[#09090b] px-2 py-0.5">
                {requestsPerMonth} REQUESTS / MONTH
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="50"
              value={requestsPerMonth}
              onChange={(e) => setRequestsPerMonth(Number(e.target.value))}
              className="w-full accent-[#09090b] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-[#71717a] font-bold">
              <span>1 Request/mo</span>
              <span>25 Requests/mo</span>
              <span>50 Requests/mo</span>
            </div>
          </div>

        </div>

        {/* Real-time Calculation Results Display */}
        <div className="lg:col-span-6 brutalist-card p-6 bg-[#09090b] text-white space-y-6">
          
          <div className="border-b border-zinc-800 pb-3 flex justify-between items-center font-mono text-xs">
            <span className="text-zinc-400 font-bold uppercase">// ANNUAL SAVINGS SUMMARY</span>
            <span className="text-emerald-400 font-extrabold">{savingsPercent}% REDUCTION</span>
          </div>

          <div>
            <div className="font-mono text-xs text-zinc-400 uppercase font-bold">TOTAL ANNUAL COST SAVINGS</div>
            <div className="font-mono text-4xl sm:text-5xl font-extrabold text-white mt-1">
              ${annualSavings.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-emerald-400 font-bold mt-1">
              Saved every year with NullMind Studio
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs pt-2 border-t border-zinc-800">
            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">FULL RETRAINING COST</div>
              <div className="text-lg font-extrabold text-red-400 mt-0.5">${fullRetrainAnnualCost.toLocaleString()}</div>
              <div className="text-[9px] text-zinc-500 mt-1">{fullRetrainCO2} Tons CO₂</div>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">NULLMIND UNLEARNING</div>
              <div className="text-lg font-extrabold text-emerald-400 mt-0.5">${nullmindAnnualCost.toLocaleString()}</div>
              <div className="text-[9px] text-emerald-400 font-bold mt-1">{nullmindCO2} Tons CO₂ (-97%)</div>
            </div>
          </div>

          <div className="font-mono text-xs text-zinc-400 bg-zinc-900 p-3 border border-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} /> Instant GDPR & CCPA Compliance
            </span>
            <span className="text-white font-extrabold">[ CALCULATED ]</span>
          </div>

        </div>

      </div>

    </div>
  );
}
