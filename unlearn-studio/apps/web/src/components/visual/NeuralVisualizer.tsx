"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Zap, RefreshCw, AlertTriangle, CheckCircle2, Sliders } from "lucide-react";

type Mode = "BEFORE" | "UNLEARN" | "AFTER";

interface Node {
  x: number;
  y: number;
  layer: number;
  radius: number;
  isTarget: boolean;
  active: boolean;
  pulseOffset: number;
}

interface Connection {
  from: Node;
  to: Node;
  weight: number;
  isTarget: boolean;
}

export default function NeuralVisualizer() {
  const [mode, setMode] = useState<Mode>("BEFORE");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Compute metrics based on mode
  const metrics = {
    BEFORE: {
      computeUtil: "98%",
      computeCost: "$140,000 / mo",
      vram: "92 GB",
      errorRate: "38.4%",
      status: "BLOATED & NOISY",
      statusColor: "bg-[#09090b] text-white border-2 border-[#09090b]",
    },
    UNLEARN: {
      computeUtil: "45% (OPTIMIZING)",
      computeCost: "$12,000 / run",
      vram: "48 GB",
      errorRate: "DISSOLVING NODES...",
      status: "GRADIENT ASCENT ACTIVE",
      statusColor: "bg-[#09090b] text-white border-2 border-[#09090b]",
    },
    AFTER: {
      computeUtil: "28%",
      computeCost: "$8,500 / mo (-94%)",
      vram: "24 GB (-74%)",
      errorRate: "0.0% VERIFIED",
      status: "STREAMLINED & EFFICIENT",
      statusColor: "bg-[#09090b] text-white border-2 border-[#09090b]",
    },
  }[mode];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI canvas resolution
    const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    const height = (canvas.height = 420);

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
          active: true,
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

      // Draw background architectural grid inside canvas
      ctx.strokeStyle = "rgba(9, 9, 11, 0.05)";
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
            ctx.strokeStyle = "rgba(9, 9, 11, 0.85)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
          } else if (mode === "UNLEARN") {
            // Pulsing dissolving animation
            const pulse = (Math.sin(timestamp * 6) + 1) / 2;
            ctx.strokeStyle = `rgba(9, 9, 11, ${pulse * 0.9})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
          }
        } else {
          ctx.strokeStyle = mode === "AFTER" ? "rgba(9, 9, 11, 0.3)" : "rgba(9, 9, 11, 0.18)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Animated Data Signal Particles
      connections.forEach((conn, index) => {
        if (mode === "AFTER" && conn.isTarget) return;

        const speed = conn.isTarget ? 0.025 : 0.015;
        const progress = (timestamp * speed + (index * 0.1)) % 1;
        const px = conn.from.x + (conn.to.x - conn.from.x) * progress;
        const py = conn.from.y + (conn.to.y - conn.from.y) * progress;

        ctx.beginPath();
        ctx.arc(px, py, conn.isTarget && mode === "BEFORE" ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = conn.isTarget ? "#09090b" : "#52525b";
        ctx.fill();
      });

      // Draw Nodes
      nodes.forEach((node, idx) => {
        if (mode === "AFTER" && node.isTarget) {
          // Render erased node outline in AFTER mode
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(9, 9, 11, 0.2)";
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
            ctx.fillStyle = "#09090b";
            ctx.strokeStyle = "#09090b";
            ctx.lineWidth = 2;
          } else if (mode === "UNLEARN") {
            const pulseRadius = node.radius + Math.sin(timestamp * 8 + node.pulseOffset) * 4;
            ctx.fillStyle = "#09090b";
            ctx.strokeStyle = "#09090b";
            ctx.lineWidth = 2;
            ctx.arc(node.x, node.y, Math.max(2, pulseRadius), 0, Math.PI * 2);
          }
        } else {
          ctx.fillStyle = mode === "AFTER" ? "#09090b" : "#ffffff";
          ctx.strokeStyle = "#09090b";
          ctx.lineWidth = 2;
        }

        ctx.fill();
        ctx.stroke();

        // Node halo effect on target nodes in UNLEARN mode
        if (node.isTarget && mode === "UNLEARN") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(9, 9, 11, 0.3)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Layer Titles at top of canvas
      const layerTitles = ["INPUT", "HIDDEN_1", "HIDDEN_2", "TARGET_NODE", "OUTPUT"];
      nodesPerLayer.forEach((_, lIndex) => {
        const layerX = (width / (layers + 1)) * (lIndex + 1);
        ctx.font = "bold 10px JetBrains Mono, monospace";
        ctx.fillStyle = "#71717a";
        ctx.textAlign = "center";
        ctx.fillText(layerTitles[lIndex], layerX, 22);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode]);

  return (
    <div className="brutalist-card p-6 md:p-8 bg-white relative overflow-hidden">
      
      {/* Mode Control Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#09090b] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717a]">
              [ NEURAL NETWORK DEEP MIND VISUALIZER ]
            </span>
          </div>
          <h3 className="font-sans text-xl md:text-2xl font-extrabold uppercase text-[#09090b]">
            Visualizing Model Activation & Node Erasure
          </h3>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setMode("BEFORE")}
            className={`px-3.5 py-2 border-2 border-[#09090b] font-extrabold uppercase transition-all ${
              mode === "BEFORE"
                ? "bg-[#09090b] text-white shadow-[3px_3px_0_0_#09090b]"
                : "bg-white text-[#09090b] hover:bg-[#f7f6f2]"
            }`}
          >
            1. Bloated (Before)
          </button>
          <button
            onClick={() => setMode("UNLEARN")}
            className={`px-3.5 py-2 border-2 border-[#09090b] font-extrabold uppercase transition-all ${
              mode === "UNLEARN"
                ? "bg-[#09090b] text-white shadow-[3px_3px_0_0_#09090b]"
                : "bg-white text-[#09090b] hover:bg-[#f7f6f2]"
            }`}
          >
            2. Node Erasure
          </button>
          <button
            onClick={() => setMode("AFTER")}
            className={`px-3.5 py-2 border-2 border-[#09090b] font-extrabold uppercase transition-all ${
              mode === "AFTER"
                ? "bg-[#09090b] text-white shadow-[3px_3px_0_0_#09090b]"
                : "bg-white text-[#09090b] hover:bg-[#f7f6f2]"
            }`}
          >
            3. Streamlined (After)
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative w-full h-[420px] bg-[#f7f6f2] border-2 border-[#09090b] shadow-[4px_4px_0_0_#09090b] mb-6">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Status Overlay Badge */}
        <div className="absolute top-4 right-4">
          <span className={`font-mono text-xs font-extrabold uppercase px-3 py-1.5 ${metrics.statusColor}`}>
            ● {metrics.status}
          </span>
        </div>

        {/* Dynamic Canvas Legend */}
        <div className="absolute bottom-4 left-4 font-mono text-[11px] font-bold bg-white border-2 border-[#09090b] p-2.5 shadow-[2px_2px_0_0_#09090b] space-y-1">
          <div className="flex items-center gap-2 text-[#09090b]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#09090b] border border-[#09090b]" />
            <span>Target Capability Nodes & Paths</span>
          </div>
          <div className="flex items-center gap-2 text-[#52525b]">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#09090b]" />
            <span>Preserved Retained Skill Nodes</span>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Dashboard Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="brutalist-card p-4 bg-[#f7f6f2]">
          <div className="text-[10px] font-bold uppercase text-[#71717a]">GPU COMPUTE OVERHEAD</div>
          <div className="text-xl font-extrabold text-[#09090b] mt-1">{metrics.computeUtil}</div>
        </div>

        <div className="brutalist-card p-4 bg-[#f7f6f2]">
          <div className="text-[10px] font-bold uppercase text-[#71717a]">COMPUTE COST / MONTH</div>
          <div className="text-xl font-extrabold text-[#09090b] mt-1">{metrics.computeCost}</div>
        </div>

        <div className="brutalist-card p-4 bg-[#f7f6f2]">
          <div className="text-[10px] font-bold uppercase text-[#71717a]">MEMORY FOOTPRINT (VRAM)</div>
          <div className="text-xl font-extrabold text-[#09090b] mt-1">{metrics.vram}</div>
        </div>

        <div className="brutalist-card p-4 bg-[#f7f6f2]">
          <div className="text-[10px] font-bold uppercase text-[#71717a]">RESIDUAL ERROR RATE</div>
          <div className="text-xl font-extrabold text-[#09090b] mt-1">{metrics.errorRate}</div>
        </div>
      </div>

    </div>
  );
}
