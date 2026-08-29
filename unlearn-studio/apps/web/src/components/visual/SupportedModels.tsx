"use client";

import { useState } from "react";

const MODELS = [
  {
    name: "LLaMA 2",
    org: "Meta",
    params: "7B / 13B / 70B",
    reduction: "38–52%",
    accuracy: "99.1%",
    speed: "2.3×",
    status: "Verified",
  },
  {
    name: "Mistral 7B",
    org: "Mistral AI",
    params: "7B",
    reduction: "41–48%",
    accuracy: "98.8%",
    speed: "2.1×",
    status: "Verified",
  },
  {
    name: "CodeLlama",
    org: "Meta",
    params: "7B / 13B / 34B",
    reduction: "35–55%",
    accuracy: "99.3%",
    speed: "2.5×",
    status: "Verified",
  },
  {
    name: "Falcon",
    org: "TII",
    params: "7B / 40B",
    reduction: "32–47%",
    accuracy: "98.5%",
    speed: "1.9×",
    status: "Verified",
  },
  {
    name: "Phi-2",
    org: "Microsoft",
    params: "2.7B",
    reduction: "44–60%",
    accuracy: "99.0%",
    speed: "2.8×",
    status: "Verified",
  },
  {
    name: "Gemma",
    org: "Google",
    params: "2B / 7B",
    reduction: "36–50%",
    accuracy: "98.9%",
    speed: "2.2×",
    status: "Verified",
  },
  {
    name: "Qwen 2",
    org: "Alibaba",
    params: "0.5B–72B",
    reduction: "30–58%",
    accuracy: "98.7%",
    speed: "2.0×",
    status: "Beta",
  },
  {
    name: "DeepSeek",
    org: "DeepSeek",
    params: "7B / 67B",
    reduction: "33–49%",
    accuracy: "98.6%",
    speed: "2.1×",
    status: "Beta",
  },
];

export default function SupportedModels() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-border">
      {MODELS.map((model, i) => (
        <div
          key={model.name}
          className={`p-4 sm:p-5 border-b border-border cursor-pointer transition-colors ${
            expanded === i ? "bg-surface" : "hover:bg-surface/50"
          }`}
          onClick={() => setExpanded(expanded === i ? null : i)}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-base">{model.name}</h3>
              <p className="body-sm">{model.org}</p>
            </div>
            <span className={`mono text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 border ${
              model.status === "Verified"
                ? "text-highlight border-highlight/30"
                : "text-text-subtle border-border"
            }`}>
              {model.status}
            </span>
          </div>

          <p className="mono text-xs text-text-muted mb-3">{model.params}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="mono text-[9px] text-text-subtle">REDUCE</span>
              <p className="mono text-sm text-text font-semibold">{model.reduction}</p>
            </div>
            <div>
              <span className="mono text-[9px] text-text-subtle">ACCURACY</span>
              <p className="mono text-sm text-highlight font-semibold">{model.accuracy}</p>
            </div>
            <div>
              <span className="mono text-[9px] text-text-subtle">SPEED</span>
              <p className="mono text-sm text-text font-semibold">{model.speed}</p>
            </div>
          </div>

          {/* Expanded details */}
          {expanded === i && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="body-sm">
                {model.name} by {model.org} with {model.params} parameters.
                Remap Studios achieves {model.reduction} parameter reduction while maintaining {model.accuracy} accuracy.
                Inference speed improves to {model.speed} the original.
              </p>
              <div className="mt-3 flex gap-2">
                <a href="/docs" className="text-xs text-text-muted hover:text-text transition-colors no-underline border border-border px-3 py-1">
                  View benchmark →
                </a>
                <a href="/downloads" className="text-xs bg-accent text-accent-inv hover:opacity-85 transition-opacity no-underline px-3 py-1">
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
