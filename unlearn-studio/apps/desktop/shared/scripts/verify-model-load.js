#!/usr/bin/env node
/**
 * verify-model-load.js
 *
 * End-to-end check of the renderer's model-load contract, without a GUI.
 *
 * Spawns the real Python backend over stdio JSON-RPC and replays the exact RPC
 * sequence `loadModel()` in renderer/app.js performs, then applies the same
 * fatality classification the renderer now uses. This is what proves a GGUF
 * model actually reaches the canvas instead of dying on its informational
 * `error` string.
 *
 * Usage:  node scripts/verify-model-load.js <model-path> [python]
 *   e.g.  node scripts/verify-model-load.js ~/Downloads/remap-studio-models/qwen2.5-coder-0.5b-q4_k_m.gguf
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const modelPath = process.argv[2];
const pythonCmd = process.argv[3] || process.env.PYTHON || "/opt/homebrew/bin/python3";

if (!modelPath) {
  console.error("usage: node scripts/verify-model-load.js <model-path> [python]");
  process.exit(2);
}
if (!fs.existsSync(modelPath)) {
  console.error(`model not found: ${modelPath}`);
  process.exit(2);
}

const scriptPath = path.join(__dirname, "..", "..", "backend", "server.py");

// ── Minimal client mirroring shared/main.js sendToBackend ──
let nextId = 1;
const pending = new Map();
let ready = false;
const readyWaiters = [];

const proc = spawn(pythonCmd, [scriptPath], {
  cwd: path.dirname(scriptPath),
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONDONTWRITEBYTECODE: "1" },
});

let stdoutBuf = "";
proc.stdout.on("data", (chunk) => {
  stdoutBuf += chunk.toString();
  let idx;
  while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
    const line = stdoutBuf.slice(0, idx).trim();
    stdoutBuf = stdoutBuf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === "ready" || msg.type === "ready") {
      ready = true;
      readyWaiters.splice(0).forEach((r) => r(msg));
      continue;
    }
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result !== undefined ? msg.result : msg);
    }
  }
});
proc.stderr.on("data", (d) => process.stderr.write(`[backend:stderr] ${d}`));

function rpc(method, params = {}, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout after ${timeoutMs}ms: ${method}`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (r) => { clearTimeout(timer); resolve(r); },
    });
    proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  });
}

function waitReady(ms = 20000) {
  if (ready) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("backend did not become ready")), ms);
    readyWaiters.push((msg) => { clearTimeout(t); resolve(msg); });
  });
}

// ── The renderer's fatality classification, kept in sync by hand ──
function classifyLoadResponse(result) {
  const hasStructure = Boolean(
    result.format || result.config || result.tensors ||
    result.layer_groups || result.layers || result.summary,
  );
  const isFatal =
    result.file_not_found === true ||
    result.parse_error === true ||
    result.missing_dependencies === true ||
    !hasStructure;
  return { hasStructure, isFatal };
}

function formatBytes(n) {
  if (!n && n !== 0) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

(async () => {
  const failures = [];
  const check = (name, cond, detail = "") => {
    const ok = Boolean(cond);
    console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
    if (!ok) failures.push(name);
  };

  try {
    const readyMsg = await waitReady().catch(() => null);
    console.log(`\nbackend ready: ${ready ? "yes" : "NO"}${readyMsg?.degraded ? " (degraded)" : ""}`);
    if (readyMsg?.import_errors?.length) {
      console.log(`  import errors: ${readyMsg.import_errors.map((e) => e.module || e).join(", ")}`);
    }

    // ── Replay loadModel() ──
    console.log(`\nmodel_load: ${modelPath}`);
    const t0 = Date.now();
    const result = await rpc("model_load", { path: modelPath });
    const elapsed = Date.now() - t0;

    const { hasStructure, isFatal } = classifyLoadResponse(result);
    console.log(`  format=${result.format} trainable=${result.trainable} in ${elapsed}ms`);
    if (result.error) console.log(`  advisory error field: ${String(result.error).slice(0, 90)}…`);

    check("response has visualizable structure", hasStructure);
    check("GGUF informational error is NOT fatal", isFatal === false,
      `(isFatal=${isFatal}, format=${result.format})`);

    // ── Seed state exactly like the renderer does ──
    let layers = Array.isArray(result.layers) ? result.layers : [];
    let tensors = Array.isArray(result.tensors) ? result.tensors : [];
    let summary = result.summary || {};

    // Fallback RPCs (only adopted when they return more data)
    try {
      const lr = await rpc("model_layers");
      if (lr && !lr.error && Array.isArray(lr.layers) && lr.layers.length > 0) layers = lr.layers;
    } catch {}
    try {
      const tr = await rpc("weight_list");
      if (tr && !tr.error && Array.isArray(tr.tensors) && tr.tensors.length > 0) tensors = tr.tensors;
    } catch {}
    try {
      const sr = await rpc("model_summary");
      if (sr && !sr.error && sr.total_params) summary = sr;
    } catch {}

    console.log(`\n  layers=${layers.length}  tensors=${tensors.length}  ` +
      `params=${summary.format_params || "?"}  quantization=${summary.quantization || result.file_type_name || "n/a"}`);

    check("layers populated (canvas will draw nodes)", layers.length > 0, `${layers.length} layers`);
    check("tensors populated (explorer/tree will fill)", tensors.length > 0, `${tensors.length} tensors`);
    check("summary populated (status bar)", Boolean(summary.total_params || summary.format_params));

    // Canvas draws nothing without layers — this is the exact user-visible bug.
    check("renderModelCanvas has data to render", layers.length > 0,
      layers.length ? "would render" : "CANVAS STAYS EMPTY");

    // ── Quantized model: inspect + edit + unlearn must all actually work ──
    // These used to assert a dead end ("unlearn refused", "heatmap needs real
    // weight data"). Quantized GGUF weights are now dequantized on demand, so
    // the contract is that these operations succeed with real data.
    if (result.format === "gguf") {
      const hm = await rpc("weight_heatmap", { tensor_name: tensors[0]?.name, size: 64 }, 180000);
      const hmCells = Array.isArray(hm.data) ? hm.data.length : 0;
      check("heatmap on GGUF returns real dequantized data",
        !hm.error && hmCells === 64 * 64 && hm.max > hm.min,
        `${hmCells} cells [${hm.min}, ${hm.max}]`);

      const ti = await rpc("tensor_info");
      check("GGUF tensors are editable (weight surgery available)",
        ti.editable === true && Array.isArray(ti.operations) && ti.operations.length > 0,
        `editable=${ti.editable} ops=${(ti.operations || []).length}`);

      const u = await rpc("unlearn_start", { config: { target: "blk.0", method: "node_ablation" } }, 180000);
      const modified = Array.isArray(u.tensors_modified) ? u.tensors_modified.length : 0;
      check("unlearn on GGUF performs weight surgery and completes",
        !u.error && u.status === "completed" && modified > 0,
        `status=${u.status} modified=${modified}`);

      // Leave the backend clean for the next test.
      await rpc("tensor_reset").catch(() => {});
    }

    // ── Payload size sanity (stdio must not choke) ──
    const loadBytes = Buffer.byteLength(JSON.stringify(result));
    console.log(`\n  model_load payload: ${formatBytes(loadBytes)}`);
    check("load payload stays under 8 MB", loadBytes < 8 * 1024 * 1024, formatBytes(loadBytes));

    // ── Sample tensor shape sanity ──
    const sample = tensors[0];
    if (sample) {
      console.log(`  sample tensor: ${sample.name} ${JSON.stringify(sample.shape)} ${sample.dtype}`);
      check("sample tensor has a shape", Array.isArray(sample.shape) && sample.shape.length > 0);
    }
  } catch (e) {
    console.error(`\nERROR: ${e.message}`);
    failures.push(e.message);
  } finally {
    proc.kill();
  }

  console.log(failures.length ? `\n${failures.length} check(s) FAILED\n` : "\nAll checks passed\n");
  process.exit(failures.length ? 1 : 0);
})();
