"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    number: "01",
    title: "Analyze the Model",
    description:
      "Map every node, weight, and connection in the neural network. Identify which neurons are essential and which are redundant, noisy, or overfitted.",
    visual: "AnalyzeVisual",
  },
  {
    number: "02",
    title: "Identify Redundancy",
    description:
      "Our algorithm detects dead neurons, overlapping representations, spurious correlations, and knowledge that no longer serves the model's purpose.",
    visual: "IdentifyVisual",
  },
  {
    number: "03",
    title: "Erase Unnecessary Nodes",
    description:
      "Surgically remove the identified nodes and connections. The network architecture shrinks while preserving core functionality.",
    visual: "EraseVisual",
  },
  {
    number: "04",
    title: "Retrain the Lean Model",
    description:
      "The shrunken model retrains in a fraction of the original time. Less nodes = less compute = same accuracy, dramatically lower cost.",
    visual: "RetrainVisual",
  },
];

function AnalyzeVisual() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Grid of small squares representing model analysis */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <rect
            key={`${row}-${col}`}
            x={10 + col * 18}
            y={5 + row * 9}
            width={14}
            height={7}
            fill={Math.random() > 0.5 ? "#171717" : "#d4d4d4"}
            opacity={Math.random() * 0.5 + 0.3}
          />
        ))
      )}
      {/* Scanning line */}
      <line x1="10" y1="40" x2="110" y2="40" stroke="#171717" strokeWidth="0.5" strokeDasharray="2 2">
        <animate attributeName="y1" from="5" to="75" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y2" from="5" to="75" dur="2s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function IdentifyVisual() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Circles with some highlighted as "bad" */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = 15 + (i % 4) * 30;
        const y = 15 + Math.floor(i / 4) * 22;
        const isRedundant = [1, 5, 9].includes(i);
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="6"
              fill={isRedundant ? "#ef4444" : "#171717"}
              opacity={isRedundant ? 0.8 : 0.6}
            />
            {isRedundant && (
              <circle cx={x} cy={y} r="9" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 1">
                <animate attributeName="r" from="8" to="14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function EraseVisual() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Grid with some being erased (shrinking + X) */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = 10 + (i % 6) * 18;
        const y = 10 + Math.floor(i / 6) * 22;
        const isDeleted = [1, 4, 7, 11, 16].includes(i);
        return (
          <g key={i}>
            <rect x={x} y={y} width={12} height={10} fill={isDeleted ? "#ef4444" : "#171717"} opacity={isDeleted ? 0.3 : 0.7} rx="1" />
            {isDeleted && (
              <>
                <line x1={x + 3} y1={y + 3} x2={x + 9} y2={y + 7} stroke="#ef4444" strokeWidth="1.5" />
                <line x1={x + 9} y1={y + 3} x2={x + 3} y2={y + 7} stroke="#ef4444" strokeWidth="1.5" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RetrainVisual() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Growing bars representing training progress */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = 10 + i * 14;
        const maxHeight = 10 + Math.random() * 55;
        return (
          <g key={i}>
            <rect x={x} y={70 - maxHeight} width={10} height={maxHeight} fill="#22c55e" opacity={0.7} rx="1">
              <animate
                attributeName="height"
                from="0"
                to={maxHeight}
                dur={`${1 + i * 0.15}s`}
                fill="freeze"
              />
              <animate
                attributeName="y"
                from="70"
                to={70 - maxHeight}
                dur={`${1 + i * 0.15}s`}
                fill="freeze"
              />
            </rect>
            <line x1={x} y1="70" x2={x + 10} y2="70" stroke="#d4d4d4" strokeWidth="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

const visualComponents: Record<string, React.FC> = {
  AnalyzeVisual,
  IdentifyVisual,
  EraseVisual,
  RetrainVisual,
};

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up");
          }
        });
      },
      { threshold: 0.15 }
    );

    const items = sectionRef.current?.querySelectorAll("[data-animate]");
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="space-y-0">
      {STEPS.map((step, idx) => {
        const Visual = visualComponents[step.visual];
        const isEven = idx % 2 === 0;
        return (
          <div
            key={step.number}
            data-animate
            className="opacity-0"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-border ${
                idx === 0 ? "border-t" : ""
              }`}
            >
              {/* Text */}
              <div className={`p-8 lg:p-12 ${!isEven ? "lg:order-2" : ""}`}>
                <span className="mono text-xs text-text-subtle">{step.number}</span>
                <h3 className="heading-md mt-2 mb-3">{step.title}</h3>
                <p className="body-sm max-w-md">{step.description}</p>
              </div>

              {/* Visual */}
              <div
                className={`bg-surface flex items-center justify-center p-8 min-h-[200px] ${
                  !isEven ? "lg:order-1" : ""
                }`}
              >
                <div className="w-full max-w-[200px]">
                  {Visual && <Visual />}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
