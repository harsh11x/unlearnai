"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Zap, RefreshCw, CheckCircle2, Sliders, Play, RotateCcw } from "lucide-react";

type Mode = "BEFORE" | "UNLEARN" | "AFTER";

interface Node {
  x: number;
  y: number;
  layer: number;
  radius: number;
  isTarget: boolean;
  pulseOffset: number;
}

interface Connection {
  from: Node;
  to: Node;
  weight: number;
  isTarget: boolean;
}

export default function DeepMindNeuralCanvas() {
  const [mode, setMode] = useState<Mode>("BEFORE");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const metrics = {
    BEFORE: {
      computeUtil: "98% (Pinned)",
      computeCost: "$140,000 / mo",
      vram: "92 GB (Bloated)",
      errorRate: "38.4% Error Rate",
      status: "BLOATED MODEL STATE",
      statusBadge: "bg-rose-50 text-rose-700 border-rose-200",
    },
    UNLEARN: {
      computeUtil: "45% (Optimizing)",
      computeCost: "$12,000 / run",
      vram: "48 GB",
      errorRate: "Node Dissolution...",
      status: "GRADIENT ASCENT ACTIVE",
      statusBadge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    AFTER: {
      computeUtil: "28% (Streamlined)",
      computeCost: "$8,500 / mo (-94%)",
      vram: "24 GB (-74%)",
      errorRate: "0.0% Verified",
      status: "SHRUNK & RETRAINED",
      statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  }[mode];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = 440);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 440;
      }
    };

    window.addEventListener("resize", handleResize);

    const layers = 5;
    const nodesPerLayer = [4, 7, 8, 7, 4];
    const nodes: Node[] = [];
    const connections: Connection[] = [];

    // Generate Nodes across layers
    nodesPerLayer.forEach((count, lIndex) => {
      const layerX = (width / (layers + 1)) * (lIndex + 1);
      for (let i = 0; i < count; i++) {
        const layerY = (height / (count + 1)) * (i + 1);
        const isTargetNode = (lIndex === 1 && (i === 2 || i === 4)) || (lIndex === 2 && (i === 3 || i === 5)) || (lIndex === 3 && i === 2);
        nodes.push({
          x: layerX,
          y: layerY,
          layer: lIndex,
          radius: isTargetNode ? 8 : 6,
          isTarget: isTargetNode,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    });

    // Generate Connections between adjacent layers
    for (let l = 0; l < layers - 1; l++) {
      const currentLayerNodes = nodes.filter((n) => n.layer === l);
      const nextLayerNodes = nodes.filter((n) => n.layer === l + 1);

      currentLayerNodes.forEach((n1) => {
        nextLayerNodes.forEach((n2) => {
          const isTargetConn = n1.isTarget && n2.isTarget;
          connections.push({
            from: n1,
            to: n2,
            weight: isTargetConn ? 1.0 : Math.random() * 0.7 + 0.3,
            isTarget: isTargetConn,
          });
        });
      });
    }

    let timestamp = 0;

    const render = () => {
      timestamp += 0.03;
      ctx.clearRect(0, 0, width, height);

      // Clean background grid inside canvas
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Connections
      connections.forEach((conn) => {
        if (mode === "AFTER" && conn.isTarget) return; // Erased connections in AFTER mode

        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);

        if (conn.isTarget) {
          if (mode === "BEFORE") {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.85)"; // Noisy red connection
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
          } else if (mode === "UNLEARN") {
            const pulse = (Math.sin(timestamp * 6) + 1) / 2;
            ctx.strokeStyle = `rgba(245, 158, 11, ${pulse * 0.9})`; // Dissolving amber connection
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
          }
        } else {
          ctx.strokeStyle = mode === "AFTER" ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Animated Data Signal Particles
      connections.forEach((conn, index) => {
        if (mode === "AFTER" && conn.isTarget) return;

        const speed = conn.isTarget ? 0.025 : 0.015;
        const progress = (timestamp * speed + (index * 0.1)) % 1;
        const px = conn.from.x + (conn.to.x - conn.from.x) * progress;
        const py = conn.from.y + (conn.to.y - conn.from.y) * progress;

        ctx.beginPath();
        ctx.arc(px, py, conn.isTarget && mode === "BEFORE" ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = conn.isTarget ? "#f43f5e" : "#10b981";
        ctx.fill();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        if (mode === "AFTER" && node.isTarget) {
          // Render erased node outline in AFTER mode
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
          return;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isTarget) {
          if (mode === "BEFORE") {
            ctx.fillStyle = "#f43f5e";
            ctx.strokeStyle = "#fda4af";
            ctx.lineWidth = 2;
          } else if (mode === "UNLEARN") {
            const pulseRadius = node.radius + Math.sin(timestamp * 8 + node.pulseOffset) * 4;
            ctx.fillStyle = "#f59e0b";
            ctx.strokeStyle = "#fde68a";
            ctx.lineWidth = 2;
            ctx.arc(node.x, node.y, Math.max(2, pulseRadius), 0, Math.PI * 2);
          }
        } else {
          ctx.fillStyle = mode === "AFTER" ? "#10b981" : "#38bdf8";
          ctx.strokeStyle = mode === "AFTER" ? "#6ee7b7" : "#7dd3fc";
          ctx.lineWidth = 2;
        }

        ctx.fill();
        ctx.stroke();

        // Node halo effect in UNLEARN mode
        if (node.isTarget && mode === "UNLEARN") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Layer Titles at top of canvas
      const layerTitles = ["INPUT LAYER", "HIDDEN 1", "HIDDEN 2", "TARGET NODES", "OUTPUT PROBS"];
      nodesPerLayer.forEach((_, lIndex) => {
        const layerX = (width / (layers + 1)) * (lIndex + 1);
        ctx.font = "bold 10px JetBrains Mono, monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(layerTitles[lIndex], layerX, 24);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode]);

  return (
    <div className="clean-card p-6 md:p-8 bg-white space-y-6 font-sans">
      
      {/* Playable Mode Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="clean-badge mb-1">DEEP MIND PLAYABLE VISUALIZER</div>
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900">
            How AI Neural Networks Learn, Unlearn & Shrink
          </h3>
        </div>

        {/* Interactive Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
          <button
            onClick={() => setMode("BEFORE")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              mode === "BEFORE"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            1. Bloated (Before)
          </button>
          <button
            onClick={() => setMode("UNLEARN")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              mode === "UNLEARN"
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            2. Node Erasure
          </button>
          <button
            onClick={() => setMode("AFTER")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              mode === "AFTER"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            3. Shrunk (After)
          </button>
        </div>
      </div>

      {/* HTML5 Canvas Container */}
      <div className="relative w-full h-[440px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Status Overlay */}
        <div className="absolute top-4 right-4">
          <span className={`font-mono text-xs font-semibold px-3 py-1.5 rounded-full border ${metrics.statusBadge}`}>
            ● {metrics.status}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 font-mono text-[11px] bg-slate-900/90 text-slate-300 p-3 rounded-xl border border-slate-800 space-y-1.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span>Target Unwanted Data / PII / Code Paths</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
            <span>Preserved Retained Skill Nodes</span>
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans text-xs">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">GPU COMPUTE OVERHEAD</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{metrics.computeUtil}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">COMPUTE COST / MONTH</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{metrics.computeCost}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">MEMORY FOOTPRINT</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{metrics.vram}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">RESIDUAL ERROR RATE</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{metrics.errorRate}</div>
        </div>
      </div>

    </div>
  );
}
