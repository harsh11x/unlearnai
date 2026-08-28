"use client";

import { useState } from "react";
import { CheckCircle2, DollarSign, Leaf, ArrowUpRight } from "lucide-react";

export default function ComputeReductionCalculator() {
  const [paramsBillion, setParamsBillion] = useState(70);
  const [requestsPerMonth, setRequestsPerMonth] = useState(5);

  const fullRetrainRunCost = paramsBillion * 2000;
  const fullRetrainAnnualCost = fullRetrainRunCost * requestsPerMonth * 12;

  const nullmindRunCost = paramsBillion * 35;
  const nullmindAnnualCost = nullmindRunCost * requestsPerMonth * 12;

  const annualSavings = fullRetrainAnnualCost - nullmindAnnualCost;
  const savingsPercent = Math.round((annualSavings / fullRetrainAnnualCost) * 100);

  const fullRetrainCO2 = Math.round((paramsBillion * 1.8 * requestsPerMonth * 12) / 10);
  const nullmindCO2 = Math.round((paramsBillion * 0.05 * requestsPerMonth * 12) / 10);

  return (
    <div className="clean-card p-6 md:p-10 bg-white space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="clean-badge mb-2">COMPUTE & FINANCIAL CALCULATOR</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Real-Time Compute & Financial Savings Estimator
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1">
            Calculate how much GPU compute cost and carbon footprint you save compared to full model retraining.
          </p>
        </div>
        <div className="font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-full">
          {savingsPercent}% COMPUTE REDUCTION
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Sliders Control Panel (Span 6) */}
        <div className="lg:col-span-6 space-y-6 font-sans">
          
          {/* Control 1: Model Parameter Size */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span className="uppercase">1. AI Model Parameter Count:</span>
              <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                {paramsBillion} BILLION PARAMS
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[7, 13, 70, 175].map((val) => (
                <button
                  key={val}
                  onClick={() => setParamsBillion(val)}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    paramsBillion === val
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {val}B
                </button>
              ))}
            </div>
          </div>

          {/* Control 2: Monthly Unlearn Requests */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span className="uppercase">2. Unlearn & Retrain Requests:</span>
              <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                {requestsPerMonth} REQUESTS / MONTH
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="50"
              value={requestsPerMonth}
              onChange={(e) => setRequestsPerMonth(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>1 Request/mo</span>
              <span>25 Requests/mo</span>
              <span>50 Requests/mo</span>
            </div>
          </div>

        </div>

        {/* Real-Time Display Panel (Span 6) */}
        <div className="lg:col-span-6 rounded-2xl p-6 bg-slate-950 text-white space-y-6 border border-slate-800 shadow-2xl">
          
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center font-mono text-xs">
            <span className="text-slate-400 font-medium">// ANNUAL SAVINGS SUMMARY</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {savingsPercent}% SAVED
            </span>
          </div>

          <div>
            <div className="font-sans text-xs text-slate-400 font-semibold uppercase">TOTAL ANNUAL FINANCIAL SAVINGS</div>
            <div className="font-sans text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
              ${annualSavings.toLocaleString()}
            </div>
            <div className="font-sans text-xs text-emerald-400 font-medium mt-1">
              Saved every year with NullMind AI Studio
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 font-sans text-xs pt-2 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">FULL RETRAINING COST</div>
              <div className="text-lg font-extrabold text-rose-400 mt-0.5">${fullRetrainAnnualCost.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1">{fullRetrainCO2} Tons CO₂</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">NULLMIND UNLEARNING</div>
              <div className="text-lg font-extrabold text-emerald-400 mt-0.5">${nullmindAnnualCost.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">{nullmindCO2} Tons CO₂ (-97%)</div>
            </div>
          </div>

          <div className="font-sans text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 size={16} /> Instant GDPR & CCPA Legal Compliance
            </span>
            <span className="text-white font-bold">[ CALCULATED ]</span>
          </div>

        </div>

      </div>

    </div>
  );
}
