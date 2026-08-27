"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload, Play, BarChart3, Settings, Brain, Database,
  ChevronRight, FileCode2, Layers, Zap, CheckCircle2,
  Clock, AlertTriangle, XCircle, Terminal, Eye, GitBranch,
  ArrowRight, Cpu, HardDrive, Trash2, Plus, Search, Bell,
  Target, Shield
} from "lucide-react";

/* ──────────── TYPES ──────────── */
type Tab = "upload" | "explore" | "configure" | "train" | "results";
type ModelStatus = "uploading" | "validating" | "ready" | "training" | "evaluating" | "error";

interface UploadedModel {
  name: string;
  architecture: string;
  params: string;
  format: string;
  size: string;
  hash: string;
  status: ModelStatus;
}

/* ──────────── SIDEBAR ──────────── */
function Sidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "upload", icon: Upload, label: "Upload" },
    { id: "explore", icon: Eye, label: "Explore" },
    { id: "configure", icon: Settings, label: "Configure" },
    { id: "train", icon: Brain, label: "Train" },
    { id: "results", icon: BarChart3, label: "Results" },
  ];

  return (
    <aside className="w-16 md:w-56 border-r-3 border-white bg-brutal-gray flex flex-col shrink-0">
      {/* Workspace header */}
      <div className="p-4 border-b-3 border-white hidden md:block">
        <div className="font-mono text-[10px] text-brutal-mid uppercase tracking-widest mb-1">Workspace</div>
        <div className="font-display font-bold text-sm truncate">My Project</div>
      </div>

      {/* Nav tabs */}
      <nav className="flex-1 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === tab.id
                ? "bg-brutal-accent text-brutal-black border-r-3 border-brutal-black"
                : "text-brutal-mid hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon size={18} />
            <span className="font-display text-sm font-semibold hidden md:block">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Status bar */}
      <div className="p-4 border-t-3 border-white hidden md:block">
        <div className="flex items-center gap-2 text-xs font-mono text-brutal-mid">
          <div className="w-2 h-2 bg-brutal-green rounded-full animate-pulse-glow" />
          <span>GPU Ready</span>
        </div>
      </div>
    </aside>
  );
}

/* ──────────── TOP BAR ──────────── */
function TopBar({ activeTab }: { activeTab: Tab }) {
  const titles: Record<Tab, string> = {
    upload: "Upload Model",
    explore: "Capability Explorer",
    configure: "Unlearning Config",
    train: "Training",
    results: "Results",
  };

  return (
    <header className="h-12 border-b-3 border-white bg-brutal-gray flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="font-mono text-xs text-brutal-mid">nullmind</div>
        <ChevronRight size={12} className="text-brutal-mid" />
        <span className="font-display text-sm font-semibold">{titles[activeTab]}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-brutal-mid hover:text-white transition-colors">
          <Bell size={16} />
        </button>
        <div className="w-7 h-7 bg-brutal-accent flex items-center justify-center">
          <span className="font-mono text-brutal-black text-xs font-bold">H</span>
        </div>
      </div>
    </header>
  );
}

/* ──────────── UPLOAD TAB ──────────── */
function UploadTab({ model, onModelUpload }: { model: UploadedModel | null; onModelUpload: (m: UploadedModel) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 50));
      setProgress(i);
    }
    onModelUpload({
      name: "codegen-350M-multi",
      architecture: "CodeGenForCausalLM",
      params: "304.1M",
      format: "safetensors",
      size: "760 MB",
      hash: "f8d24b7b15f9cb1d...",
      status: "ready",
    });
    setUploading(false);
  };

  if (model) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-brutal-green" />
            <h2 className="font-display font-bold text-2xl">Model Ready</h2>
          </div>
          <button
            onClick={() => onModelUpload(null as unknown as UploadedModel)}
            className="text-brutal-mid hover:text-brutal-accent text-sm font-mono"
          >
            Upload Different Model
          </button>
        </div>

        <div className="border-3 border-white">
          <div className="bg-brutal-accent text-brutal-black px-4 py-2 font-display font-bold text-sm uppercase tracking-wider">
            Model Information
          </div>
          <div className="divide-y divide-white/10">
            {[
              ["Name", model.name],
              ["Architecture", model.architecture],
              ["Parameters", model.params],
              ["Format", model.format],
              ["Size", model.size],
              ["Hash", model.hash],
              ["Status", model.status],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[160px_1fr] px-4 py-3">
                <span className="font-mono text-xs text-brutal-mid uppercase">{label}</span>
                <span className="font-mono text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="font-display font-bold text-2xl">Upload Model</h2>
      <p className="text-brutal-mid">Upload an open-weight language model to get started.</p>

      {/* Drop zone */}
      <div
        className={`border-3 border-dashed p-16 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-brutal-accent bg-brutal-accent/5"
            : "border-white/30 hover:border-white/60"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
        onClick={handleUpload}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="font-display font-bold text-xl">Uploading...</div>
            <div className="w-64 mx-auto h-2 bg-brutal-gray border border-white/20">
              <div
                className="h-full bg-brutal-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="font-mono text-sm text-brutal-mid">{progress}%</div>
          </div>
        ) : (
          <>
            <Upload size={48} className="text-brutal-mid mx-auto mb-4" />
            <div className="font-display font-bold text-xl mb-2">
              Drop model here or click to browse
            </div>
            <div className="text-brutal-mid text-sm">
              Supports: .safetensors, .bin, HuggingFace model directories
            </div>
          </>
        )}
      </div>

      {/* Supported formats */}
      <div className="grid grid-cols-3 gap-3">
        {[".safetensors", ".bin (PyTorch)", "HF Directory"].map((fmt) => (
          <div key={fmt} className="border border-white/10 p-3 text-center">
            <FileCode2 size={20} className="text-brutal-accent mx-auto mb-2" />
            <span className="font-mono text-xs text-brutal-mid">{fmt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────── EXPLORE TAB ──────────── */
function ExploreTab() {
  const categories = [
    { name: "Syntax", score: 50, probes: 4, color: "bg-brutal-accent" },
    { name: "Functions", score: 75, probes: 4, color: "bg-brutal-green" },
    { name: "Classes", score: 25, probes: 4, color: "bg-brutal-blue" },
    { name: "Iterators", score: 67, probes: 3, color: "bg-brutal-green" },
    { name: "Generators", score: 33, probes: 3, color: "bg-brutal-yellow" },
    { name: "Decorators", score: 67, probes: 3, color: "bg-brutal-green" },
    { name: "Debugging", score: 33, probes: 3, color: "bg-brutal-yellow" },
    { name: "Algorithms", score: 29, probes: 7, color: "bg-brutal-yellow" },
  ];

  const retainCategories = [
    { name: "JavaScript", score: 50, probes: 4 },
    { name: "TypeScript", score: 100, probes: 4 },
    { name: "C++", score: 75, probes: 4 },
    { name: "General Prog.", score: 17, probes: 6 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl">Capability Explorer</h2>
          <p className="text-brutal-mid text-sm mt-1">Observed capabilities from controlled probing (89 probes, 24 categories)</p>
        </div>
        <button className="btn-brutal bg-brutal-green text-brutal-black text-xs flex items-center gap-2">
          <Play size={14} /> Run Evaluation
        </button>
      </div>

      {/* Python capabilities */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-brutal-accent" />
          <span className="font-display font-bold text-sm uppercase tracking-wider">Python (Target)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.name} className="border border-white/10 p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm font-semibold">{cat.name}</span>
                <span className="font-mono text-xs text-brutal-mid">{cat.probes} probes</span>
              </div>
              <div className="h-2 bg-brutal-gray border border-white/10">
                <div className={`h-full ${cat.color}`} style={{ width: `${cat.score}%` }} />
              </div>
              <div className="font-mono text-xs text-brutal-mid mt-1">{cat.score}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Retain capabilities */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-brutal-green" />
          <span className="font-display font-bold text-sm uppercase tracking-wider">Retained Capabilities</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {retainCategories.map((cat) => (
            <div key={cat.name} className="border border-white/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm font-semibold">{cat.name}</span>
                <span className="font-mono text-xs text-brutal-mid">{cat.probes} probes</span>
              </div>
              <div className="h-2 bg-brutal-gray border border-white/10">
                <div className="h-full bg-brutal-green" style={{ width: `${cat.score}%` }} />
              </div>
              <div className="font-mono text-xs text-brutal-mid mt-1">{cat.score}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall score */}
      <div className="border-3 border-white p-4 bg-brutal-gray">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-lg">Overall Capability Score</span>
          <span className="font-display font-bold text-3xl text-brutal-accent">40.4%</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────── CONFIGURE TAB ──────────── */
function ConfigureTab({ onTrain }: { onTrain: () => void }) {
  const [method, setMethod] = useState<"retain_aware" | "gradient_forgetting">("retain_aware");
  const [lr, setLr] = useState("1e-5");
  const [steps, setSteps] = useState("200");
  const [batchSize, setBatchSize] = useState("2");
  const [retainWeight, setRetainWeight] = useState("2.0");

  return (
    <div className="p-6 space-y-6">
      <h2 className="font-display font-bold text-2xl">Unlearning Configuration</h2>

      {/* Target selection */}
      <div className="border-3 border-white">
        <div className="bg-brutal-accent text-brutal-black px-4 py-2 font-display font-bold text-sm uppercase tracking-wider">
          Step 1: Select Target
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Python", "JavaScript", "TypeScript", "C++"].map((lang) => (
            <button
              key={lang}
              className={`border-2 p-3 text-center font-display font-semibold text-sm transition-all ${
                lang === "Python"
                  ? "border-brutal-accent bg-brutal-accent/10 text-brutal-accent"
                  : "border-white/20 hover:border-white/40 text-brutal-mid"
              }`}
            >
              {lang}
              {lang === "Python" && <div className="text-[10px] font-mono mt-1 text-brutal-accent">SELECTED</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Method selection */}
      <div className="border-3 border-white">
        <div className="bg-brutal-gray px-4 py-2 font-display font-bold text-sm uppercase tracking-wider border-b border-white/10">
          Step 2: Choose Method
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: "retain_aware" as const,
              name: "Retain-Aware",
              desc: "Balances forgetting with preservation. Recommended for most use cases.",
              pros: ["Less collateral damage", "Preserves unrelated skills"],
              cons: ["Requires tuning weights"],
            },
            {
              id: "gradient_forgetting" as const,
              name: "Gradient Forgetting",
              desc: "Simple baseline. Maximizes loss on target without retention mechanism.",
              pros: ["Simple", "Fast"],
              cons: ["High collateral damage", "No retention preservation"],
            },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`border-2 p-4 text-left transition-all ${
                method === m.id
                  ? "border-brutal-accent bg-brutal-accent/5"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              <div className="font-display font-bold text-sm mb-1">{m.name}</div>
              <div className="text-brutal-mid text-xs mb-3">{m.desc}</div>
              <div className="flex flex-wrap gap-2">
                {m.pros.map((p) => (
                  <span key={p} className="text-[10px] font-mono bg-brutal-green/10 text-brutal-green border border-brutal-green/20 px-2 py-0.5">
                    + {p}
                  </span>
                ))}
                {m.cons.map((c) => (
                  <span key={c} className="text-[10px] font-mono bg-brutal-accent/10 text-brutal-accent border border-brutal-accent/20 px-2 py-0.5">
                    - {c}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hyperparameters */}
      <div className="border-3 border-white">
        <div className="bg-brutal-gray px-4 py-2 font-display font-bold text-sm uppercase tracking-wider border-b border-white/10">
          Step 3: Hyperparameters
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Learning Rate", value: lr, set: setLr, options: ["1e-6", "5e-6", "1e-5", "5e-5"] },
            { label: "Steps", value: steps, set: setSteps, options: ["50", "100", "200", "500"] },
            { label: "Batch Size", value: batchSize, set: setBatchSize, options: ["1", "2", "4", "8"] },
            { label: "Retain Weight", value: retainWeight, set: setRetainWeight, options: ["0.5", "1.0", "2.0", "5.0"] },
          ].map((param) => (
            <div key={param.label}>
              <label className="font-mono text-[10px] text-brutal-mid uppercase tracking-widest block mb-2">
                {param.label}
              </label>
              <select
                value={param.value}
                onChange={(e) => param.set(e.target.value)}
                className="w-full bg-brutal-gray border-2 border-white/20 px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-brutal-accent"
              >
                {param.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onTrain}
        className="w-full btn-brutal bg-brutal-accent text-brutal-black text-lg flex items-center justify-center gap-3"
      >
        <Play size={20} /> Start Unlearning
      </button>
    </div>
  );
}

/* ──────────── TRAIN TAB ──────────── */
function TrainTab() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const totalSteps = 200;

  const startTraining = async () => {
    setRunning(true);
    setStep(0);
    for (let i = 0; i <= totalSteps; i += 10) {
      await new Promise((r) => setTimeout(r, 100));
      setStep(i);
    }
    setRunning(false);
  };

  const logs = [
    { time: "16:41:38", msg: "Starting retain_aware unlearning", level: "info" },
    { time: "16:41:38", msg: "Forget samples: 20, Retain samples: 21", level: "info" },
    { time: "16:41:39", msg: "Step 10: forget=29.32 retain=25.09 lr=3.48e-06", level: "info" },
    { time: "16:41:45", msg: "Step 50: forget=45.12 retain=27.33 lr=1.23e-05", level: "info" },
    { time: "16:41:55", msg: "Step 100: forget=52.88 retain=28.91 lr=2.15e-05", level: "info" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl">Training</h2>
        {!running && step === 0 && (
          <button onClick={startTraining} className="btn-brutal bg-brutal-green text-brutal-black text-sm flex items-center gap-2">
            <Play size={14} /> Start
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="border-3 border-white">
        <div className="bg-brutal-gray px-4 py-2 border-b border-white/10 flex items-center justify-between">
          <span className="font-display font-bold text-sm uppercase tracking-wider">
            {running ? "Training..." : step > 0 ? "Complete" : "Ready"}
          </span>
          <span className="font-mono text-xs text-brutal-mid">{step}/{totalSteps} steps</span>
        </div>
        <div className="p-4">
          <div className="h-3 bg-brutal-gray border border-white/10">
            <div
              className={`h-full transition-all duration-300 ${running ? "bg-brutal-yellow" : step > 0 ? "bg-brutal-green" : "bg-brutal-mid"}`}
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Forget Loss", value: "52.88", icon: Zap, color: "text-brutal-yellow" },
          { label: "Retain Loss", value: "28.91", icon: Shield, color: "text-brutal-green" },
          { label: "GPU Util", value: "87%", icon: Cpu, color: "text-brutal-blue" },
          { label: "Elapsed", value: "3m 12s", icon: Clock, color: "text-brutal-mid" },
        ].map((m) => (
          <div key={m.label} className="border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon size={14} className={m.color} />
              <span className="font-mono text-[10px] text-brutal-mid uppercase">{m.label}</span>
            </div>
            <span className="font-display font-bold text-xl">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div className="border-3 border-white">
        <div className="bg-brutal-gray px-4 py-2 border-b border-white/10 flex items-center gap-2">
          <Terminal size={14} className="text-brutal-green" />
          <span className="font-display font-bold text-sm uppercase tracking-wider">Logs</span>
        </div>
        <div className="p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-brutal-mid shrink-0">{log.time}</span>
              <span className="text-white/80">{log.msg}</span>
            </div>
          ))}
          {running && (
            <div className="flex gap-3">
              <span className="text-brutal-mid shrink-0">now</span>
              <span className="text-brutal-yellow animate-pulse">Training in progress...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────── RESULTS TAB ──────────── */
function ResultsTab() {
  const results = [
    { cap: "Python", before: 50.0, after: 0.0, isTarget: true },
    { cap: "JavaScript", before: 50.0, after: 50.0, isTarget: false },
    { cap: "TypeScript", before: 100.0, after: 100.0, isTarget: false },
    { cap: "C++", before: 75.0, after: 75.0, isTarget: false },
    { cap: "General Prog.", before: 16.7, after: 16.7, isTarget: false },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl">Results</h2>
        <button className="btn-brutal border-white text-white text-sm">Export Report</button>
      </div>

      {/* Comparison table */}
      <div className="border-3 border-white overflow-hidden">
        <div className="grid grid-cols-4 bg-brutal-accent text-brutal-black font-display font-bold text-xs uppercase tracking-wider">
          <div className="p-3">Capability</div>
          <div className="p-3 text-center">Before</div>
          <div className="p-3 text-center">After</div>
          <div className="p-3 text-center">Change</div>
        </div>
        {results.map((r) => {
          const delta = r.after - r.before;
          return (
            <div
              key={r.cap}
              className={`grid grid-cols-4 border-t border-white/10 ${r.isTarget ? "bg-brutal-accent/5" : ""}`}
            >
              <div className="p-3 font-display text-sm font-semibold flex items-center gap-2">
                {r.isTarget && <Target size={14} className="text-brutal-accent" />}
                {r.cap}
                {r.isTarget && <span className="text-[9px] font-mono text-brutal-accent border border-brutal-accent px-1">TARGET</span>}
              </div>
              <div className="p-3 text-center font-mono text-sm">{r.before.toFixed(1)}%</div>
              <div className="p-3 text-center font-mono text-sm">{r.after.toFixed(1)}%</div>
              <div className={`p-3 text-center font-mono text-sm font-bold ${r.isTarget ? "text-brutal-accent" : delta === 0 ? "text-brutal-green" : "text-brutal-yellow"}`}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Forgetting", value: "50%", color: "text-brutal-accent" },
          { label: "Retention", value: "100%", color: "text-brutal-green" },
          { label: "Collateral", value: "LOW", color: "text-brutal-green" },
          { label: "Verdict", value: "PASS", color: "text-brutal-green" },
        ].map((s) => (
          <div key={s.label} className="border border-white/10 p-4 text-center">
            <div className="font-mono text-[10px] text-brutal-mid uppercase mb-1">{s.label}</div>
            <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Verdict banner */}
      <div className="border-3 border-brutal-green p-6 bg-brutal-green/5">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={24} className="text-brutal-green" />
          <span className="font-display font-bold text-2xl text-brutal-green">VERDICT: PASS</span>
        </div>
        <p className="text-brutal-mid text-sm">
          Target capability successfully reduced (50% → 0%). Retained capabilities preserved. Low collateral damage. Experiment reproducible with full provenance.
        </p>
      </div>
    </div>
  );
}

/* ──────────── MAIN DASHBOARD ──────────── */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [model, setModel] = useState<UploadedModel | null>(null);

  return (
    <div className="h-screen flex flex-col">
      <TopBar activeTab={activeTab} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          {activeTab === "upload" && <UploadTab model={model} onModelUpload={setModel} />}
          {activeTab === "explore" && <ExploreTab />}
          {activeTab === "configure" && <ConfigureTab onTrain={() => setActiveTab("train")} />}
          {activeTab === "train" && <TrainTab />}
          {activeTab === "results" && <ResultsTab />}
        </main>
      </div>
    </div>
  );
}
