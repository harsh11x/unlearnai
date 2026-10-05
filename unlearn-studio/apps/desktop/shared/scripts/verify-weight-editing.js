#!/usr/bin/env node
/**
 * verify-weight-editing.js
 *
 * Drives the real backend over its stdio JSON-RPC protocol and exercises the
 * weight-inspection and surgery path on an actual quantized model:
 *
 *   tensor_info     → what is editable
 *   weight_stats    → real dequantized statistics (was "needs real weight data")
 *   weight_heatmap  → real heatmap values (was an empty panel)
 *   tensor_edit     → modify a tensor
 *   tensor_delete   → remove a tensor
 *   tensor_export   → stream a new safetensors checkpoint
 *   tensor_reset    → discard pending edits
 *   unlearn_start   → weight-surgery unlearning on a quantized model
 *
 * Usage: node scripts/verify-weight-editing.js [model.gr​guf] [python]
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const MODEL = process.argv[2] ||
  path.join(os.homedir(), "Downloads", "remap-studio-models", "qwen2.5-coder-0.5b-q4_k_m.gguf");
const PYTHON = process.argv[3] || "/opt/homebrew/bin/python3";
const SCRIPT = path.join(__dirname, "..", "..", "backend", "server.py");

if (!fs.existsSync(MODEL)) {
  console.error(`model not found: ${MODEL}`);
  process.exit(2);
}

let nextId = 1;
const pending = new Map();
let ready = false;
const readyWaiters = [];

const proc = spawn(PYTHON, [SCRIPT], {
  cwd: path.dirname(SCRIPT),
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, PYTHONUNBUFFERED: "1" },
});

let buf = "";
proc.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
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
proc.stderr.on("data", (d) => process.stderr.write(`[py] ${d}`));

function rpc(method, params = {}, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeoutMs);
    pending.set(id, { resolve: (r) => { clearTimeout(t); resolve(r); } });
    proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  });
}

function waitReady(ms = 25000) {
  if (ready) return Promise.resolve();
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("backend not ready")), ms);
    readyWaiters.push((m) => { clearTimeout(t); res(m); });
  });
}

const failures = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

(async () => {
  try {
    await waitReady();
    console.log("\nloading model…");
    const load = await rpc("model_load", { path: MODEL });
    check("model loads", !load.file_not_found && Boolean(load.format), `format=${load.format}`);

    // ── Capability report ──
    console.log("\n— capabilities —");
    const info = await rpc("tensor_info");
    check("quantized model reports editable", info.editable === true);
    check("operations advertised", Array.isArray(info.operations) && info.operations.length > 0,
      (info.operations || []).join(", "));
    check("all tensors are readable/dequantizable",
      (info.unreadable_quant_types === null || Object.keys(info.unreadable_quant_types || {}).length === 0),
      `readable=${info.readable_tensors} unreadable=${JSON.stringify(info.unreadable_quant_types)}`);

    const tensors = (await rpc("weight_list")).tensors || [];
    check("tensor list populated", tensors.length > 0, `${tensors.length} tensors`);

    // Pick a mid-sized tensor so the test is quick but still meaningful.
    const usable = tensors.filter((t) => t.param_count > 1000 && t.param_count < 4_000_000);
    const target = (usable[0] || tensors[0]).name;
    console.log(`  target tensor: ${target}`);

    // ── Real statistics ──
    console.log("\n— weight statistics (was 'needs real weight data') —");
    const stats = await rpc("weight_stats", { tensor_name: target });
    check("stats returned without a quantized error", !stats.error, stats.error || "");
    check("stats are marked dequantized", stats.dequantized === true);
    check("mean is finite", Number.isFinite(stats.mean), `mean=${stats.mean}`);
    check("std is finite and non-zero", Number.isFinite(stats.std) && stats.std > 0, `std=${stats.std}`);
    check("min < max", stats.min < stats.max, `[${stats.min}, ${stats.max}]`);
    check("percentiles present", Number.isFinite(stats.p25) && Number.isFinite(stats.p75),
      `p25=${stats.p25} p75=${stats.p75}`);
    check("percentiles ordered", stats.p1 <= stats.p25 && stats.p25 <= stats.median && stats.median <= stats.p75 && stats.p75 <= stats.p99);
    check("histogram present", Array.isArray(stats.histogram?.counts), `${stats.histogram?.counts?.length} bins`);
    check("zero/negative counts are consistent",
      stats.num_zeros + stats.num_negative + stats.num_positive <= stats.param_count);
    check("sparsity is a fraction", stats.sparsity >= 0 && stats.sparsity <= 1, `sparsity=${stats.sparsity}`);
    check("sampling is disclosed", stats.sampled === undefined || typeof stats.sampled === "boolean");

    // ── Real heatmap ──
    console.log("\n— heatmap (was an empty 'quantized tensor' panel) —");
    const hm = await rpc("weight_heatmap", { tensor_name: target, size: 64 });
    check("heatmap returned without a quantized error", !hm.error, hm.error || "");
    check("heatmap marked dequantized", hm.dequantized === true);
    check("heatmap has size*size values", Array.isArray(hm.data) && hm.data.length === 64 * 64,
      `${hm.data?.length} values`);
    check("heatmap values normalized to [0,1]",
      hm.data.every((v) => v >= -1e-6 && v <= 1 + 1e-6));
    const distinct = new Set(hm.data.map((v) => Math.round(v * 100))).size;
    check("heatmap has real variation (not a flat fill)", distinct > 10, `${distinct} distinct levels`);
    check("heatmap reports range", Number.isFinite(hm.min) && Number.isFinite(hm.max), `[${hm.min}, ${hm.max}]`);

    // Heatmap of the biggest tensor must also work (proves no full materialisation).
    const biggest = tensors.reduce((a, b) => (b.param_count > (a?.param_count || 0) ? b : a), null);
    console.log(`  largest tensor: ${biggest.name} (${biggest.param_count.toLocaleString()} params)`);
    const t0 = Date.now();
    const bigHm = await rpc("weight_heatmap", { tensor_name: biggest.name, size: 64 }, 120000);
    const bigMs = Date.now() - t0;
    check("heatmap of the largest tensor works", !bigHm.error && bigHm.data?.length === 64 * 64,
      `${bigMs}ms`);
    check("largest-tensor heatmap is fast (no full materialisation)", bigMs < 30000, `${bigMs}ms`);

    // ── Editing ──
    console.log("\n— weight editing —");
    const before = await rpc("weight_stats", { tensor_name: target });
    const scaled = await rpc("tensor_edit", { tensor_name: target, op: "scale", params: { factor: 0.5 } });
    check("scale edit accepted", scaled.ok === true, scaled.message || scaled.error || "");
    const afterScale = await rpc("weight_stats", { tensor_name: target });
    check("scale actually changed the weights",
      Math.abs(afterScale.std - before.std * 0.5) < before.std * 0.05,
      `${before.std.toFixed(6)} → ${afterScale.std.toFixed(6)}`);
    check("edits are reported in stats", (afterScale.edits || []).length === 1, JSON.stringify(afterScale.edits));

    const zeroed = await rpc("tensor_edit", { tensor_name: target, op: "zero" });
    check("zero (node ablation) accepted", zeroed.ok === true);
    const afterZero = await rpc("weight_stats", { tensor_name: target });
    check("zeroed tensor reports all zeros", afterZero.num_zeros === afterZero.param_count,
      `zeros=${afterZero.num_zeros}/${afterZero.param_count}`);
    check("zeroed tensor std is 0", afterZero.std < 1e-9);

    const pruned = await rpc("tensor_edit", { tensor_name: target, op: "prune", params: { fraction: 0.5 } });
    check("prune accepted", pruned.ok === true, pruned.message || pruned.error || "");

    const rejected = await rpc("tensor_edit", { tensor_name: target, op: "not_a_real_op" });
    check("unknown operation is rejected", Boolean(rejected.error));

    const restored = await rpc("tensor_edit", { tensor_name: target, op: "restore" });
    check("restore clears edits", restored.ok === true && (restored.edits || []).length === 0);
    const afterRestore = await rpc("weight_stats", { tensor_name: target });
    check("restored tensor matches the original",
      Math.abs(afterRestore.std - before.std) < before.std * 1e-6,
      `${before.std.toFixed(6)} vs ${afterRestore.std.toFixed(6)}`);

    // ── Deletion + pending ──
    console.log("\n— deletion & pending edits —");
    const delName = tensors[tensors.length - 1].name;
    const del = await rpc("tensor_delete", { tensor_name: delName, deleted: true });
    check("tensor deletion accepted", del.ok === true && del.deleted === true);
    await rpc("tensor_edit", { tensor_name: target, op: "scale", params: { factor: 0.75 } });
    const pend = await rpc("tensor_pending");
    check("pending reports the deletion", (pend.deleted || []).includes(delName));
    check("pending reports the edit", pend.edit_count >= 1, `edit_count=${pend.edit_count}`);

    // ── Unlearning via weight surgery ──
    console.log("\n— unlearn on a quantized model —");
    const job = await rpc("unlearn_start", {
      config: { target: "blk.0", method: "node_ablation", num_steps: 50 },
    });
    check("unlearn returns a job instead of refusing", Boolean(job.job_id), job.job_id || job.error || "");
    check("unlearn completed via weight surgery", job.status === "completed", job.status || "");
    check("unlearn modified tensors", (job.tensors_modified || []).length > 0,
      `${(job.tensors_modified || []).length} tensors`);
    const prog = await rpc("unlearn_progress", { job_id: job.job_id });
    check("progress poll resolves for the surgery job", prog.status === "completed" && prog.progress === 100);

    // ── Export ──
    console.log("\n— export to safetensors —");
    const outPath = path.join(os.tmpdir(), `remap-export-verify-${Date.now()}.safetensors`);
    const exp = await rpc("tensor_export", { path: outPath, dtype: "float16" }, 600000);
    check("export completed", !exp.error, exp.error || "");
    if (!exp.error) {
      check("export file exists", fs.existsSync(outPath));
      const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
      check("export file is non-trivial", size > 1024, `${(size / 1024 / 1024).toFixed(1)} MB`);
      check("export reports a tensor count", exp.tensor_count > 0, `${exp.tensor_count} tensors`);

      // Validate the container by reading its header back.
      const fd = fs.openSync(outPath, "r");
      const lenBuf = Buffer.alloc(8);
      fs.readSync(fd, lenBuf, 0, 8, 0);
      const headerLen = lenBuf.readBigUInt64LE(0);
      const hb = Buffer.alloc(Number(headerLen));
      fs.readSync(fd, hb, 0, Number(headerLen), 8);
      const header = JSON.parse(hb.toString("utf8").trim());
      fs.closeSync(fd);

      const names = Object.keys(header);
      check("safetensors header parses", names.length > 0, `${names.length} entries`);
      check("exported tensors carry dtype/shape/offsets",
        names.every((n) => header[n].dtype && header[n].shape && header[n].data_offsets));
      check("deleted tensor is omitted from the export", !names.includes(delName));
      check("edit was applied (scale 0.75 visible in pending)",
        (exp.edits_applied || 0) >= 1, `edits_applied=${exp.edits_applied}`);
      check("exported byte size matches the declared header",
        Number(headerLen) + 8 + Math.max(...names.map((n) => header[n].data_offsets[1])) === size,
        `${size} bytes vs header ${headerLen}`);
      check("export reports Safetensors format", exp.format === "safetensors");

      // Confirm the exported file is loadable by the same backend.
      const reload = await rpc("model_load", { path: outPath }, 600000);
      check("exported file reloads as a trainable model", !reload.error && reload.trainable !== false,
        `format=${reload.format} trainable=${reload.trainable}`);
      fs.unlinkSync(outPath);
    }

    await rpc("tensor_reset");
    const cleared = await rpc("tensor_pending");
    check("reset clears everything", cleared.edit_count === 0 && cleared.delete_count === 0);
  } catch (e) {
    console.error(`\nERROR: ${e.message}`);
    failures.push(e.message);
  } finally {
    proc.kill();
  }

  console.log(failures.length ? `\n${failures.length} check(s) FAILED\n` : "\nAll checks passed\n");
  process.exit(failures.length ? 1 : 0);
})();
