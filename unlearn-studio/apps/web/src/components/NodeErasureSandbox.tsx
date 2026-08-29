"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SandboxNode {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  type: "input" | "hidden" | "output";
  label: string;
  deleteAnim: number;
  hover: boolean;
}

interface SandboxEdge {
  from: number;
  to: number;
  alive: boolean;
  fadeAnim: number;
}

export default function NodeErasureSandbox() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const [nodes, setNodes] = useState<SandboxNode[]>([]);
  const [edges, setEdges] = useState<SandboxEdge[]>([]);
  const [stats, setStats] = useState({ total: 0, alive: 0, deleted: 0, computeSaved: 0 });
  const [initialized, setInitialized] = useState(false);

  const buildSandbox = useCallback(() => {
    const w = 800;
    const h = 360;
    const newNodes: SandboxNode[] = [];
    const newEdges: SandboxEdge[] = [];

    const layers = [
      { type: "input" as const, count: 5, labels: ["Image", "Text", "Audio", "Sensor", "Log"] },
      { type: "hidden" as const, count: 7, labels: ["Conv-A", "Conv-B", "Pool-1", "Dense-A", "Dense-B", "BN-1", "Relu-1"] },
      { type: "hidden" as const, count: 8, labels: ["Attn-Q", "Attn-K", "Attn-V", "FFN-1", "FFN-2", "Norm-1", "Drop-1", "Softmax"] },
      { type: "hidden" as const, count: 6, labels: ["Merge-A", "Merge-B", "Res-1", "Res-2", "Proj-1", "Proj-2"] },
      { type: "output" as const, count: 3, labels: ["Class-A", "Class-B", "Class-C"] },
    ];

    const layerPositions = [80, 230, 400, 570, 720];

    let id = 0;
    const layerNodeIds: number[][] = [];

    layers.forEach((layer, li) => {
      const x = layerPositions[li];
      const ids: number[] = [];
      const spacing = (h - 80) / (layer.count + 1);

      for (let i = 0; i < layer.count; i++) {
        const y = 40 + spacing * (i + 1);
        newNodes.push({
          id,
          x,
          y,
          alive: true,
          type: layer.type,
          label: layer.labels[i],
          deleteAnim: 0,
          hover: false,
        });
        ids.push(id);
        id++;
      }
      layerNodeIds.push(ids);
    });

    // Connect adjacent layers
    for (let l = 0; l < layerNodeIds.length - 1; l++) {
      const fromIds = layerNodeIds[l];
      const toIds = layerNodeIds[l + 1];
      fromIds.forEach((f) => {
        toIds.forEach((t) => {
          if (Math.random() > 0.3) {
            newEdges.push({ from: f, to: t, alive: true, fadeAnim: 1 });
          }
        });
      });
    }

    return { nodes: newNodes, edges: newEdges };
  }, []);

  useEffect(() => {
    if (initialized) return;
    const { nodes: n, edges: e } = buildSandbox();
    setNodes(n);
    setEdges(e);
    setInitialized(true);
  }, [initialized, buildSandbox]);

  // Update stats
  useEffect(() => {
    const alive = nodes.filter((n) => n.alive).length;
    const total = nodes.length;
    const deleted = total - alive;
    setStats({ total, alive, deleted, computeSaved: total > 0 ? Math.round((deleted / total) * 100) : 0 });
  }, [nodes]);

  const handleNodeClick = useCallback(
    (nodeId: number) => {
      setNodes((prev) => {
        const node = prev.find((n) => n.id === nodeId);
        if (!node || !node.alive) return prev;
        // Don't allow deleting input or output nodes entirely — only hidden
        if (node.type !== "hidden") return prev;
        return prev.map((n) => (n.id === nodeId ? { ...n, alive: false, deleteAnim: 0 } : n));
      });

      // Fade connected edges
      setEdges((prev) =>
        prev.map((e) =>
          e.from === nodeId || e.to === nodeId ? { ...e, alive: false } : e
        )
      );
    },
    []
  );

  const resetSandbox = useCallback(() => {
    const { nodes: n, edges: e } = buildSandbox();
    setNodes(n);
    setEdges(e);
  }, [buildSandbox]);

  const eraseAllRedundant = useCallback(() => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type === "hidden" && Math.random() > 0.45) {
          return { ...n, alive: false };
        }
        return n;
      })
    );
    setTimeout(() => {
      setEdges((prev) =>
        prev.map((e) => {
          const fromNode = nodes.find((n) => n.id === e.from);
          const toNode = nodes.find((n) => n.id === e.to);
          if ((fromNode && !fromNode.alive) || (toNode && !toNode.alive)) {
            return { ...e, alive: false };
          }
          return e;
        })
      );
    }, 100);
  }, [nodes]);

  const aliveNodes = nodes.filter((n) => n.alive);
  const aliveEdges = edges.filter((e) => {
    const f = aliveNodes.find((n) => n.id === e.from);
    const t = aliveNodes.find((n) => n.id === e.to);
    return f && t;
  });

  return (
    <div ref={containerRef}>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4 sm:mb-6">
        <div>
          <span className="mono text-[10px] sm:text-xs text-text-subtle">NODES</span>
          <p className="stat-number text-lg sm:text-xl">{stats.alive} <span className="text-text-subtle text-sm sm:text-base">/ {stats.total}</span></p>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border hidden sm:block" />
        <div className="hidden sm:block">
          <span className="mono text-xs text-text-subtle">DELETED</span>
          <p className="stat-number text-xl text-[#ef4444]">{stats.deleted}</p>
        </div>
        <div className="w-px h-8 sm:h-10 bg-border hidden sm:block" />
        <div>
          <span className="mono text-[10px] sm:text-xs text-text-subtle">COMPUTE SAVED</span>
          <p className="stat-number text-lg sm:text-xl">{stats.computeSaved}%</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={eraseAllRedundant} className="btn-outline text-xs py-2 px-3">
            Auto-Erase
          </button>
          <button onClick={resetSandbox} className="btn-outline text-xs py-2 px-3">
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-container scroll-x-mobile">
        <svg
          ref={svgRef}
          viewBox="0 0 800 360"
          className="w-full min-w-[500px]"
          style={{ height: 360 }}
        >
          {/* Edges */}
          {aliveEdges.map((edge, i) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`e-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#d4d4d4"
                strokeWidth="0.75"
                opacity="0.5"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={node.type === "hidden" && node.alive ? "cursor-pointer" : ""}
              onMouseEnter={() =>
                setNodes((prev) =>
                  prev.map((n) => (n.id === node.id ? { ...n, hover: true } : n))
                )
              }
              onMouseLeave={() =>
                setNodes((prev) =>
                  prev.map((n) => (n.id === node.id ? { ...n, hover: false } : n))
                )
              }
            >
              {/* Hover ring */}
              {node.hover && node.alive && node.type === "hidden" && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill="none"
                  stroke="#a3a3a3"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.hover && node.alive ? "8" : "6"}
                fill={
                  !node.alive
                    ? "rgba(239, 68, 68, 0.15)"
                    : node.type === "input"
                    ? "#171717"
                    : node.type === "output"
                    ? "#171717"
                    : "#171717"
                }
                stroke={
                  !node.alive
                    ? "#ef4444"
                    : node.hover && node.type === "hidden"
                    ? "#525252"
                    : "#a3a3a3"
                }
                strokeWidth={node.alive ? "1.5" : "1"}
                opacity={node.alive ? 1 : 0.5}
                style={{
                  transition: "all 0.2s ease",
                }}
              />

              {/* Delete X */}
              {!node.alive && (
                <>
                  <line
                    x1={node.x - 3}
                    y1={node.y - 3}
                    x2={node.x + 3}
                    y2={node.y + 3}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={node.x + 3}
                    y1={node.y - 3}
                    x2={node.x - 3}
                    y2={node.y + 3}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                </>
              )}

              {/* Label */}
              {node.hover && (
                <text
                  x={node.x}
                  y={node.y - 14}
                  textAnchor="middle"
                  fill="#0a0a0a"
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="500"
                >
                  {node.label}
                </text>
              )}

              {/* Click hint */}
              {node.hover && node.alive && node.type === "hidden" && (
                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  fill="#737373"
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  click to erase
                </text>
              )}
            </g>
          ))}

          {/* Layer labels */}
          <text x="80" y="345" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="'JetBrains Mono', monospace">
            INPUT
          </text>
          <text x="230" y="345" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="'JetBrains Mono', monospace">
            HIDDEN 1
          </text>
          <text x="400" y="345" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="'JetBrains Mono', monospace">
            HIDDEN 2
          </text>
          <text x="570" y="345" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="'JetBrains Mono', monospace">
            HIDDEN 3
          </text>
          <text x="720" y="345" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="'JetBrains Mono', monospace">
            OUTPUT
          </text>
        </svg>
      </div>

      <p className="body-sm mt-3 text-center px-2">
        Click any hidden-layer node to erase it. Use Auto-Erase to bulk-remove redundant nodes.
      </p>
    </div>
  );
}
