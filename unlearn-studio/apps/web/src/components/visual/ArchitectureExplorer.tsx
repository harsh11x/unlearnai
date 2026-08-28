"use client";

import { useState } from "react";

const LAYERS = [
  {
    name: "Embedding Layer",
    type: "input",
    params: "154M",
    desc: "Converts token IDs into dense vector representations. Each token gets a 4096-dimensional embedding vector.",
    detail: "vocab_size × hidden_dim = 32,000 × 4,096 = 131M parameters",
    color: "#a3a3a3",
  },
  {
    name: "Self-Attention Q",
    type: "attention",
    params: "38M",
    desc: "Query projection — determines what information each token should look for in other tokens.",
    detail: "hidden_dim × head_dim × num_heads = 4,096 × 1,024 = 38M",
    color: "#737373",
  },
  {
    name: "Self-Attention K",
    type: "attention",
    params: "38M",
    desc: "Key projection — determines what information each token offers to other tokens.",
    detail: "hidden_dim × head_dim × num_heads = 4,096 × 1,024 = 38M",
    color: "#737373",
  },
  {
    name: "Self-Attention V",
    type: "attention",
    params: "38M",
    desc: "Value projection — the actual content that gets attended to and mixed across tokens.",
    detail: "hidden_dim × head_dim × num_heads = 4,096 × 1,024 = 38M",
    color: "#737373",
  },
  {
    name: "Attention Output",
    type: "attention",
    params: "38M",
    desc: "Projects the concatenated attention output back to the model dimension.",
    detail: "head_dim × num_heads × hidden_dim = 1,024 × 4,096 = 38M",
    color: "#737373",
  },
  {
    name: "Layer Norm 1",
    type: "norm",
    params: "8K",
    desc: "Normalizes the attention output. Stabilizes training and improves convergence.",
    detail: "hidden_dim × 2 (weight + bias) = 4,096 × 2 = 8K",
    color: "#525252",
  },
  {
    name: "FFN Gate",
    type: "mlp",
    params: "92M",
    desc: "Gated feed-forward network — the 'thinking' layer. Controls which features pass through.",
    detail: "hidden_dim × intermediate_dim = 4,096 × 22,528 = 92M",
    color: "#a3a3a3",
  },
  {
    name: "FFN Up",
    type: "mlp",
    params: "92M",
    desc: "Projects to higher dimension for non-linear processing.",
    detail: "hidden_dim × intermediate_dim = 4,096 × 22,528 = 92M",
    color: "#a3a3a3",
  },
  {
    name: "FFN Down",
    type: "mlp",
    params: "92M",
    desc: "Projects back to model dimension. Together with Gate/Up, forms the MLP block.",
    detail: "intermediate_dim × hidden_dim = 22,528 × 4,096 = 92M",
    color: "#a3a3a3",
  },
  {
    name: "Layer Norm 2",
    type: "norm",
    params: "8K",
    desc: "Normalizes before the next attention block.",
    detail: "hidden_dim × 2 = 8K",
    color: "#525252",
  },
  {
    name: "LM Head",
    type: "output",
    params: "154M",
    desc: "Final projection to vocabulary logits. Produces probability distribution over all tokens.",
    detail: "hidden_dim × vocab_size = 4,096 × 32,000 = 131M",
    color: "#171717",
  },
];

export default function ArchitectureExplorer() {
  const [selected, setSelected] = useState<number | null>(null);

  const totalParams = "6.7B";

  return (
    <div className="border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">
          Interactive Architecture — Click any layer
        </span>
        <span className="mono text-xs text-text-muted">LLaMA-style Transformer · {totalParams} params</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Left: Visual diagram */}
        <div className="lg:col-span-2 p-6 border-b lg:border-b-0 lg:border-r border-border">
          <svg viewBox="0 0 500 400" className="w-full" style={{ maxHeight: 400 }}>
            {/* Title */}
            <text x="250" y="20" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="monospace">
              FORWARD PASS
            </text>

            {/* Draw layers as connected blocks */}
            {LAYERS.map((layer, i) => {
              const x = 40;
              const y = 35 + i * 33;
              const w = 180;
              const h = 26;
              const isSelected = selected === i;
              const opacity = selected === null ? 0.7 : isSelected ? 1 : 0.3;

              return (
                <g key={i} onClick={() => setSelected(isSelected ? null : i)} className="cursor-pointer">
                  {/* Connection line */}
                  {i < LAYERS.length - 1 && (
                    <line x1={x + w / 2} y1={y + h} x2={x + w / 2} y2={y + h + 7} stroke="#333" strokeWidth="1" />
                  )}

                  {/* Block */}
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={isSelected ? layer.color : "#171717"}
                    stroke={isSelected ? "#e5e5e5" : "#333"}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    opacity={opacity}
                    rx="1"
                  />

                  {/* Label */}
                  <text x={x + 8} y={y + 16} fill={isSelected ? "#fff" : "#a3a3a3"} fontSize="10" fontFamily="monospace" opacity={opacity}>
                    {layer.name}
                  </text>

                  {/* Params */}
                  <text x={x + w - 8} y={y + 16} fill={isSelected ? "#fff" : "#525252"} fontSize="9" fontFamily="monospace" textAnchor="end" opacity={opacity}>
                    {layer.params}
                  </text>

                  {/* Type indicator */}
                  <rect x={x - 3} y={y + 5} width={3} height={16} fill={layer.color} opacity={opacity * 0.5} />
                </g>
              );
            })}

            {/* Right side: info panel when selected */}
            {selected !== null && (
              <g>
                <rect x={250} y={35} width={240} height={350} fill="#111" stroke="#333" strokeWidth="0.5" rx="1" />
                <text x={264} y={60} fill="#737373" fontSize="9" fontFamily="monospace">
                  {"SELECTED LAYER"}
                </text>
                <text x={264} y={80} fill="#e5e5e5" fontSize="13" fontFamily="sans-serif" fontWeight="bold">
                  {LAYERS[selected].name}
                </text>
                <text x={264} y={100} fill="#525252" fontSize="10" fontFamily="monospace">
                  Type: {LAYERS[selected].type}
                </text>
                <text x={264} y={116} fill="#a3a3a3" fontSize="10" fontFamily="monospace">
                  Parameters: {LAYERS[selected].params}
                </text>

                {/* Description */}
                <foreignObject x={264} y={130} width={210} height={120}>
                  <p style={{ color: "#a3a3a3", fontSize: "11px", lineHeight: "1.5", fontFamily: "sans-serif" }}>
                    {LAYERS[selected].desc}
                  </p>
                </foreignObject>

                {/* Formula */}
                <rect x={264} y={260} width={210} height={50} fill="#0a0a0a" stroke="#333" strokeWidth="0.5" rx="1" />
                <text x={272} y={278} fill="#737373" fontSize="8" fontFamily="monospace">
                  FORMULA
                </text>
                <text x={272} y={296} fill="#e5e5e5" fontSize="9" fontFamily="monospace">
                  {LAYERS[selected].detail}
                </text>

                {/* Unlearnable indicator */}
                <rect x={264} y={320} width={210} height={40} fill={LAYERS[selected].type === "mlp" ? "#14532d" : "#171717"} stroke={LAYERS[selected].type === "mlp" ? "#22c55e" : "#333"} strokeWidth="0.5" rx="1" />
                <text x={272} y={340} fill={LAYERS[selected].type === "mlp" ? "#22c55e" : "#525252"} fontSize="10" fontFamily="monospace">
                  {LAYERS[selected].type === "mlp" ? "✓ Primary unlearning target" : "○ Less affected by unlearning"}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Right: Layer list */}
        <div className="p-4">
          <span className="mono text-[10px] text-text-subtle uppercase tracking-wider">Layer Breakdown</span>
          <div className="mt-3 space-y-1">
            {LAYERS.map((layer, i) => (
              <button
                key={i}
                onClick={() => setSelected(selected === i ? null : i)}
                className={`w-full text-left p-2 flex items-center justify-between transition-colors ${
                  selected === i ? "bg-surface" : "hover:bg-surface/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: layer.color }} />
                  <span className="text-xs text-text-muted">{layer.name}</span>
                </div>
                <span className="mono text-[10px] text-text-subtle">{layer.params}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between">
              <span className="text-xs text-text-muted font-semibold">Total Parameters</span>
              <span className="mono text-xs text-text">{totalParams}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
