// ══════════════════════════════════════════════════════════
// UNLEARN STUDIO — Desktop App (Real Backend Integration)
// ══════════════════════════════════════════════════════════

const API = window.electronAPI;

// ── State ──
const state = {
  model: null, // { path, name, size, metadata from Python }
  layers: [], // structured layer data from backend
  tensors: [], // full tensor list from backend
  selectedTensor: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  lastMouse: { x: 0, y: 0 },
  backendReady: false,
  backendInfo: null,
  currentJobId: null,
  unlearnPollTimer: null,
  heatmapData: null,
  modelSummary: null,
};

// ══════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initResizeHandles();
  initBottomPanel();
  initDragDrop();
  initModelOpeners();
  initCanvasInteractions();
  initUnlearnPanel();
  initWeightExplorer();
  loadPlatform();
  initBackendListeners();
  initChatbot();
  initResourceMonitor();
});

function initBackendListeners() {
  API.onBackendReady((info) => {
    state.backendReady = true;
    state.backendInfo = info;
    log("Python backend connected", "success");
    log(`Device: ${info.device} | PyTorch ${info.torch} | Python ${info.python.split(" ")[0]}`);
    if (info.cuda_available) log(`CUDA ${info.cuda_version} available`, "info");
    if (info.mps_available) log("Apple MPS GPU available", "info");
    log(`RAM: ${info.ram_available_gb}GB / ${info.ram_total_gb}GB available`);
    document.getElementById("status-platform").textContent = `${info.device} · ${info.ram_total_gb}GB RAM`;
  });

  API.onBackendLog((msg) => {
    log(msg);
  });

  API.onUnlearnProgress((data) => {
    handleUnlearnProgress(data);
  });

  // Check if backend is already ready
  API.isBackendReady().then((ready) => {
    if (!ready) {
      log("Waiting for Python backend...", "info");
    }
  });
}

// ══════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${target}`).classList.add("active");

      if (target === "heatmap" && state.model) renderHeatmap();
      if (target === "visualization" && state.model) renderModelCanvas();
      if (target === "unlearn") renderUnlearnCanvas();
    });
  });
}

// ══════════════════════════════════════════
// RESIZE HANDLES
// ══════════════════════════════════════════

function initResizeHandles() {
  document.querySelectorAll(".resize-handle[data-resize='sidebar']").forEach((handle) => {
    let startX, startW;
    handle.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startW = document.getElementById("sidebar").offsetWidth;
      handle.classList.add("active");
      const onMove = (e) => {
        const diff = e.clientX - startX;
        document.getElementById("sidebar").style.width = `${Math.max(180, Math.min(400, startW + diff))}px`;
      };
      const onUp = () => {
        handle.classList.remove("active");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        renderModelCanvas();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });

  document.querySelectorAll(".resize-handle[data-resize='props']").forEach((handle) => {
    let startX, startW;
    handle.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startW = document.getElementById("properties").offsetWidth;
      handle.classList.add("active");
      const onMove = (e) => {
        document.getElementById("properties").style.width = `${Math.max(200, Math.min(400, startW + (startX - e.clientX)))}px`;
      };
      const onUp = () => {
        handle.classList.remove("active");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}

// ══════════════════════════════════════════
// BOTTOM PANEL
// ══════════════════════════════════════════

function initBottomPanel() {
  const header = document.getElementById("bottom-panel-toggle");
  const panel = document.getElementById("bottom-panel");
  header.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    panel.classList.toggle("expanded");
  });
}

// ══════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════

function initDragDrop() {
  const body = document.body;
  body.addEventListener("dragover", (e) => {
    e.preventDefault();
    body.classList.add("drag-active");
  });
  body.addEventListener("dragleave", () => body.classList.remove("drag-active"));
  body.addEventListener("drop", (e) => {
    e.preventDefault();
    body.classList.remove("drag-active");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      loadModel(file.path || file.name, file.name, file.size);
    }
  });
}

// ══════════════════════════════════════════
// MODEL OPENERS
// ══════════════════════════════════════════

function initModelOpeners() {
  const openModel = async () => {
    const file = await API.openFile();
    if (!file) return;
    loadModel(file.path, file.name, file.size);
  };

  document.getElementById("btn-open-model").addEventListener("click", openModel);
  document.getElementById("btn-open-model-empty").addEventListener("click", openModel);
  document.getElementById("btn-open-welcome").addEventListener("click", openModel);
}

async function loadModel(filePath, fileName, fileSize) {
  if (!state.backendReady) {
    log("Python backend not ready. Please wait...", "error");
    return;
  }

  log(`Loading model: ${fileName}`, "info");
  log(`Path: ${filePath}`);

  // Show loading state
  const overlay = document.getElementById("canvas-overlay");
  overlay.classList.remove("hidden");
  overlay.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon" style="animation: spin 1s linear infinite;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#333" stroke-width="3"/>
          <path d="M24 4a20 20 0 0 1 20 20" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="welcome-title">Loading ${fileName}...</h2>
      <p class="welcome-desc">Parsing tensors, computing statistics, building layer graph</p>
    </div>
  `;

  try {
    // Call Python backend to load the model
    const result = await API.rpc("model_load", { path: filePath });

    if (result.error) {
      throw new Error(result.error);
    }

    state.model = {
      path: filePath,
      name: fileName,
      size: fileSize,
      metadata: result,
    };

    // Get structured layer data
    const layersResult = await API.rpc("model_layers");
    if (layersResult.error) throw new Error(layersResult.error);
    state.layers = layersResult.layers;

    // Get full tensor list
    const tensorsResult = await API.rpc("weight_list");
    if (tensorsResult.error) throw new Error(tensorsResult.error);
    state.tensors = tensorsResult.tensors;

    // Get model summary
    const summaryResult = await API.rpc("model_summary");
    if (summaryResult.error) throw new Error(summaryResult.error);
    state.modelSummary = summaryResult;

    // Update all UI
    updateBreadcrumb();
    updateStatusBar();
    updateModelTree();
    updateWeightExplorer();
    updateUnlearnButton();

    // Hide overlay, show canvas
    overlay.classList.add("hidden");

    // Render
    renderModelCanvas();

    log(`Loaded ${fileName}`, "success");
    log(`${state.layers.length} layers · ${state.tensors.length} tensors · ${summaryResult.format_params} params`);
    log(`Format: ${result.format} | Size: ${formatBytes(result.size_bytes)}`);

  } catch (e) {
    log(`Error loading model: ${e.message}`, "error");
    overlay.innerHTML = `
      <div class="welcome-screen">
        <h2 class="welcome-title">Failed to load model</h2>
        <p class="welcome-desc">${e.message}</p>
        <button class="btn-primary" onclick="document.getElementById('canvas-overlay').classList.add('hidden')">Dismiss</button>
      </div>
    `;
  }
}

// ══════════════════════════════════════════
// CANVAS RENDERING — REAL LAYER DATA
// ══════════════════════════════════════════

function renderModelCanvas() {
  const canvas = document.getElementById("model-canvas");
  if (!canvas) return;

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const W = rect.width;
  const H = rect.height;
  const pad = { top: 60, bottom: 60, left: 80, right: 80 };

  if (state.layers.length === 0) return;

  // Group layers into visual columns
  const maxCols = Math.min(12, state.layers.length);
  const groupSize = Math.max(1, Math.ceil(state.layers.length / maxCols));
  const groups = [];
  for (let i = 0; i < state.layers.length; i += groupSize) {
    groups.push(state.layers.slice(i, i + groupSize));
  }

  const colSpacing = (W - pad.left - pad.right) / Math.max(1, groups.length - 1);

  // Compute node positions
  const groupData = groups.map((group, gi) => {
    const x = pad.left + gi * colSpacing;
    const maxParams = Math.max(...group.map((l) => l.total_params));
    const nodes = group.map((layer, li) => {
      const y = pad.top + ((H - pad.top - pad.bottom) / (group.length + 1)) * (li + 1);
      const paramRatio = maxParams > 0 ? layer.total_params / maxParams : 0.5;
      const radius = 4 + paramRatio * 8;
      return { x, y, radius, layer };
    });
    return { x, nodes };
  });

  // Draw connections
  for (let gi = 0; gi < groupData.length - 1; gi++) {
    const from = groupData[gi];
    const to = groupData[gi + 1];
    from.nodes.forEach((fn) => {
      to.nodes.forEach((tn) => {
        ctx.beginPath();
        ctx.moveTo(fn.x + fn.radius + 1, fn.y);
        ctx.lineTo(tn.x - tn.radius - 1, tn.y);
        ctx.strokeStyle = "rgba(82, 82, 82, 0.1)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    });
  }

  // Draw nodes
  groupData.forEach((gd) => {
    gd.nodes.forEach((node) => {
      // Glow for large layers
      if (node.radius > 8) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      const brightness = 0.4 + (node.radius / 12) * 0.6;
      ctx.fillStyle = `rgba(229, 229, 229, ${brightness})`;
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Hover detection
      const mx = state.lastMouse.x;
      const my = state.lastMouse.y;
      const dist = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2);
      if (dist < node.radius + 4) {
        // Highlight
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  });

  // Draw column labels
  groups.forEach((group, gi) => {
    const x = pad.left + gi * colSpacing;
    ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
    ctx.font = '10px "SF Mono", monospace';
    ctx.textAlign = "center";

    let label = group[0].name;
    if (label.length > 14) label = "…" + label.slice(-13);
    ctx.fillText(label, x, H - 20);

    if (group.length > 1) {
      ctx.fillText(`+${group.length - 1}`, x, H - 8);
    }
  });

  // Title
  ctx.fillStyle = "rgba(229, 229, 229, 0.8)";
  ctx.font = 'bold 13px "SF Pro Display", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(state.model?.name || "Model Architecture", pad.left, 30);

  ctx.fillStyle = "rgba(115, 115, 115, 0.6)";
  ctx.font = '11px "SF Mono", monospace';
  const totalParams = state.modelSummary?.format_params || "?";
  ctx.fillText(`${state.layers.length} layers · ${totalParams} params`, pad.left, 48);
}

// ══════════════════════════════════════════
// HEATMAP — REAL TENSOR DATA
// ══════════════════════════════════════════

async function renderHeatmap() {
  const canvas = document.getElementById("heatmap-canvas");
  if (!canvas || !state.model) return;

  const select = document.getElementById("heatmap-layer-select");
  populateTensorSelect(select);

  const tensorName = select.value || (state.tensors.length > 0 ? state.tensors[0].name : null);
  if (!tensorName) return;

  // Fetch real heatmap data from backend
  try {
    const result = await API.rpc("weight_heatmap", { tensor_name: tensorName, size: 128 });
    if (result.error) {
      log(`Heatmap error: ${result.error}`, "error");
      return;
    }

    state.heatmapData = result;

    const size = result.size;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${Math.min(512, size * 3)}px`;
    canvas.style.height = `${Math.min(512, size * 3)}px`;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(size, size);

    for (let i = 0; i < result.data.length; i++) {
      const v = Math.floor(result.data[i] * 255);
      imageData.data[i * 4] = v;
      imageData.data[i * 4 + 1] = v;
      imageData.data[i * 4 + 2] = v;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    // Update label
    const body = document.getElementById("heatmap-body");
    const existing = body.querySelector(".heatmap-label");
    if (existing) existing.remove();
    const label = document.createElement("div");
    label.className = "heatmap-label";
    label.style.cssText =
      "position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:10px;color:var(--text-subtle);background:var(--bg-elevated);padding:2px 8px;border:1px solid var(--border);white-space:nowrap;";
    label.textContent = `${tensorName} | min=${result.min.toFixed(4)} max=${result.max.toFixed(4)} mean=${result.mean.toFixed(4)}`;
    body.style.position = "relative";
    body.appendChild(label);

  } catch (e) {
    log(`Heatmap error: ${e.message}`, "error");
  }
}

// ══════════════════════════════════════════
// WEIGHT EXPLORER — REAL TENSOR DATA
// ══════════════════════════════════════════

function initWeightExplorer() {
  const select = document.getElementById("weight-layer-select");
  select.addEventListener("change", () => renderWeightList(select.value));
}

function updateWeightExplorer() {
  const select = document.getElementById("weight-layer-select");
  populateLayerSelect(select);
  if (state.layers.length > 0) renderWeightList(state.layers[0].name);
}

async function renderWeightList(layerName) {
  const container = document.getElementById("weight-explorer-body");

  if (!layerName) {
    container.innerHTML = '<div class="empty-state"><p class="empty-title">Select a layer</p></div>';
    return;
  }

  // Find tensors belonging to this layer
  const layerTensors = state.tensors.filter((t) => t.name.includes(layerName));

  if (layerTensors.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="empty-title">No tensors found</p></div>';
    return;
  }

  let html = "";
  for (const tensor of layerTensors) {
    // Get real stats for each tensor
    let stats = {};
    try {
      const result = await API.rpc("weight_stats", { tensor_name: tensor.name });
      if (!result.error) stats = result;
    } catch (e) {}

    html += `
      <div class="weight-item" data-tensor="${tensor.name}" onclick="selectTensor('${tensor.name}')">
        <span class="weight-name">${tensor.name.split(".").pop()}</span>
        <span class="weight-shape">[${tensor.shape.join("×")}]</span>
        <span class="weight-dtype">${tensor.dtype}</span>
        <span class="weight-size">${formatBytes(tensor.byte_count)}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function selectTensor(name) {
  state.selectedTensor = name;

  // Update properties panel
  const propsBody = document.getElementById("properties-body");

  try {
    const result = await API.rpc("weight_stats", { tensor_name: name });
    if (result.error) {
      propsBody.innerHTML = `<div class="prop-group"><div class="prop-group-title">${name}</div><div class="prop-row"><span class="prop-key">Error</span><span class="prop-val danger">${result.error}</span></div></div>`;
      return;
    }

    propsBody.innerHTML = `
      <div class="prop-group">
        <div class="prop-group-title">TENSOR</div>
        <div class="prop-row"><span class="prop-key">Name</span><span class="prop-val" style="font-size:10px;word-break:break-all;max-width:160px;text-align:right">${name}</span></div>
        <div class="prop-row"><span class="prop-key">Shape</span><span class="prop-val">[${result.shape.join(", ")}]</span></div>
        <div class="prop-row"><span class="prop-key">Dtype</span><span class="prop-val">${result.dtype}</span></div>
        <div class="prop-row"><span class="prop-key">Params</span><span class="prop-val">${formatParams(result.param_count)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">STATISTICS</div>
        <div class="prop-row"><span class="prop-key">Mean</span><span class="prop-val">${result.mean.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Std</span><span class="prop-val">${result.std.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Min</span><span class="prop-val">${result.min.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Max</span><span class="prop-val">${result.max.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Median</span><span class="prop-val">${result.median.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">Norm</span><span class="prop-val">${result.norm.toFixed(4)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">DISTRIBUTION</div>
        <div class="prop-row"><span class="prop-key">Zeros</span><span class="prop-val">${result.num_zeros} (${result.zero_percent.toFixed(1)}%)</span></div>
        <div class="prop-row"><span class="prop-key">Negative</span><span class="prop-val">${result.num_negative}</span></div>
        <div class="prop-row"><span class="prop-key">Positive</span><span class="prop-val">${result.num_positive}</span></div>
        <div class="prop-row"><span class="prop-key">Skewness</span><span class="prop-val">${result.skewness.toFixed(4)}</span></div>
        <div class="prop-row"><span class="prop-key">Kurtosis</span><span class="prop-val">${result.kurtosis.toFixed(4)}</span></div>
      </div>
      <div class="prop-group">
        <div class="prop-group-title">PERCENTILES</div>
        <div class="prop-row"><span class="prop-key">P1</span><span class="prop-val">${result.p1.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P5</span><span class="prop-val">${result.p5.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P25</span><span class="prop-val">${result.p25.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P75</span><span class="prop-val">${result.p75.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P95</span><span class="prop-val">${result.p95.toFixed(6)}</span></div>
        <div class="prop-row"><span class="prop-key">P99</span><span class="prop-val">${result.p99.toFixed(6)}</span></div>
      </div>
    `;

    // Also show heatmap for this tensor
    const heatmapCanvas = document.getElementById("heatmap-canvas");
    if (heatmapCanvas && document.getElementById("panel-heatmap").classList.contains("active")) {
      // Update heatmap select
      const heatmapSelect = document.getElementById("heatmap-layer-select");
      const option = Array.from(heatmapSelect.options).find((o) => o.value === name);
      if (option) heatmapSelect.value = name;
      renderHeatmap();
    }

  } catch (e) {
    propsBody.innerHTML = `<div class="prop-group"><div class="prop-group-title">Error</div><div class="prop-row"><span class="prop-key">${e.message}</span></div></div>`;
  }
}

// ══════════════════════════════════════════
// UNLEARN PANEL — REAL TRAINING
// ══════════════════════════════════════════

function initUnlearnPanel() {
  // Range value displays
  const stepsSlider = document.getElementById("unlearn-steps");
  const stepsVal = document.getElementById("unlearn-steps-val");
  stepsSlider.addEventListener("input", () => (stepsVal.textContent = stepsSlider.value));

  const lrSlider = document.getElementById("unlearn-lr");
  const lrVal = document.getElementById("unlearn-lr-val");
  lrSlider.addEventListener("input", () => {
    const exp = parseFloat(lrSlider.value);
    lrVal.textContent = `1e${exp}`;
  });

  const retainSlider = document.getElementById("unlearn-retain");
  const retainVal = document.getElementById("unlearn-retain-val");
  retainSlider.addEventListener("input", () => (retainVal.textContent = retainSlider.value));

  // Start button
  document.getElementById("btn-start-unlearn").addEventListener("click", startUnlearn);
}

function updateUnlearnButton() {
  const btn = document.getElementById("btn-start-unlearn");
  btn.disabled = !state.model || !state.backendReady;
}

async function startUnlearn() {
  if (!state.model || !state.backendReady) return;

  const target = document.getElementById("unlearn-target").value;
  if (!target) {
    log("Select a target capability first", "error");
    return;
  }

  const method = document.getElementById("unlearn-method").value;
  const numSteps = parseInt(document.getElementById("unlearn-steps").value);
  const lrExp = parseFloat(document.getElementById("unlearn-lr").value);
  const retainWeight = parseFloat(document.getElementById("unlearn-retain").value);

  const config = {
    target,
    method,
    num_steps: numSteps,
    learning_rate: Math.pow(10, lrExp),
    retain_weight: retainWeight,
  };

  log(`Starting unlearning: target=${target}, method=${method}, steps=${numSteps}`, "info");

  try {
    const result = await API.rpc("unlearn_start", { config });
    if (result.error) {
      log(`Error: ${result.error}`, "error");
      return;
    }

    state.currentJobId = result.job_id;
    log(`Job started: ${result.job_id}`, "success");

    // Disable start button
    document.getElementById("btn-start-unlearn").disabled = true;
    document.getElementById("btn-start-unlearn").textContent = "Running...";

    // Start polling
    startUnlearnPoll();

  } catch (e) {
    log(`Error starting unlearn: ${e.message}`, "error");
  }
}

function startUnlearnPoll() {
  if (state.unlearnPollTimer) clearInterval(state.unlearnPollTimer);

  state.unlearnPollTimer = setInterval(async () => {
    if (!state.currentJobId) {
      clearInterval(state.unlearnPollTimer);
      return;
    }

    try {
      const result = await API.rpc("unlearn_progress", { job_id: state.currentJobId });
      if (!result.error) {
        handleUnlearnProgress(result);
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 200);
}

function handleUnlearnProgress(data) {
  // Update the unlearn canvas
  renderUnlearnCanvas(data);

  // Update progress bar if visible
  if (data.status === "completed" || data.status === "failed") {
    clearInterval(state.unlearnPollTimer);
    state.currentJobId = null;

    document.getElementById("btn-start-unlearn").disabled = false;
    document.getElementById("btn-start-unlearn").textContent = "Start Unlearning";

    if (data.status === "completed") {
      log(`Unlearning complete in ${data.elapsed}s`, "success");
      log(`Nodes erased: ${data.nodes_erased}`, "info");
    } else {
      log(`Unlearning failed: ${data.error || "unknown error"}`, "error");
    }
  }
}

// ══════════════════════════════════════════
// UNLEARN CANVAS VISUALIZATION
// ══════════════════════════════════════════

function renderUnlearnCanvas(progressData) {
  const canvas = document.getElementById("unlearn-canvas");
  if (!canvas) return;

  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;

  if (!progressData) {
    // Show idle state
    ctx.fillStyle = "rgba(115, 115, 115, 0.4)";
    ctx.font = '13px "SF Pro Display", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Configure and start unlearning to see real-time visualization", W / 2, H / 2 - 10);
    ctx.font = '11px "SF Mono", monospace';
    ctx.fillStyle = "rgba(115, 115, 115, 0.3)";
    ctx.fillText("This will show weight changes, loss curves, and node erasure in real-time", W / 2, H / 2 + 15);
    return;
  }

  const { phase, progress, metrics, current_step, total_steps, nodes_erased, total_nodes } = progressData;

  // ── Left half: loss curves ──
  const chartW = W * 0.55;
  const chartH = H - 40;
  const chartX = 20;
  const chartY = 30;

  if (metrics && metrics.total_loss && metrics.total_loss.length > 1) {
    const losses = metrics.total_loss;
    const forgetLosses = metrics.forget_loss || [];
    const retainLosses = metrics.retain_loss || [];

    // Draw axes
    ctx.strokeStyle = "rgba(82, 82, 82, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    // Find min/max for scaling
    const allVals = [...losses, ...forgetLosses, ...retainLosses];
    let minVal = Math.min(...allVals);
    let maxVal = Math.max(...allVals);
    if (maxVal - minVal < 1e-10) { minVal -= 1; maxVal += 1; }

    const drawLine = (data, color) => {
      if (data.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      data.forEach((val, i) => {
        const x = chartX + (i / (data.length - 1)) * chartW;
        const y = chartY + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine(losses, "rgba(229, 229, 229, 0.8)");
    drawLine(forgetLosses, "rgba(239, 68, 68, 0.6)");
    drawLine(retainLosses, "rgba(34, 197, 94, 0.6)");

    // Legend
    ctx.font = '10px "SF Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(229, 229, 229, 0.6)";
    ctx.fillText("● Total Loss", chartX, chartY - 5);
    ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
    ctx.fillText("● Forget Loss", chartX + 90, chartY - 5);
    ctx.fillStyle = "rgba(34, 197, 94, 0.6)";
    ctx.fillText("● Retain Loss", chartX + 200, chartY - 5);
  }

  // ── Right half: progress stats ──
  const rightX = W * 0.6;

  ctx.fillStyle = "rgba(229, 229, 229, 0.8)";
  ctx.font = 'bold 11px "SF Mono", monospace';
  ctx.textAlign = "left";

  const statY = chartY + 20;
  const statSpacing = 28;

  ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("STATUS", rightX, statY);

  ctx.fillStyle = phase === "done" ? "rgba(34, 197, 94, 0.9)" : "rgba(229, 229, 229, 0.8)";
  ctx.font = 'bold 14px "SF Pro Display", sans-serif';
  ctx.fillText(phase.toUpperCase(), rightX, statY + 18);

  ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("PROGRESS", rightX, statY + statSpacing + 20);

  // Progress bar
  const barX = rightX;
  const barY = statY + statSpacing + 28;
  const barW = W - rightX - 20;
  const barH = 6;

  ctx.fillStyle = "rgba(38, 38, 38, 1)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(229, 229, 229, 0.8)";
  ctx.fillRect(barX, barY, barW * (progress / 100), barH);

  ctx.fillStyle = "rgba(229, 229, 229, 0.6)";
  ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(`${Math.round(progress)}%`, rightX, barY + barH + 18);

  // Step counter
  ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("STEP", rightX, barY + barH + 42);
  ctx.fillStyle = "rgba(229, 229, 229, 0.7)";
  ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(`${current_step || 0} / ${total_steps || 0}`, rightX, barY + barH + 58);

  // Nodes erased
  ctx.fillStyle = "rgba(115, 115, 115, 0.5)";
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText("NODES ERASED", rightX, barY + barH + 82);
  ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
  ctx.font = 'bold 14px "SF Pro Display", sans-serif';
  ctx.fillText(`${nodes_erased || 0} / ${total_nodes || 0}`, rightX, barY + barH + 100);
}

// ══════════════════════════════════════════
// CANVAS INTERACTIONS
// ══════════════════════════════════════════

function initCanvasInteractions() {
  const canvas = document.getElementById("model-canvas");

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    state.lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (state.model) renderModelCanvas();
  });

  canvas.addEventListener("mouseleave", () => {
    state.lastMouse = { x: -1000, y: -1000 };
    if (state.model) renderModelCanvas();
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    state.zoom = Math.max(0.3, Math.min(3, state.zoom * delta));
    document.getElementById("status-zoom").textContent = `${Math.round(state.zoom * 100)}%`;
    renderModelCanvas();
  });
}

// ══════════════════════════════════════════
// UI UPDATES
// ══════════════════════════════════════════

function updateBreadcrumb() {
  const bc = document.getElementById("breadcrumb");
  if (!state.model) {
    bc.innerHTML = '<span class="breadcrumb-item breadcrumb-empty">No model loaded</span>';
    return;
  }
  bc.innerHTML = `<span class="breadcrumb-item">${state.model.name}</span>`;
}

function updateStatusBar() {
  document.getElementById("status-model").textContent = state.model?.name || "No model";
  const summary = state.modelSummary;
  document.getElementById("status-params").textContent = summary ? `${summary.format_params} params · ${summary.total_mb}MB` : "—";
}

function updateModelTree() {
  const container = document.getElementById("model-tree");
  if (!state.model) return;

  const meta = state.model.metadata;

  // Group tensors by their prefix
  const groups = {};
  state.tensors.forEach((t) => {
    const parts = t.name.split(".");
    const group = parts.length > 1 ? parts[0] : "root";
    if (!groups[group]) groups[group] = [];
    groups[group].push(t);
  });

  let html = `
    <div class="tree-node selected">
      <span class="tree-node-icon">📦</span>
      <span class="tree-node-label">${state.model.name}</span>
    </div>
    <div class="tree-node tree-indent">
      <span class="tree-node-icon">◇</span>
      <span class="tree-node-label">Format: ${meta.format}</span>
    </div>
    <div class="tree-node tree-indent">
      <span class="tree-node-icon">◇</span>
      <span class="tree-node-label">Size: ${formatBytes(meta.size_bytes)}</span>
    </div>
  `;

  for (const [group, tensors] of Object.entries(groups)) {
    const totalParams = tensors.reduce((s, t) => s + t.param_count, 0);
    html += `
      <div class="tree-node tree-indent">
        <span class="tree-node-icon">📁</span>
        <span class="tree-node-label">${group}</span>
        <span class="tree-node-meta">${formatParams(totalParams)}</span>
      </div>
    `;

    tensors.slice(0, 20).forEach((tensor) => {
      const shortName = tensor.name.replace(group + ".", "");
      html += `
        <div class="tree-node tree-indent-2" data-tensor="${tensor.name}" onclick="selectTensor('${tensor.name}')">
          <span class="tree-node-icon">◇</span>
          <span class="tree-node-label">${shortName}</span>
          <span class="tree-node-meta">${formatBytes(tensor.byte_count)}</span>
        </div>
      `;
    });

    if (tensors.length > 20) {
      html += `
        <div class="tree-node tree-indent-2">
          <span class="tree-node-label" style="color:var(--text-subtle)">... +${tensors.length - 20} more</span>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

function populateLayerSelect(select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select a layer...</option>';
  state.layers.forEach((layer) => {
    const opt = document.createElement("option");
    opt.value = layer.name;
    opt.textContent = `${layer.name} (${formatParams(layer.total_params)})`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

function populateTensorSelect(select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select a tensor...</option>';
  state.tensors.forEach((tensor) => {
    const opt = document.createElement("option");
    opt.value = tensor.name;
    opt.textContent = `${tensor.name} [${tensor.shape.join("×")}]`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

// ══════════════════════════════════════════
// TERMINAL LOGGING
// ══════════════════════════════════════════

function log(message, type = "") {
  const terminal = document.getElementById("terminal-output");
  const line = document.createElement("div");
  line.className = "terminal-line";
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  line.innerHTML = `<span class="terminal-prompt">❯</span> <span style="color:var(--text-subtle);font-size:10px;margin-right:4px">${time}</span><span class="terminal-text ${type}">${message}</span>`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

// ══════════════════════════════════════════
// PLATFORM INFO
// ══════════════════════════════════════════

async function loadPlatform() {
  const platform = await API.getPlatform();
  const labels = { darwin: "macOS", win32: "Windows", linux: "Linux" };
  if (!state.backendReady) {
    document.getElementById("status-platform").textContent = labels[platform] || platform;
  }
}

// ══════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════

function formatParams(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ══════════════════════════════════════════
// CHATBOT — AI ASSISTANT
// ══════════════════════════════════════════

function initChatbot() {
  const toggle = document.getElementById("chatbot-toggle");
  const panel = document.getElementById("chatbot-panel");
  const closeBtn = document.getElementById("chatbot-close");
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");
  const messages = document.getElementById("chatbot-messages");

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
    toggle.classList.toggle("active");
    if (panel.classList.contains("open")) {
      input.focus();
      toggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.2"/></svg>`;
    } else {
      toggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2C5.58 2 2 5.13 2 9c0 2.13 1.17 4.04 3 5.3V18l3.5-2c.65.18 1.34.28 2.07.28h-.07C14.42 16.28 18 12.85 18 9c0-3.87-3.58-7-8-7z" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="7" cy="9" r="1" fill="currentColor"/><circle cx="10" cy="9" r="1" fill="currentColor"/><circle cx="13" cy="9" r="1" fill="currentColor"/></svg>`;
    }
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("open");
    toggle.classList.remove("active");
    toggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2C5.58 2 2 5.13 2 9c0 2.13 1.17 4.04 3 5.3V18l3.5-2c.65.18 1.34.28 2.07.28h-.07C14.42 16.28 18 12.85 18 9c0-3.87-3.58-7-8-7z" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="7" cy="9" r="1" fill="currentColor"/><circle cx="10" cy="9" r="1" fill="currentColor"/><circle cx="13" cy="9" r="1" fill="currentColor"/></svg>`;
  });

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addChatMessage(text, "user");
    sendBtn.disabled = true;

    // Process the message
    const response = await processChatMessage(text);
    addChatMessage(response, "assistant");
    sendBtn.disabled = false;
    input.focus();
  };

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function addChatMessage(text, role) {
  const messages = document.getElementById("chatbot-messages");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function processChatMessage(text) {
  const lower = text.toLowerCase();

  // Model analysis commands
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("describe") || lower.includes("tell me about")) {
    if (!state.model) return "No model loaded yet. Click **Open Model** to load a .safetensors or .pt file.";
    const s = state.modelSummary;
    return `**Model: ${state.model.name}**<br><br>` +
      `• **Format:** ${state.model.metadata.format}<br>` +
      `• **Parameters:** ${s.format_params}<br>` +
      `• **Tensors:** ${s.tensor_count}<br>` +
      `• **Size:** ${s.total_mb} MB<br>` +
      `• **Dtypes:** ${Object.keys(s.dtype_distribution).join(", ")}<br>` +
      `• **Trainable layers:** ${s.trainable_count}`;
  }

  if (lower.includes("layer") && (lower.includes("list") || lower.includes("show") || lower.includes("which"))) {
    if (state.layers.length === 0) return "No model loaded.";
    const top5 = state.layers.slice(0, 8).map(l => `  ${l.name} — ${formatParams(l.total_params)} params`).join("<br>");
    return `**Top layers by parameter count:**<br><br>${top5}`;
  }

  if (lower.includes("redundan") || lower.includes("dead") || lower.includes("removable")) {
    if (!state.model) return "Load a model first to analyze redundant weights.";
    const smallTensors = state.tensors.filter(t => t.param_count < 1000).length;
    const totalTensors = state.tensors.length;
    return `**Redundancy Analysis:**<br><br>` +
      `• ${totalTensors} total tensors<br>` +
      `• ${smallTensors} small tensors (< 1K params)<br>` +
      `• Recommended: Run unlearning with **Retain-Aware** method to automatically identify and remove dead neurons.<br><br>` +
      `Switch to the **Unlearn** tab and select your target capability to begin.`;
  }

  if (lower.includes("unlearn") || lower.includes("forget") || lower.includes("erase") || lower.includes("delete")) {
    if (!state.model) return "Load a model first, then go to the **Unlearn** tab to configure and start unlearning.";
    return `**Ready to unlearn!**<br><br>` +
      `Go to the **Unlearn** tab and:<br>` +
      `1. Select a **target capability** (e.g., Python, JavaScript)<br>` +
      `2. Choose **Retain-Aware** method (recommended)<br>` +
      `3. Set training steps (200 is a good default)<br>` +
      `4. Click **Start Unlearning**<br><br>` +
      `I'll show you real-time loss curves and progress as the model unlearns.`;
  }

  if (lower.includes("heatmap") || lower.includes("weight distribution") || lower.includes("visualiz")) {
    if (!state.model) return "Load a model first, then switch to the **Heatmap** tab.";
    return `Switch to the **Heatmap** tab to see weight distributions. Select any tensor from the dropdown to view its heatmap.<br><br>` +
      `You can also click tensors in the **Model Explorer** sidebar to see detailed statistics in the Properties panel.`;
  }

  if (lower.includes("method") || lower.includes("which method") || lower.includes("best method")) {
    return `**Unlearning Methods:**<br><br>` +
      `• **Retain-Aware** (recommended) — Forgets target while preserving other knowledge. Uses both forget loss and retain loss.<br>` +
      `• **Gradient Forgetting** — Simple baseline that maximizes loss on target. May cause more collateral damage.<br><br>` +
      `Retain-Aware is almost always the better choice. Use a **retain weight** of 1.5–3.0 for best results.`;
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey! 👋 I'm your AI assistant for model unloading and analysis. Load a model and ask me anything about it.`;
  }

  if (lower.includes("help")) {
    return `**Available commands:**<br><br>` +
      `• "Tell me about the model" — Model summary<br>` +
      `• "List layers" — Show all layers<br>` +
      `• "Analyze redundancy" — Find removable weights<br>` +
      `• "Show heatmap" — Weight visualization<br>` +
      `• "Which method should I use?" — Method recommendations<br>` +
      `• "Start unlearning" — How to begin unlearning<br>` +
      `• "Export model" — Save the modified model`;
  }

  if (lower.includes("export") || lower.includes("save")) {
    if (!state.model) return "Load and modify a model first, then use **File > Export** or the export button to save.";
    return `To export your modified model:<br><br>` +
      `1. Run the unlearning process in the **Unlearn** tab<br>` +
      `2. Click **File > Export** in the menu bar<br>` +
      `3. Choose format: `.safetensors` (recommended) or `.pt`<br>` +
      `4. Select save location<br><br>` +
      `The exported model will contain the modified weights with the target capability unlearned.`;
  }

  // Default response
  return `I can help with model analysis and unlearning. Try asking:<br><br>` +
    `• "Tell me about the model"<br>` +
    `• "Which method should I use?"<br>` +
    `• "Start unlearning"<br>` +
    `• "Help" for all commands`;
}

// ══════════════════════════════════════════
// RESOURCE MONITOR
// ══════════════════════════════════════════

let resourceMonitorInterval = null;

function initResourceMonitor() {
  // Poll resource usage every 3 seconds
  resourceMonitorInterval = setInterval(async () => {
    if (!state.backendReady) return;
    try {
      const usage = await API.rpc("device_monitor");
      if (usage.error) return;

      const cpuBar = document.getElementById("cpu-bar");
      const cpuVal = document.getElementById("cpu-val");
      const ramBar = document.getElementById("ram-bar");
      const ramVal = document.getElementById("ram-val");

      if (cpuBar) {
        cpuBar.style.width = `${usage.cpu_percent}%`;
        cpuBar.className = `resource-bar-fill${usage.cpu_percent > 80 ? " high" : ""}`;
      }
      if (cpuVal) cpuVal.textContent = `${Math.round(usage.cpu_percent)}%`;
      if (ramBar) {
        ramBar.style.width = `${usage.ram_percent}%`;
        ramBar.className = `resource-bar-fill${usage.ram_percent > 80 ? " high" : ""}`;
      }
      if (ramVal) ramVal.textContent = `${usage.ram_used_gb}/${usage.ram_total_gb}GB`;
    } catch (e) {
      // ignore
    }
  }, 3000);
}

// ── Window resize ──
window.addEventListener("resize", () => {
  if (state.model) {
    renderModelCanvas();
    if (document.getElementById("panel-heatmap").classList.contains("active")) renderHeatmap();
  }
  renderUnlearnCanvas();
});
