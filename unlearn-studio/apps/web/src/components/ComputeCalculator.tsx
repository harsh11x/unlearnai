"use client";

import { useState, useMemo } from "react";

export default function ComputeCalculator() {
  const [params, setParams] = useState({
    originalNodes: 100,
    removedPercent: 35,
    retrainEpochs: 3,
    originalEpochs: 100,
    gpuHoursRate: 2.50,
  });

  const results = useMemo(() => {
    const originalCompute = params.originalNodes * params.originalEpochs;
    const shrunkNodes = params.originalNodes * (1 - params.removedPercent / 100);
    const retrainCompute = shrunkNodes * params.retrainEpochs;
    const newInference = shrunkNodes * params.originalEpochs; // ongoing inference
    const totalNewCompute = retrainCompute + newInference;
    const computeReduction = ((originalCompute - retrainCompute) / originalCompute) * 100;
    const costOriginal = (originalCompute / 100) * params.gpuHoursRate;
    const costAfter = (retrainCompute / 100) * params.gpuHoursRate;
    const savings = costOriginal - costAfter;

    return {
      originalCompute,
      retrainCompute,
      computeReduction: Math.max(0, computeReduction),
      costOriginal: Math.max(0, costOriginal),
      costAfter: Math.max(0, costAfter),
      savings: Math.max(0, savings),
      shrunkNodes: Math.round(shrunkNodes),
    };
  }, [params]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6">
        {/* Original model size */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Original Model Size
            </label>
            <span className="text-xs font-mono text-text">{params.originalNodes} nodes</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            step={10}
            value={params.originalNodes}
            onChange={(e) => setParams((p) => ({ ...p, originalNodes: +e.target.value }))}
            className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-text-subtle">20</span>
            <span className="text-[10px] font-mono text-text-subtle">300</span>
          </div>
        </div>

        {/* Nodes removed */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Nodes Removed
            </label>
            <span className="text-xs font-mono text-text">{params.removedPercent}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={params.removedPercent}
            onChange={(e) => setParams((p) => ({ ...p, removedPercent: +e.target.value }))}
            className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-text-subtle">5%</span>
            <span className="text-[10px] font-mono text-text-subtle">80%</span>
          </div>
        </div>

        {/* Retrain epochs */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Retraining Epochs
            </label>
            <span className="text-xs font-mono text-text">{params.retrainEpochs} epochs</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={params.retrainEpochs}
            onChange={(e) => setParams((p) => ({ ...p, retrainEpochs: +e.target.value }))}
            className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-text-subtle">1</span>
            <span className="text-[10px] font-mono text-text-subtle">20</span>
          </div>
        </div>

        {/* Original training epochs */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              Original Training Epochs
            </label>
            <span className="text-xs font-mono text-text">{params.originalEpochs} epochs</span>
          </div>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={params.originalEpochs}
            onChange={(e) => setParams((p) => ({ ...p, originalEpochs: +e.target.value }))}
            className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-text-subtle">10</span>
            <span className="text-[10px] font-mono text-text-subtle">300</span>
          </div>
        </div>

        {/* GPU rate */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
              GPU Cost per 100 Compute Units
            </label>
            <span className="text-xs font-mono text-text">${params.gpuHoursRate.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.25}
            value={params.gpuHoursRate}
            onChange={(e) => setParams((p) => ({ ...p, gpuHoursRate: +e.target.value }))}
            className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Main stat */}
        <div className="card">
          <span className="mono text-xs text-text-subtle">COMPUTE REDUCTION</span>
          <p className="stat-number mt-1">{results.computeReduction.toFixed(0)}%</p>
          <p className="body-sm mt-2">
            By removing {params.removedPercent}% of nodes and retraining for just{" "}
            {params.retrainEpochs} epochs instead of {params.originalEpochs}.
          </p>
        </div>

        {/* Cost comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <span className="mono text-xs text-text-subtle">BEFORE</span>
            <p className="stat-number mt-1 text-xl">${results.costOriginal.toFixed(2)}</p>
            <p className="body-sm mt-1">Original training cost</p>
          </div>
          <div className="card border-highlight">
            <span className="mono text-xs text-highlight">AFTER</span>
            <p className="stat-number mt-1 text-xl">${results.costAfter.toFixed(2)}</p>
            <p className="body-sm mt-1">Retraining cost</p>
          </div>
        </div>

        {/* Savings highlight */}
        <div className="bg-accent text-accent-inv p-6">
          <span className="mono text-xs opacity-60">YOU SAVE</span>
          <p className="font-display text-3xl font-bold mt-1 tracking-tight">
            ${results.savings.toFixed(2)}
          </p>
          <p className="text-sm opacity-70 mt-1">
            per training cycle · Model shrunk to {results.shrunkNodes} nodes
          </p>
        </div>

        {/* Visual bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="mono text-[10px] text-text-subtle">ORIGINAL</span>
            <span className="mono text-[10px] text-text-subtle">{results.originalCompute} units</span>
          </div>
          <div className="w-full h-3 bg-surface border border-border">
            <div
              className="h-full bg-accent"
              style={{ width: "100%" }}
            />
          </div>

          <div className="flex items-center justify-between mb-1 mt-3">
            <span className="mono text-[10px] text-text-subtle">AFTER UNLEARNING</span>
            <span className="mono text-[10px] text-text-subtle">{results.retrainCompute} units</span>
          </div>
          <div className="w-full h-3 bg-surface border border-border">
            <div
              className="h-full bg-highlight"
              style={{
                width: `${Math.max(2, (results.retrainCompute / results.originalCompute) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
