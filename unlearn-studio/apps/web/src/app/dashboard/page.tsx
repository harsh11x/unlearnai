"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload, Play, BarChart3, Settings, Brain,
  ChevronRight, Eye, CheckCircle2,
  Terminal, Target, ArrowRight,
} from "lucide-react";

type Tab = "upload" | "explore" | "configure" | "train" | "results";

/* ─── Sidebar ─── */
function Sidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "upload", icon: Upload, label: "Upload" },
    { id: "explore", icon: Eye, label: "Explore" },
    { id: "configure", icon: Settings, label: "Configure" },
    { id: "train", icon: Brain, label: "Train" },
    { id: "results", icon: BarChart3, label: "Results" },
  ];

  return (
    <aside className="w-16 lg:w-56 border-r border-border-strong bg-bg-alt flex flex-col shrink-0">
      <div className="p-4 border-b border-border-strong hidden lg:block">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-ink-subtle mb-1">Workspace</div>
        <div className="font-semibold text-sm text-ink truncate">My Project</div>
      </div>
      <nav className="flex-1 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white/[0.06] text-ink border-r-2 border-highlight"
                : "text-ink-subtle hover:text-ink hover:bg-white/[0.03]"
            }`}
          >
            <tab.icon size={17} />
            <span className="text-sm font-medium hidden lg:block">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border-strong hidden lg:block">
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span>GPU Ready</span>
        </div>
      </div>
    </aside>
  );
}

/* ─── Top Bar ─── */
function TopBar({ activeTab }: { activeTab: Tab }) {
  const titles: Record<Tab, string> = {
    upload: "Upload Model", explore: "Capability Explorer",
    configure: "Unlearning Config", train: "Training", results: "Results",
  };

  return (
    <header className="h-14 border-b border-border-strong bg-bg-alt/80 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="font-mono text-ink-subtle text-xs">nullmind</span>
        <ChevronRight size={12} className="text-ink-subtle" />
        <span className="font-semibold text-ink">{titles[activeTab]}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
        <span className="text-[#0a0f1a] text-xs font-bold">H</span>
      </div>
    </header>
  );
}

/* ─── Upload Tab ─── */
function UploadTab({ model, onModelUpload }: { model: { name: string; architecture: string; params: string; format: string; size: string; hash: string } | null; onModelUpload: (m: typeof model) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    setUploading(true);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 40));
      setProgress(i);
    }
    onModelUpload({ name: "codegen-350M-multi", architecture: "CodeGenForCausalLM", params: "304.1M", format: "safetensors", size: "760 MB", hash: "f8d24b7b..." });
    setUploading(false);
  };

  if (model) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={22} className="text-success" />
          <h2 className="text-2xl font-bold text-ink">Model Ready</h2>
        </div>
        <div className="rounded-xl border border-border-strong overflow-hidden bg-bg-card">
          <div className="px-5 py-3 bg-white/[0.02] border-b border-border-strong text-xs font-semibold uppercase tracking-widest text-ink-subtle">Model Information</div>
          <div className="divide-y divide-border-strong/50">
            {[["Name", model.name], ["Architecture", model.architecture], ["Parameters", model.params], ["Format", model.format], ["Size", model.size], ["Hash", model.hash]].map(([l, v]) => (
              <div key={l} className="grid grid-cols-[140px_1fr] px-5 py-3">
                <span className="text-xs font-mono text-ink-subtle uppercase">{l}</span>
                <span className="text-sm font-mono text-ink">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-ink">Upload Model</h2>
      <p className="text-ink-muted text-sm">Upload an open-weight language model to get started.</p>
      <div
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
          dragOver ? "border-highlight bg-white/[0.02]" : "border-border-strong hover:border-ink-subtle"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
        onClick={handleUpload}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="font-semibold text-lg text-ink">Uploading...</div>
            <div className="w-64 mx-auto h-1.5 bg-border-strong rounded-full overflow-hidden">
              <div className="h-full bg-highlight transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="font-mono text-xs text-ink-subtle">{progress}%</div>
          </div>
        ) : (
          <>
            <Upload size={40} className="text-ink-subtle mx-auto mb-4" />
            <div className="font-semibold text-lg text-ink mb-1">Drop model here or click to browse</div>
            <div className="text-ink-muted text-sm">.safetensors · .bin · HuggingFace directories</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Explore Tab ─── */
function ExploreTab() {
  const cats = [
    { name: "Syntax", score: 50 }, { name: "Functions", score: 75 }, { name: "Classes", score: 25 },
    { name: "Iterators", score: 67 }, { name: "Generators", score: 33 }, { name: "Decorators", score: 67 },
    { name: "Debugging", score: 33 }, { name: "Algorithms", score: 29 },
  ];
  const retain = [
    { name: "JavaScript", score: 50 }, { name: "TypeScript", score: 100 },
    { name: "C++", score: 75 }, { name: "General Prog.", score: 17 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Capability Explorer</h2>
          <p className="text-ink-muted text-sm mt-1">89 probes · 24 categories</p>
        </div>
        <button className="btn-primary text-xs px-5 py-2.5"><Play size={14} /> Run Evaluation</button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><Target size={14} className="text-highlight" /><span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">Python (Target)</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cats.map((c) => (
            <div key={c.name} className="border border-border-strong rounded-xl p-4 bg-bg-card hover:border-ink-subtle transition-all">
              <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-ink">{c.name}</span><span className="font-mono text-xs text-ink-subtle">{c.score}%</span></div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full bg-highlight rounded-full" style={{ width: `${c.score}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={14} className="text-success" /><span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">Retained</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {retain.map((c) => (
            <div key={c.name} className="border border-border-strong rounded-xl p-4 bg-bg-card">
              <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-ink">{c.name}</span><span className="font-mono text-xs text-ink-subtle">{c.score}%</span></div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full bg-success rounded-full" style={{ width: `${c.score}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-xl border border-border-strong bg-bg-card flex items-center justify-between">
        <span className="font-semibold text-ink">Overall Score</span>
        <span className="text-2xl font-bold text-ink">40.4%</span>
      </div>
    </div>
  );
}

/* ─── Configure Tab ─── */
function ConfigureTab({ onTrain }: { onTrain: () => void }) {
  const [method, setMethod] = useState<"retain_aware" | "gradient">("retain_aware");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-ink">Configuration</h2>

      <div className="rounded-xl border border-border-strong bg-bg-card">
        <div className="px-5 py-3 border-b border-border-strong text-xs font-semibold uppercase tracking-widest text-ink-subtle">Target</div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Python", "JavaScript", "TypeScript", "C++"].map((l) => (
            <button key={l} className={`border rounded-lg py-2.5 text-sm font-medium transition-all ${l === "Python" ? "border-highlight bg-highlight/10 text-highlight" : "border-border-strong text-ink-subtle hover:border-ink-subtle"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-strong bg-bg-card">
        <div className="px-5 py-3 border-b border-border-strong text-xs font-semibold uppercase tracking-widest text-ink-subtle">Method</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ id: "retain_aware" as const, name: "Retain-Aware", desc: "Balances forgetting with preservation." }, { id: "gradient" as const, name: "Gradient Forgetting", desc: "Simple baseline without retention." }].map((m) => (
            <button key={m.id} onClick={() => setMethod(m.id)} className={`border-2 p-4 text-left rounded-xl transition-all ${method === m.id ? "border-highlight bg-highlight/5" : "border-border-strong hover:border-ink-subtle"}`}>
              <div className="font-semibold text-sm text-ink mb-1">{m.name}</div>
              <div className="text-ink-muted text-xs">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-strong bg-bg-card">
        <div className="px-5 py-3 border-b border-border-strong text-xs font-semibold uppercase tracking-widest text-ink-subtle">Hyperparameters</div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ l: "Learning Rate", v: "1e-5" }, { l: "Steps", v: "200" }, { l: "Batch Size", v: "2" }, { l: "Retain Weight", v: "2.0" }].map((p) => (
            <div key={p.l}>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-ink-subtle block mb-1.5">{p.l}</label>
              <div className="bg-white/[0.03] border border-border-strong rounded-lg px-3 py-2 text-sm font-mono text-ink">{p.v}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onTrain} className="btn-primary w-full justify-center py-3.5"><Play size={16} /> Start Unlearning</button>
    </div>
  );
}

/* ─── Train Tab ─── */
function TrainTab() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  const start = async () => {
    setRunning(true);
    for (let i = 0; i <= 200; i += 10) {
      await new Promise((r) => setTimeout(r, 80));
      setStep(i);
    }
    setRunning(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Training</h2>
        {!running && step === 0 && <button onClick={start} className="btn-primary text-xs px-5 py-2.5"><Play size={14} /> Start</button>}
      </div>

      <div className="rounded-xl border border-border-strong bg-bg-card p-5">
        <div className="flex justify-between mb-3 text-sm">
          <span className="font-semibold text-ink">{running ? "Training..." : step > 0 ? "Complete" : "Ready"}</span>
          <span className="font-mono text-ink-subtle text-xs">{step}/200</span>
        </div>
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${running ? "bg-highlight" : step > 0 ? "bg-success" : "bg-border-strong"}`} style={{ width: `${(step / 200) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: "Forget Loss", v: "52.88", c: "text-highlight" }, { l: "Retain Loss", v: "28.91", c: "text-success" }, { l: "GPU Util", v: "87%", c: "text-ink" }, { l: "Elapsed", v: "3m 12s", c: "text-ink-subtle" }].map((m) => (
          <div key={m.l} className="border border-border-strong rounded-xl p-4 bg-bg-card">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-ink-subtle mb-1">{m.l}</div>
            <div className={`text-xl font-bold ${m.c}`}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border-strong bg-bg-card">
        <div className="px-5 py-3 border-b border-border-strong flex items-center gap-2">
          <Terminal size={14} className="text-success" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">Logs</span>
        </div>
        <div className="p-4 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
          {[{ t: "16:41:38", m: "Starting retain_aware unlearning" }, { t: "16:41:39", m: "Step 10: forget=29.32 retain=25.09" }, { t: "16:41:45", m: "Step 50: forget=45.12 retain=27.33" }].map((l, i) => (
            <div key={i} className="flex gap-3"><span className="text-ink-subtle shrink-0">{l.t}</span><span className="text-ink/70">{l.m}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Results Tab ─── */
function ResultsTab() {
  const results = [
    { cap: "Python", before: 50.0, after: 0.0, isTarget: true },
    { cap: "JavaScript", before: 50.0, after: 50.0, isTarget: false },
    { cap: "TypeScript", before: 100.0, after: 100.0, isTarget: false },
    { cap: "C++", before: 75.0, after: 75.0, isTarget: false },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Results</h2>
        <button className="btn-outline text-xs px-5 py-2.5">Export Report</button>
      </div>

      <div className="rounded-xl border border-border-strong overflow-hidden bg-bg-card">
        <div className="grid grid-cols-4 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
          <div className="p-4">Capability</div>
          <div className="p-4 text-center">Before</div>
          <div className="p-4 text-center">After</div>
          <div className="p-4 text-center">Change</div>
        </div>
        {results.map((r) => {
          const d = r.after - r.before;
          return (
            <div key={r.cap} className={`grid grid-cols-4 border-t border-border-strong/50 ${r.isTarget ? "bg-highlight/[0.03]" : ""}`}>
              <div className="p-4 text-sm font-semibold text-ink flex items-center gap-2">
                {r.isTarget && <Target size={13} className="text-highlight" />}{r.cap}
                {r.isTarget && <span className="text-[9px] font-mono text-highlight border border-highlight/30 px-1.5 py-0.5 rounded">TARGET</span>}
              </div>
              <div className="p-4 text-center font-mono text-sm text-ink-muted">{r.before}%</div>
              <div className="p-4 text-center font-mono text-sm text-ink-muted">{r.after}%</div>
              <div className={`p-4 text-center font-mono text-sm font-bold ${r.isTarget ? "text-highlight" : d === 0 ? "text-success" : "text-error"}`}>{d >= 0 ? "+" : ""}{d.toFixed(1)}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: "Forgetting", v: "50%", c: "text-highlight" }, { l: "Retention", v: "100%", c: "text-success" }, { l: "Collateral", v: "LOW", c: "text-success" }, { l: "Verdict", v: "PASS", c: "text-success" }].map((s) => (
          <div key={s.l} className="border border-border-strong rounded-xl p-4 bg-bg-card text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle mb-1">{s.l}</div>
            <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl border border-success/20 bg-success/[0.03] flex items-start gap-4">
        <CheckCircle2 size={22} className="text-success shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-lg text-success">Verdict: PASS</div>
          <p className="text-ink-muted text-sm mt-1">Target capability successfully reduced. Retained capabilities preserved.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [model, setModel] = useState<{ name: string; architecture: string; params: string; format: string; size: string; hash: string } | null>(null);

  return (
    <div className="h-screen flex flex-col bg-bg">
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
