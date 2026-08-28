"use client";

import { useEffect, useRef, useState } from "react";

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
      computeUtil: "98% (MAX)",
      computeCost: "$140K/MO",
      vram: "92 GB",
      errorRate: "38.4% ERR",
      status: "BLOATED MODEL",
    },
    UNLEARN: {
      computeUtil: "45% (OPT)",
      computeCost: "$12K/RUN",
      vram: "48 GB",
      errorRate: "ERASING...",
      status: "ASCENT ACTIVE",
    },
    AFTER: {
      computeUtil: "28% (MIN)",
      computeCost: "$8.5K/MO",
      vram: "24 GB",
      errorRate: "0.0% VERIFIED",
      status: "RETRAINED",
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
          radius: isTargetNode ? 10 : 8,
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

      // Draw Halftone/Dot Grid Background inside canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = "#e5e7eb"; // light gray dots
      const gridSize = 16;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Connections
      connections.forEach((conn) => {
        if (mode === "AFTER" && conn.isTarget) return; // Erased connections

        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);

        if (conn.isTarget) {
          if (mode === "BEFORE") {
            ctx.strokeStyle = "#000000"; // Thick black connection
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Inner jagged white line for "error" effect
            ctx.beginPath();
            ctx.moveTo(conn.from.x, conn.from.y);
            ctx.lineTo(conn.to.x, conn.to.y);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (mode === "UNLEARN") {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            // Pulsing dashed line
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -timestamp * 20;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          ctx.strokeStyle = mode === "AFTER" ? "#000000" : "#9ca3af";
          ctx.lineWidth = mode === "AFTER" ? 2 : 1;
          ctx.stroke();
        }
      });

      // Animated Data Signal Particles (Comic style squares)
      connections.forEach((conn, index) => {
        if (mode === "AFTER" && conn.isTarget) return;

        const speed = conn.isTarget ? 0.025 : 0.015;
        const progress = (timestamp * speed + (index * 0.1)) % 1;
        const px = conn.from.x + (conn.to.x - conn.from.x) * progress;
        const py = conn.from.y + (conn.to.y - conn.from.y) * progress;

        ctx.fillStyle = conn.isTarget && mode === "BEFORE" ? "#000000" : "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        
        ctx.save();
        ctx.translate(px, py);
        if (conn.isTarget && mode === "BEFORE") {
          // Large aggressive data packet
          ctx.fillRect(-4, -4, 8, 8);
        } else {
          // Small regular packet
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        if (mode === "AFTER" && node.isTarget) {
          // Render erased node outline (X mark or dashed outline)
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#9ca3af";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw "X"
          ctx.beginPath();
          ctx.moveTo(node.x - 4, node.y - 4);
          ctx.lineTo(node.x + 4, node.y + 4);
          ctx.moveTo(node.x + 4, node.y - 4);
          ctx.lineTo(node.x - 4, node.y + 4);
          ctx.strokeStyle = "#9ca3af";
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isTarget) {
          if (mode === "BEFORE") {
            ctx.fillStyle = "#000000";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            // Draw offset shadow for node
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.arc(node.x + 4, node.y + 4, node.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (mode === "UNLEARN") {
            const pulse = Math.abs(Math.sin(timestamp * 4 + node.pulseOffset));
            ctx.fillStyle = pulse > 0.5 ? "#000000" : "#ffffff";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
          }
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
        }

        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        if (mode === "UNLEARN" && node.isTarget) {
          // Erasing radiating lines
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8 + Math.sin(timestamp * 10) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Layer Titles at top of canvas
      const layerTitles = ["INPUT", "HIDDEN_1", "HIDDEN_2", "TARGETS", "OUTPUT"];
      nodesPerLayer.forEach((_, lIndex) => {
        const layerX = (width / (layers + 1)) * (lIndex + 1);
        ctx.font = "800 12px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        // White background for text legibility
        const textWidth = ctx.measureText(layerTitles[lIndex]).width;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(layerX - textWidth/2 - 4, 12, textWidth + 8, 16);
        ctx.fillStyle = "#000000";
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
    <div className="comic-card p-6 md:p-8 space-y-6 font-sans">
      
      {/* Playable Mode Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-5">
        <div>
          <div className="comic-badge mb-2">INTERACTIVE VISUALIZER</div>
          <h3 className="text-3xl font-black text-black tracking-tighter uppercase">
            NEURAL NETWORK DEEP MIND
          </h3>
        </div>

        {/* Interactive Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("BEFORE")}
            className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all ${
              mode === "BEFORE"
                ? "bg-black text-white shadow-[4px_4px_0_0_#d1d5db]"
                : "bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0_0_#000]"
            }`}
          >
            1. BLOATED
          </button>
          <button
            onClick={() => setMode("UNLEARN")}
            className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all ${
              mode === "UNLEARN"
                ? "bg-black text-white shadow-[4px_4px_0_0_#d1d5db]"
                : "bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0_0_#000]"
            }`}
          >
            2. ERASING
          </button>
          <button
            onClick={() => setMode("AFTER")}
            className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all ${
              mode === "AFTER"
                ? "bg-black text-white shadow-[4px_4px_0_0_#d1d5db]"
                : "bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0_0_#000]"
            }`}
          >
            3. SHRUNK
          </button>
        </div>
      </div>

      {/* HTML5 Canvas Container */}
      <div className="relative w-full h-[440px] bg-white border-4 border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Status Overlay */}
        <div className="absolute top-4 right-4">
          <span className="comic-badge bg-black text-white border-white">
            [{metrics.status}]
          </span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 font-mono text-[10px] bg-white text-black p-3 border-2 border-black space-y-2 shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-2 font-bold uppercase">
            <span className="w-3 h-3 bg-black border-2 border-black" />
            <span>UNWANTED TARGET NODE</span>
          </div>
          <div className="flex items-center gap-2 font-bold uppercase">
            <span className="w-3 h-3 bg-white border-2 border-black" />
            <span>PRESERVED SKILL NODE</span>
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs uppercase font-bold text-center">
        <div className="p-4 border-2 border-black bg-gray-100 shadow-[4px_4px_0_0_#000]">
          <div className="text-[10px] text-gray-500 mb-1">GPU COMPUTE</div>
          <div className="text-lg text-black">{metrics.computeUtil}</div>
        </div>

        <div className="p-4 border-2 border-black bg-gray-100 shadow-[4px_4px_0_0_#000]">
          <div className="text-[10px] text-gray-500 mb-1">COST / MONTH</div>
          <div className="text-lg text-black">{metrics.computeCost}</div>
        </div>

        <div className="p-4 border-2 border-black bg-gray-100 shadow-[4px_4px_0_0_#000]">
          <div className="text-[10px] text-gray-500 mb-1">MEMORY (VRAM)</div>
          <div className="text-lg text-black">{metrics.vram}</div>
        </div>

        <div className="p-4 border-2 border-black bg-gray-100 shadow-[4px_4px_0_0_#000]">
          <div className="text-[10px] text-gray-500 mb-1">RESIDUAL ERROR</div>
          <div className="text-lg text-black">{metrics.errorRate}</div>
        </div>
      </div>

    </div>
  );
}
