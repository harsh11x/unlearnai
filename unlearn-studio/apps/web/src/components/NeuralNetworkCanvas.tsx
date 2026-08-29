"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  layer: number;
  index: number;
  alive: boolean;
  deleting: boolean;
  deleteProgress: number;
  label: string;
}

interface Connection {
  from: number;
  to: number;
  alive: boolean;
}

interface Layer {
  name: string;
  nodeCount: number;
}

const LAYERS: Layer[] = [
  { name: "Input", nodeCount: 6 },
  { name: "Hidden 1", nodeCount: 8 },
  { name: "Hidden 2", nodeCount: 10 },
  { name: "Hidden 3", nodeCount: 8 },
  { name: "Output", nodeCount: 3 },
];

const UNNECESSARY_LABELS = [
  "Noise",
  "Bias",
  "Redundant",
  "Stale",
  "Overfit",
  "Unused",
  "Overlap",
  "Weak",
  "Spurious",
  "Deprecated",
  "Artifact",
  "Drift",
  "Marginal",
  "Stale",
  "Noise",
  "Redundant",
  "Overfit",
  "Unused",
  "Bias",
  "Weak",
  "Overlap",
  "Stale",
  "Noise",
  "Redundant",
  "Artifact",
  "Overfit",
  "Drift",
  "Unused",
  "Marginal",
  "Spurious",
  "Deprecated",
  "Weak",
  "Noise",
  "Redundant",
  "Overfit",
  "Unused",
];

export default function NeuralNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const [isShrunk, setIsShrunk] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const buildNetwork = useCallback((width: number, height: number, shrink: boolean) => {
    const padding = 60;
    const layerSpacing = (width - padding * 2) / (LAYERS.length - 1);
    const nodes: Node[] = [];
    const connections: Connection[] = [];

    let labelIndex = 0;

    LAYERS.forEach((layer, layerIdx) => {
      const x = padding + layerIdx * layerSpacing;
      const count = shrink ? Math.max(2, Math.floor(layer.nodeCount * 0.45)) : layer.nodeCount;
      const nodeSpacing = (height - padding * 2) / (count + 1);

      for (let i = 0; i < count; i++) {
        const y = padding + nodeSpacing * (i + 1);
        const isNecessary = shrink ? Math.random() > 0.3 : Math.random() > 0.25;
        nodes.push({
          x,
          y,
          layer: layerIdx,
          index: i,
          alive: isNecessary || !shrink,
          deleting: false,
          deleteProgress: 0,
          label: shrink && !isNecessary
            ? UNNECESSARY_LABELS[labelIndex++ % UNNECESSARY_LABELS.length]
            : `${layer.name} ${i + 1}`,
        });
      }
    });

    // Build connections between adjacent layers
    let nodeIdx = 0;
    const layerNodeCounts: number[] = [];
    LAYERS.forEach((layer) => {
      const count = shrink ? Math.max(2, Math.floor(layer.nodeCount * 0.45)) : layer.nodeCount;
      layerNodeCounts.push(count);
    });

    for (let l = 0; l < LAYERS.length - 1; l++) {
      const startA = layerNodeCounts.slice(0, l).reduce((a, b) => a + b, 0);
      const countA = layerNodeCounts[l];
      const startB = layerNodeCounts.slice(0, l + 1).reduce((a, b) => a + b, 0);
      const countB = layerNodeCounts[l + 1];

      for (let i = 0; i < countA; i++) {
        for (let j = 0; j < countB; j++) {
          const fromNode = nodes[startA + i];
          const toNode = nodes[startB + j];
          connections.push({
            from: startA + i,
            to: startB + j,
            alive: fromNode.alive && toNode.alive,
          });
        }
      }
    }

    return { nodes, connections };
  }, []);

  const drawNetwork = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const connections = connectionsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Draw connections
      connections.forEach((conn) => {
        const from = nodes[conn.from];
        const to = nodes[conn.to];
        if (!from || !to) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = conn.alive ? "rgba(163, 163, 163, 0.25)" : "rgba(239, 68, 68, 0.08)";
        ctx.lineWidth = conn.alive ? 1 : 0.5;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node, idx) => {
        if (!node.alive && node.deleteProgress >= 1) return;

        const dx = mx - node.x;
        const dy = my - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isHovered = dist < 20;
        const pulse = Math.sin(time * 0.002 + idx * 0.5) * 0.15 + 1;

        let radius = isHovered ? 7 : 5;
        let alpha = 1;

        if (!node.alive) {
          radius = Math.max(0, 5 * (1 - node.deleteProgress));
          alpha = 1 - node.deleteProgress;
        } else {
          radius *= pulse;
        }

        // Glow for hovered
        if (isHovered && node.alive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(23, 23, 23, 0.06)";
          ctx.fill();
        }

        // Connection highlight for hovered alive nodes
        if (isHovered && node.alive) {
          connections.forEach((conn) => {
            if (conn.from === idx || conn.to === idx) {
              const other = nodes[conn.from === idx ? conn.to : conn.from];
              if (other && other.alive) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle = "rgba(23, 23, 23, 0.35)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            }
          });
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        if (!node.alive) {
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.7})`;
          ctx.fill();
          // X mark for deleted
          if (node.deleteProgress < 1) {
            const s = radius * 0.5;
            ctx.beginPath();
            ctx.moveTo(node.x - s, node.y - s);
            ctx.lineTo(node.x + s, node.y + s);
            ctx.moveTo(node.x + s, node.y - s);
            ctx.lineTo(node.x - s, node.y + s);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = isHovered
            ? "rgba(23, 23, 23, 1)"
            : `rgba(23, 23, 23, ${0.7 + (isHovered ? 0.3 : 0)})`;
          ctx.fill();
        }

        // Node border
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(23, 23, 23, ${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Update hover
        if (isHovered && node.alive) {
          setHoveredNode(node);
        }
      });

      // Draw layer labels
      let offset = 0;
      LAYERS.forEach((layer, idx) => {
        const x = 60 + idx * ((width - 120) / (LAYERS.length - 1));
        ctx.fillStyle = "rgba(115, 115, 115, 0.7)";
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText(layer.name.toUpperCase(), x, height - 16);
        offset += layer.nodeCount;
      });
    },
    []
  );

  // Initialize & animate
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);

      const { nodes, connections } = buildNetwork(rect.width, rect.height, isShrunk);
      nodesRef.current = nodes;
      connectionsRef.current = connections;
    };

    resize();

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouseRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
    };

    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
      setHoveredNode(null);
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("touchmove", handleTouch, { passive: true });
    canvas.addEventListener("touchend", handleLeave);
    canvas.addEventListener("mouseleave", handleLeave);

    const animate = (time: number) => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      drawNetwork(ctx, rect.width, rect.height, time);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("touchend", handleLeave);
      canvas.removeEventListener("mouseleave", handleLeave);
      ro.disconnect();
    };
  }, [isShrunk, buildNetwork, drawNetwork]);

  const handleToggle = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();

    // Rebuild for target state
    const targetShrink = !isShrunk;
    const { nodes, connections } = buildNetwork(rect.width, rect.height, targetShrink);
    nodesRef.current = nodes;
    connectionsRef.current = connections;

    setIsShrunk(targetShrink);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div className="relative">
      <div className="canvas-container h-[300px] sm:h-[420px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-1.5 bg-accent text-accent-inv text-xs font-mono"
            style={{
              left: hoveredNode.x + 16,
              top: hoveredNode.y - 12,
              transform: "translateY(-100%)",
            }}
          >
            {hoveredNode.label}
          </div>
        )}

        {/* Empty state after full erase */}
        {!isShrunk && nodesRef.current.filter((n) => n.alive).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-text-subtle text-sm font-mono">All nodes erased. Toggle to rebuild.</p>
          </div>
        )}
      </div>

      {/* Toggle controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            <span className="text-xs text-text-subtle font-mono">Active nodes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block opacity-70" />
            <span className="text-xs text-text-subtle font-mono">Erased nodes</span>
          </div>
        </div>

        <button onClick={handleToggle} className="btn-outline text-xs py-2 px-4" disabled={isAnimating}>
          {isShrunk ? "→ Show Original Model" : "→ Show After Unlearning"}
        </button>
      </div>
    </div>
  );
}
