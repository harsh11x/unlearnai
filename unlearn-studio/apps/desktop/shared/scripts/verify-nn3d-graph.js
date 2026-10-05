#!/usr/bin/env node
/**
 * verify-nn3d-graph.js
 *
 * Headless verification of the NN3D graph builder and layout maths.
 * nn3d.js is written for the browser (it needs `window`), so we stub a
 * minimal global and pull the pure functions out. No WebGL is touched —
 * `create()` is only invoked by the real renderer.
 *
 * Usage: node scripts/verify-nn3d-graph.js [model-path] [python]
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// ── Load nn3d.js with a stubbed window ──
const nn3dSrc = fs.readFileSync(path.join(__dirname, "..", "renderer", "nn3d.js"), "utf8");
const fakeWindow = {};
new Function("window", nn3dSrc)(fakeWindow);
const NN3D = fakeWindow.NN3D;

if (!NN3D) {
  console.error("nn3d.js did not export NN3D");
  process.exit(1);
}

const failures = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

console.log(`\nNN3D v${NN3D.version} — graph builder checks\n`);

// ── 1. Block-index extraction across naming schemes ──
console.log("block index extraction:");
const blockCases = [
  ["blk.12.attn_q.weight", 12],
  ["model.layers.7.mlp.down_proj.weight", 7],
  ["transformer.h.3.attn.c_attn.weight", 3],
  ["encoder.layer.11.attention.output.dense.weight", 11],
  ["blocks.5.norm1.weight", 5],
];
for (const [name, expected] of blockCases) {
  const got = NN3D.extractBlockIndex(name);
  check(`${name} → ${expected}`, got === expected, `got ${got}`);
}
check("unindexed name returns null", NN3D.extractBlockIndex("embedding.weight") === null);

// ── 2. Colour ramp monotonic + in range ──
console.log("\ncolour ramp:");
let rampOk = true;
for (let i = 0; i <= 20; i++) {
  const c = NN3D.depthColor(i / 20);
  if (!Array.isArray(c) || c.length !== 3) rampOk = false;
  if (c.some((v) => !isFinite(v) || v < 0 || v > 1.001)) rampOk = false;
}
check("depthColor stays finite and in [0,1] across the ramp", rampOk);
check("dtypeColor marks quantized tensors",
  NN3D.dtypeColor("quantized(q4_k)")[0] > 0.9 && NN3D.dtypeColor("quantized(q4_k)")[2] < 0.5);
check("dtypeColor distinguishes float16",
  JSON.stringify(NN3D.dtypeColor("float16")) !== JSON.stringify(NN3D.dtypeColor("float32")));

// ── 3. Real transformer graph: 219 layers / 291 tensors (qwen2 GGUF shape) ──
console.log("\nsynthetic 24-block transformer:");
const layers = [];
const tensors = [];
for (let b = 0; b < 24; b++) {
  const names = ["attn_q", "attn_k", "attn_v", "attn_output", "ffn_gate", "ffn_down", "ffn_up"];
  const layerTensors = [];
  for (const n of names) {
    const tname = `blk.${b}.${n}.weight`;
    layerTensors.push(tname);
    tensors.push({
      name: tname,
      shape: [896, 4864],
      dtype: "quantized(q4_k)",
      param_count: 896 * 4864,
      byte_count: Math.round(896 * 4864 * 0.58),
    });
  }
  layers.push({
    name: `blk.${b}`,
    tensors: layerTensors,
    total_params: 896 * 4864 * 7,
    total_bytes: 896 * 4864 * 7,
    dtypes: ["quantized(q4_k)"],
  });
}
tensors.push({ name: "token_embd.weight", shape: [896, 151936], dtype: "quantized(q6_k)", param_count: 896 * 151936, byte_count: 896 * 151936 * 0.82 });
layers.push({ name: "token_embd", tensors: ["token_embd.weight"], total_params: 896 * 151936, total_bytes: 896 * 151936 * 0.82, dtypes: ["quantized(q6_k)"] });

const g = NN3D.buildGraph({ layers, tensors });
console.log(`  nodes=${g.nodes.length} edges=${g.edges.length} stages=${g.stageCount}`);
check("node per tensor", g.nodes.length === tensors.length, `${g.nodes.length}/${tensors.length}`);
// 24 numbered blocks + token_embd (which has no block index) = 25 stages.
// The point of the assertion: 169 tensors must NOT produce 169 stages.
check("stages collapse to block count, not tensor count", g.stageCount === 25, `got ${g.stageCount}`);
check("stage count is far below tensor count", g.stageCount < g.nodes.length / 5,
  `${g.stageCount} stages vs ${g.nodes.length} nodes`);
check("edges generated", g.edges.length > 0, `${g.edges.length}`);
check("edges stay under the cap", g.edges.length <= 5200);
check("hasStructure true", g.hasStructure === true);
check("every node has a stage within range",
  g.nodes.every((n) => n.stage >= 0 && n.stage < g.stageCount));
check("every edge references valid nodes",
  g.edges.every((e) => g.nodes[e.a] && g.nodes[e.b]));
check("no self-edges", g.edges.every((e) => e.a !== e.b));
check("node depthT spans 0..1",
  Math.min(...g.nodes.map((n) => n.depthT)) === 0 &&
  Math.max(...g.nodes.map((n) => n.depthT)) === 1);

// ── 4. Degenerate inputs must not throw ──
console.log("\ndegenerate inputs:");
const empty = NN3D.buildGraph({ layers: [], tensors: [] });
check("empty model → empty graph, no crash", empty.nodes.length === 0 && empty.hasStructure === false);

const layerOnly = NN3D.buildGraph({
  layers: [{ name: "fc1", tensors: [], total_params: 100, dtypes: ["float32"] }],
  tensors: [],
});
check("layers-only model falls back to layer nodes", layerOnly.nodes.length === 1);

const flat = NN3D.buildGraph({
  layers: Array.from({ length: 40 }, (_, i) => ({
    name: `linear_${i}`, tensors: [`w${i}`], total_params: 1000 + i, dtypes: ["float32"],
  })),
  tensors: Array.from({ length: 40 }, (_, i) => ({
    name: `w${i}`, shape: [10, 10], dtype: "float32", param_count: 1000 + i, byte_count: 4000,
  })),
});
check("unindexed flat model still gets ≥3 stages", flat.stageCount >= 3, `got ${flat.stageCount}`);
check("flat model nodes all staged", flat.nodes.every((n) => n.stage >= 0 && n.stage < flat.stageCount));

// ── 5. Large model performance + edge cap ──
console.log("\nlarge model (1000 tensors):");
const bigTensors = Array.from({ length: 1000 }, (_, i) => ({
  name: `blk.${Math.floor(i / 10)}.t${i}.weight`, shape: [512, 512],
  dtype: "quantized(q4_k)", param_count: 262144, byte_count: 152000,
}));
const bigLayers = Array.from({ length: 100 }, (_, b) => ({
  name: `blk.${b}`,
  tensors: bigTensors.filter((t) => t.name.startsWith(`blk.${b}.`)).map((t) => t.name),
  total_params: 262144 * 10, total_bytes: 1520000, dtypes: ["quantized(q4_k)"],
}));
const t0 = process.hrtime.bigint();
const big = NN3D.buildGraph({ layers: bigLayers, tensors: bigTensors });
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`  nodes=${big.nodes.length} edges=${big.edges.length} in ${ms.toFixed(1)}ms`);
check("1000-tensor graph builds under 250ms", ms < 250, `${ms.toFixed(1)}ms`);
check("edge cap enforced on large graphs", big.edges.length <= 5200, `${big.edges.length}`);

// ── 6. Optional: build from the real model via the Python backend ──
const modelPath = process.argv[2];
if (modelPath && fs.existsSync(modelPath)) {
  const pythonCmd = process.argv[3] || "/opt/homebrew/bin/python3";
  const scriptPath = path.join(__dirname, "..", "..", "backend", "server.py");
  console.log(`\nreal model: ${path.basename(modelPath)}`);

  const proc = spawn(pythonCmd, [scriptPath], { cwd: path.dirname(scriptPath), stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  const pending = new Map();
  let nextId = 1;
  let readyResolve;
  const readyP = new Promise((r) => { readyResolve = r; });

  proc.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.method === "ready" || msg.type === "ready") { readyResolve(msg); continue; }
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result !== undefined ? msg.result : msg);
        pending.delete(msg.id);
      }
    }
  });

  const rpc = (method, params = {}) => new Promise((res) => {
    const id = nextId++;
    pending.set(id, res);
    proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  });

  readyP.then(async () => {
    const r = await rpc("model_load", { path: modelPath });
    const rg = NN3D.buildGraph({ layers: r.layers || [], tensors: r.tensors || [], summary: r.summary || {} });
    console.log(`  → nodes=${rg.nodes.length} edges=${rg.edges.length} stages=${rg.stageCount}`);
    check("real model produces a renderable 3D graph", rg.nodes.length > 0, `${rg.nodes.length} nodes`);
    check("real model stages collapse sensibly (≤64)",
      rg.stageCount > 0 && rg.stageCount <= 64, `${rg.stageCount} stages`);
    check("real model node stages in range",
      rg.nodes.every((n) => n.stage >= 0 && n.stage < rg.stageCount));

    const sample = rg.nodes[0];
    console.log(`  sample: ${sample.name} [${sample.shape.join("x")}] ${sample.dtype}`);
    check("real nodes carry shape + dtype for the inspector",
      Array.isArray(sample.shape) && Boolean(sample.dtype));

    proc.kill();
    console.log(failures.length ? `\n${failures.length} check(s) FAILED\n` : "\nAll checks passed\n");
    process.exit(failures.length ? 1 : 0);
  }).catch((e) => {
    console.error(`ERROR: ${e.message}`);
    proc.kill();
    process.exit(1);
  });
} else {
  console.log(failures.length ? `\n${failures.length} check(s) FAILED\n` : "\nAll checks passed\n");
  process.exit(failures.length ? 1 : 0);
}
