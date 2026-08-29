"use client";

import { useState } from "react";

const MODELS = [
  { name: "LLaMA 2 7B", params: "7B", beforeGB: 13.5, afterGB: 5.2, beforeCost: 4200, afterCost: 680, accuracy: 99.2 },
  { name: "Mistral 7B", params: "7B", beforeGB: 14.2, afterGB: 4.8, beforeCost: 3800, afterCost: 520, accuracy: 98.8 },
  { name: "CodeLlama 13B", params: "13B", beforeGB: 26.0, afterGB: 9.1, beforeCost: 8400, afterCost: 1200, accuracy: 99.1 },
  { name: "Falcon 40B", params: "40B", beforeGB: 80.0, afterGB: 28.0, beforeCost: 24000, afterCost: 3400, accuracy: 98.5 },
];

export default function BeforeAfterComparison() {
  const [selected, setSelected] = useState(0);
  const [sliderVal, setSliderVal] = useState(50);
  const model = MODELS[selected];

  const sizeReduction = ((1 - sliderVal / 100) * 100).toFixed(0);
  const currentGB = (model.beforeGB * (1 - sliderVal / 100 * 0.62)).toFixed(1);
  const currentCost = Math.round(model.beforeCost * (1 - sliderVal / 100 * 0.84));

  return (
    <div className="border border-border">
      {/* Model selector tabs */}
      <div className="flex border-b border-border scroll-x-mobile">
        {MODELS.map((m, i) => (
          <button
            key={m.name}
            onClick={() => { setSelected(i); setSliderVal(50); }}
            className={`px-4 sm:px-5 py-3 text-xs font-mono border-r border-border whitespace-nowrap transition-colors min-h-[44px] ${
              i === selected ? "bg-accent text-accent-inv" : "bg-transparent text-text-muted hover:bg-surface"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Visual comparison */}
        <div className="p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Before Unlearning</span>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-1">{model.beforeGB} GB</p>
              <p className="body-sm">{model.params} parameters</p>
            </div>
            <div className="text-right">
              <span className="mono text-[10px] text-highlight uppercase tracking-wider">After Unlearning</span>
              <p className="font-display text-2xl sm:text-3xl font-bold mt-1 text-highlight">{currentGB} GB</p>
              <p className="body-sm">{sizeReduction}% smaller</p>
            </div>
          </div>

          {/* Visual bar comparison */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="mono text-[10px] text-text-subtle">BEFORE</span>
                <span className="mono text-[10px] text-text-subtle">{model.beforeGB} GB</span>
              </div>
              <div className="w-full h-6 bg-surface border border-border relative overflow-hidden">
                <div className="h-full bg-accent" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="mono text-[10px] text-text-subtle">AFTER</span>
                <span className="mono text-[10px] text-text-subtle">{currentGB} GB</span>
              </div>
              <div className="w-full h-6 bg-surface border border-border relative overflow-hidden">
                <div className="h-full bg-highlight" style={{ width: `${(parseFloat(currentGB) / model.beforeGB) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Accuracy badge */}
          <div className="mt-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-highlight inline-block" />
            <span className="mono text-xs text-text-muted">
              Accuracy retained: <span className="text-highlight font-semibold">{model.accuracy}%</span>
            </span>
          </div>
        </div>

        {/* Right: Interactive slider */}
        <div className="p-4 sm:p-8">
          <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Unlearning Intensity</span>

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderVal}
              onChange={(e) => setSliderVal(+e.target.value)}
              className="w-full h-1 bg-border rounded-none appearance-none cursor-pointer accent-[#171717]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-mono text-text-subtle">None</span>
              <span className="text-[10px] font-mono text-text">{sliderVal}%</span>
              <span className="text-[10px] font-mono text-text-subtle">Maximum</span>
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="card-elevated">
              <span className="mono text-[10px] text-text-subtle">MODEL SIZE</span>
              <p className="font-display text-2xl font-bold mt-1">{currentGB} GB</p>
              <p className="body-sm">↓ {sizeReduction}% reduction</p>
            </div>
            <div className="card-elevated">
              <span className="mono text-[10px] text-text-subtle">TRAINING COST</span>
              <p className="font-display text-2xl font-bold mt-1">${currentCost.toLocaleString()}</p>
              <p className="body-sm">↓ {((1 - currentCost / model.beforeCost) * 100).toFixed(0)}% savings</p>
            </div>
            <div className="card-elevated">
              <span className="mono text-[10px] text-text-subtle">RETRAINING TIME</span>
              <p className="font-display text-2xl font-bold mt-1">{Math.round(6 * (1 - sliderVal / 100 * 0.85))}d</p>
              <p className="body-sm">vs 6 weeks original</p>
            </div>
            <div className="card-elevated">
              <span className="mono text-[10px] text-text-subtle">INFERENCE SPEED</span>
              <p className="font-display text-2xl font-bold mt-1">{(1 + sliderVal / 100 * 2.5).toFixed(1)}×</p>
              <p className="body-sm">faster inference</p>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="mt-6 bg-surface border border-border p-4">
            <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Cost Breakdown (per training cycle)</span>
            <div className="mt-3 space-y-2">
              {[
                ["GPU hours", `$${Math.round(model.beforeCost * 0.7)} → $${Math.round(currentCost * 0.7)}`],
                ["Storage", `$${Math.round(model.beforeCost * 0.15)} → $${Math.round(currentCost * 0.15)}`],
                ["Engineering time", `$${Math.round(model.beforeCost * 0.15)} → $${Math.round(currentCost * 0.15)}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className="mono text-xs text-text">{val}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-xs font-semibold text-text">Total saved</span>
                <span className="mono text-xs text-highlight font-semibold">
                  ${(model.beforeCost - currentCost).toLocaleString()} ({((1 - currentCost / model.beforeCost) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
