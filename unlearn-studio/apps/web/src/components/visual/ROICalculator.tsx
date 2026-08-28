"use client";

import { useState, useMemo } from "react";

export default function ROICalculator() {
  const [params, setParams] = useState({
    modelSizeB: 7,
    trainPerMonth: 4,
    gpuHourCost: 2.50,
    avgGpuHours: 48,
    reductionPercent: 45,
  });

  const results = useMemo(() => {
    const originalCostPerTrain = params.avgGpuHours * params.gpuHourCost;
    const unlearnCostPerTrain = originalCostPerTrain * (1 - params.reductionPercent / 100) * 0.1; // retraining is ~10% of original
    const monthlySavings = (originalCostPerTrain - unlearnCostPerTrain) * params.trainPerMonth;
    const annualSavings = monthlySavings * 12;
    const annualOriginal = originalCostPerTrain * params.trainPerMonth * 12;
    const percentSaved = annualOriginal > 0 ? (annualSavings / annualOriginal) * 100 : 0;

    return {
      originalPerTrain: originalCostPerTrain,
      unlearnPerTrain: unlearnCostPerTrain,
      monthlySavings,
      annualSavings,
      annualOriginal,
      percentSaved,
      gpuHoursSavedPerYear: Math.round((originalCostPerTrain - unlearnCostPerTrain) * params.trainPerMonth * 12 / params.gpuHourCost),
    };
  }, [params]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border">
      {/* Inputs */}
      <div className="p-8 border-b lg:border-b-0 lg:border-r border-border space-y-6">
        <div>
          <span className="mono text-xs text-text-muted uppercase tracking-wider">Model Size</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={0.5} max={175} step={0.5}
              value={params.modelSizeB}
              onChange={(e) => setParams(p => ({ ...p, modelSizeB: +e.target.value }))}
              className="flex-1 h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <span className="mono text-sm text-text w-16 text-right">{params.modelSizeB}B</span>
          </div>
        </div>

        <div>
          <span className="mono text-xs text-text-muted uppercase tracking-wider">Training Runs / Month</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={1} max={30} step={1}
              value={params.trainPerMonth}
              onChange={(e) => setParams(p => ({ ...p, trainPerMonth: +e.target.value }))}
              className="flex-1 h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <span className="mono text-sm text-text w-16 text-right">{params.trainPerMonth}</span>
          </div>
        </div>

        <div>
          <span className="mono text-xs text-text-muted uppercase tracking-wider">Avg GPU Hours / Run</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={4} max={200} step={4}
              value={params.avgGpuHours}
              onChange={(e) => setParams(p => ({ ...p, avgGpuHours: +e.target.value }))}
              className="flex-1 h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <span className="mono text-sm text-text w-16 text-right">{params.avgGpuHours}h</span>
          </div>
        </div>

        <div>
          <span className="mono text-xs text-text-muted uppercase tracking-wider">GPU Cost / Hour</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={0.5} max={15} step={0.25}
              value={params.gpuHourCost}
              onChange={(e) => setParams(p => ({ ...p, gpuHourCost: +e.target.value }))}
              className="flex-1 h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <span className="mono text-sm text-text w-16 text-right">${params.gpuHourCost.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <span className="mono text-xs text-text-muted uppercase tracking-wider">Expected Reduction</span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={10} max={80} step={5}
              value={params.reductionPercent}
              onChange={(e) => setParams(p => ({ ...p, reductionPercent: +e.target.value }))}
              className="flex-1 h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <span className="mono text-sm text-text w-16 text-right">{params.reductionPercent}%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-8 space-y-6">
        {/* Hero stat */}
        <div className="bg-accent text-accent-inv p-6">
          <span className="mono text-xs opacity-50">ANNUAL SAVINGS</span>
          <p className="font-display text-5xl font-bold mt-1 tracking-tight">
            ${Math.round(results.annualSavings).toLocaleString()}
          </p>
          <p className="text-sm opacity-60 mt-1">
            {results.percentSaved.toFixed(0)}% reduction in compute costs
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-elevated">
            <span className="mono text-[10px] text-text-subtle">PER-TRAIN SAVINGS</span>
            <p className="font-display text-xl font-bold mt-1">
              ${(results.originalPerTrain - results.unlearnPerTrain).toFixed(0)}
            </p>
            <p className="body-sm">per training run</p>
          </div>
          <div className="card-elevated">
            <span className="mono text-[10px] text-text-subtle">GPU HOURS SAVED/YR</span>
            <p className="font-display text-xl font-bold mt-1">
              {results.gpuHoursSavedPerYear.toLocaleString()}
            </p>
            <p className="body-sm">hours of GPU time</p>
          </div>
          <div className="card-elevated">
            <span className="mono text-[10px] text-text-subtle">MONTHLY SAVINGS</span>
            <p className="font-display text-xl font-bold mt-1">
              ${Math.round(results.monthlySavings).toLocaleString()}
            </p>
            <p className="body-sm">per month</p>
          </div>
          <div className="card-elevated">
            <span className="mono text-[10px] text-text-subtle">CO₂ REDUCTION</span>
            <p className="font-display text-xl font-bold mt-1">
              {(results.gpuHoursSavedPerYear * 0.5).toFixed(0)} kg
            </p>
            <p className="body-sm">CO₂ equivalent saved</p>
          </div>
        </div>

        {/* Visual comparison bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="mono text-[10px] text-text-subtle">ANNUAL COST BEFORE</span>
            <span className="mono text-[10px] text-text-subtle">${Math.round(results.annualOriginal).toLocaleString()}</span>
          </div>
          <div className="w-full h-5 bg-surface border border-border">
            <div className="h-full bg-accent" style={{ width: "100%" }} />
          </div>

          <div className="flex justify-between mb-1 mt-3">
            <span className="mono text-[10px] text-text-subtle">ANNUAL COST AFTER</span>
            <span className="mono text-[10px] text-text-subtle">${Math.round(results.annualOriginal - results.annualSavings).toLocaleString()}</span>
          </div>
          <div className="w-full h-5 bg-surface border border-border">
            <div
              className="h-full bg-highlight"
              style={{ width: `${Math.max(5, (1 - results.annualSavings / results.annualOriginal) * 100)}%` }}
            />
          </div>
        </div>

        <p className="body-sm text-center">
          Based on {params.trainPerMonth} training runs/month with {params.avgGpuHours} GPU hours each
        </p>
      </div>
    </div>
  );
}
