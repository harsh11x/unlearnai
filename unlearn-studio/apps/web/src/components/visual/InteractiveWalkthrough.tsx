"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    num: "01",
    title: "Upload Model",
    desc: "Load any HuggingFace-compatible model in .safetensors or .pt format. The system analyzes architecture, counts parameters, and maps every tensor.",
    stats: [
      { label: "Formats", value: "safetensors, .pt, .bin" },
      { label: "Max size", value: "70B parameters" },
      { label: "Parse time", value: "< 5 seconds" },
    ],
  },
  {
    num: "02",
    title: "Analyze Weights",
    desc: "Inspect every tensor — mean, std, percentiles, gradient flow. The heatmap shows weight distributions. Dead neurons and redundant parameters are identified automatically.",
    stats: [
      { label: "Metrics", value: "12 per tensor" },
      { label: "Heatmap", value: "128×128 resolution" },
      { label: "Dead neuron detection", value: "Automatic" },
    ],
  },
  {
    num: "03",
    title: "Select Target",
    desc: "Choose which capability to unlearn — Python, JavaScript, reasoning, or any custom category. The system identifies which neurons encode that knowledge.",
    stats: [
      { label: "Categories", value: "20+ built-in" },
      { label: "Custom targets", value: "Supported" },
      { label: "Auto-detection", value: "Yes" },
    ],
  },
  {
    num: "04",
    title: "Erase & Retrain",
    desc: "Gradient-based unlearning runs on GPU/CPU/MPS. Watch real-time loss curves as the model forgets the target while preserving everything else. Progress is visible live.",
    stats: [
      { label: "Methods", value: "Retain-Aware, Gradient" },
      { label: "Device", value: "GPU / MPS / CPU" },
      { label: "Real-time", value: "Live loss curves" },
    ],
  },
  {
    num: "05",
    title: "Export & Deploy",
    desc: "Save the modified model in any format. The exported model is smaller, faster, and retains accuracy on non-target capabilities.",
    stats: [
      { label: "Output formats", value: "safetensors, .pt" },
      { label: "Verification", value: "89 probe evaluation" },
      { label: "Size reduction", value: "35–70%" },
    ],
  },
];

export default function InteractiveWalkthrough() {
  const [activeStep, setActiveStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goToStep = (idx: number) => {
    if (animating || idx === activeStep) return;
    setAnimating(true);
    setActiveStep(idx);
    setTimeout(() => setAnimating(false), 300);
  };

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const step = STEPS[activeStep];

  return (
    <div className="border border-border">
      {/* Step indicators */}
      <div className="flex border-b border-border">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={`flex-1 py-3.5 px-2 text-center transition-all border-r border-border last:border-r-0 min-h-[44px] ${
              i === activeStep
                ? "bg-accent text-accent-inv"
                : "bg-transparent text-text-subtle hover:bg-surface"
            }`}
          >
            <span className="mono text-[10px] font-bold">{s.num}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Description */}
        <div className="p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-border">
          <span className="mono text-xs text-text-subtle">STEP {step.num}</span>
          <h3 className="heading-md mt-2 mb-4">{step.title}</h3>
          <p className="body-lg">{step.desc}</p>

          {/* Navigation */}
          <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              onClick={() => goToStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="btn-outline text-xs py-2 px-4 disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="mono text-xs text-text-subtle">
              {activeStep + 1} / {STEPS.length}
            </span>
            <button
              onClick={() => goToStep(Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className="btn-outline text-xs py-2 px-4 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right: Visual + Stats */}
        <div className="p-4 sm:p-8">
          {/* Animated visual for each step */}
          <div className="h-48 flex items-center justify-center mb-6">
            {activeStep === 0 && (
              <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                <rect x="30" y="10" width="140" height="100" fill="none" stroke="#333" strokeWidth="1" rx="4" />
                <rect x="30" y="10" width="140" height="24" fill="#171717" rx="4" />
                <text x="100" y="26" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="monospace">model.safetensors</text>
                <text x="100" y="52" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontFamily="monospace">⬆ Drop file here</text>
                <text x="100" y="70" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="monospace">or click to browse</text>
                <rect x="60" y="80" width="80" height="20" fill="#171717" rx="1" />
                <text x="100" y="94" textAnchor="middle" fill="#e5e5e5" fontSize="8" fontFamily="monospace">Open Model</text>
              </svg>
            )}
            {activeStep === 1 && (
              <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                {Array.from({ length: 8 }).map((_, row) =>
                  Array.from({ length: 8 }).map((_, col) => (
                    <rect
                      key={`${row}-${col}`}
                      x={20 + col * 22}
                      y={5 + row * 14}
                      width={18}
                      height={12}
                      fill={`rgb(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)})`}
                      rx="1"
                    />
                  ))
                )}
              </svg>
            )}
            {activeStep === 2 && (
              <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                {["Python", "JavaScript", "C++", "Reasoning", "Code Gen"].map((label, i) => (
                  <g key={label}>
                    <rect x={10} y={5 + i * 22} width={180} height={18} fill={i === 0 ? "#171717" : "#0a0a0a"} stroke={i === 0 ? "#e5e5e5" : "#333"} strokeWidth={i === 0 ? 1.5 : 0.5} rx="1" />
                    <text x={20} y={17 + i * 22} fill={i === 0 ? "#e5e5e5" : "#737373"} fontSize="9" fontFamily="monospace">{label}</text>
                    {i === 0 && <rect x={160} y={8 + i * 22} width={20} height={12} fill="#22c55e" rx="1" />}
                    {i === 0 && <text x={170} y={17 + i * 22} textAnchor="middle" fill="#fff" fontSize="7" fontFamily="monospace">✓</text>}
                  </g>
                ))}
              </svg>
            )}
            {activeStep === 3 && (
              <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                <polyline points="10,100 40,80 70,85 100,50 130,30 160,25 190,20" fill="none" stroke="#e5e5e5" strokeWidth="1.5" />
                <polyline points="10,95 40,90 70,88 100,70 130,60 160,55 190,52" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
                <text x="10" y="115" fill="#525252" fontSize="7" fontFamily="monospace">loss ↓</text>
                <circle cx="190" cy="20" r="3" fill="#e5e5e5" />
                <circle cx="190" cy="52" r="3" fill="#22c55e" />
                <text x="15" y="15" fill="#737373" fontSize="7" fontFamily="monospace">total</text>
                <text x="15" y="47" fill="#22c55e" fontSize="7" fontFamily="monospace">retain</text>
              </svg>
            )}
            {activeStep === 4 && (
              <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
                <rect x="20" y="10" width="70" height="100" fill="#0a0a0a" stroke="#333" strokeWidth="0.5" rx="2" />
                <rect x="20" y="10" width="70" height="20" fill="#171717" rx="2" />
                <text x="55" y="24" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="monospace">before</text>
                <text x="55" y="55" textAnchor="middle" fill="#a3a3a3" fontSize="14" fontFamily="sans-serif" fontWeight="bold">13.5 GB</text>
                <text x="55" y="72" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="monospace">6.7B params</text>

                <text x="100" y="60" textAnchor="middle" fill="#22c55e" fontSize="16" fontFamily="sans-serif">→</text>

                <rect x="110" y="10" width="70" height="100" fill="#0a0a0a" stroke="#22c55e" strokeWidth="0.5" rx="2" />
                <rect x="110" y="10" width="70" height="20" fill="#14532d" rx="2" />
                <text x="145" y="24" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="monospace">after</text>
                <text x="145" y="55" textAnchor="middle" fill="#22c55e" fontSize="14" fontFamily="sans-serif" fontWeight="bold">5.2 GB</text>
                <text x="145" y="72" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace">2.5B params</text>
              </svg>
            )}
          </div>

          {/* Step stats */}
          <div className="space-y-2">
            {step.stats.map((stat) => (
              <div key={stat.label} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="mono text-xs text-text-subtle">{stat.label}</span>
                <span className="mono text-xs text-text">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
