"use client";

import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowRight, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, Zap,
} from "lucide-react";

/* ════════════ HERO ════════════ */
function Hero() {
  return (
    <section className="bg-[#f0ff00] border-b-2 border-black">
      <div className="container mx-auto pt-28 pb-20">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-black rounded-none" />
          <span className="text-xs font-mono font-bold uppercase tracking-[0.15em] text-black/60">
            Open Research Platform — v1.0
          </span>
        </div>

        {/* Headline */}
        <div className="max-w-4xl">
          <h1 className="text-[clamp(2.8rem,5vw,5rem)] font-black leading-[1.0] tracking-tighter text-black mb-2">
            Selectively<br />
            <span className="bg-black text-[#f0ff00] px-3 inline-block my-1">UNLEARN</span><br />
            AI Models.
          </h1>

          <p className="mt-8 text-lg font-medium text-black/70 max-w-xl leading-relaxed">
            A production platform for{" "}
            <span className="font-bold text-black border-b-2 border-black">measured capability reduction</span>{" "}
            in language models. Forget what you need to. Keep what matters.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/signup" className="btn-primary">
              Start Experimenting <ArrowRight size={14} />
            </Link>
            <Link href="/#how-it-works" className="btn-outline">
              See How It Works
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-20 pt-8 border-t-2 border-black/20 grid grid-cols-2 md:grid-cols-4 gap-px bg-black/10">
          {[
            { value: "20+", label: "Probe Categories" },
            { value: "89", label: "Evaluation Probes" },
            { value: "2", label: "Unlearning Methods" },
            { value: "5", label: "Languages Supported" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#f0ff00] px-6 py-5">
              <div className="text-3xl font-black font-mono tracking-tight">{stat.value}</div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-black/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════ PROBLEM ════════════ */
function ProblemSection() {
  return (
    <section className="py-24 bg-white border-b-2 border-black">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-start">
          {/* Left */}
          <div>
            <span className="section-label">The Problem</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-6">
              AI Models<br />
              <span className="relative inline-block mt-1">
                Can't Forget.
                <span className="absolute bottom-0 left-0 right-0 h-[6px] bg-[#f0ff00] -z-10" />
              </span>
            </h2>
            <p className="text-base text-black/60 leading-relaxed max-w-sm">
              Once trained, models permanently encode their training data. There's currently no clean way to selectively remove specific knowledge.
            </p>
          </div>

          {/* Right */}
          <div className="space-y-3">
            {[
              { num: "01", text: "Models memorize training data permanently" },
              { num: "02", text: "No built-in mechanism to forget specific knowledge" },
              { num: "03", text: "Retraining from scratch is expensive and wasteful" },
              { num: "04", text: "Privacy regulations demand the right to erasure" },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-5 p-5 border-2 border-black hover:bg-[#f0ff00] hover:-translate-x-1 hover:shadow-[4px_4px_0_0_#000] transition-all group">
                <span className="text-xs font-mono font-bold text-black/30 group-hover:text-black/60 shrink-0 w-6">{item.num}</span>
                <span className="text-sm font-semibold uppercase tracking-wide leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ HOW IT WORKS ════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", icon: "📤", title: "Upload Model", desc: "Upload any open-weight model. System validates architecture, extracts metadata, checks GPU requirements.", tag: "safetensors · HuggingFace" },
    { num: "02", icon: "🔍", title: "Explore Capabilities", desc: "Run controlled probing experiments across 20 categories and 89 probes to establish a baseline.", tag: "89 probes · 20 categories" },
    { num: "03", icon: "🎯", title: "Select Target", desc: "Choose what to unlearn. In V1, we focus on Python — measuring its reduction while preserving other languages.", tag: "Python → JS · TS · C++" },
    { num: "04", icon: "🧠", title: "Run Unlearning", desc: "Choose gradient-based forgetting or retain-aware unlearning. Dual objective: forget target, preserve capabilities.", tag: "gradient ascent + descent" },
    { num: "05", icon: "🔬", title: "Verify Results", desc: "Re-run the same evaluation suite. Compare before/after across all capabilities with robustness testing.", tag: "paraphrases · indirect · code" },
    { num: "06", icon: "📊", title: "Review Report", desc: "Comprehensive report: forgetting achievement, retention score, collateral damage, and a final verdict.", tag: "PASS · REVIEW · FAIL" },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#f5f5f0] border-b-2 border-black">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <span className="section-label">Process</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              How It Works
            </h2>
          </div>
          <p className="text-sm font-mono text-black/50 max-w-xs text-right leading-relaxed hidden md:block">
            Six steps from upload to<br />verified unlearning.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step) => (
            <div key={step.num} className="card p-6 bg-white flex flex-col">
              <div className="flex items-start justify-between mb-5">
                <span className="text-2xl">{step.icon}</span>
                <span className="text-xs font-mono font-bold text-black/20">{step.num}</span>
              </div>
              <h3 className="text-base font-black uppercase tracking-wide mb-3 bg-[#f0ff00] inline-block self-start px-2 py-0.5 text-sm">
                {step.title}
              </h3>
              <p className="text-sm text-black/60 leading-relaxed flex-grow mb-4">{step.desc}</p>
              <div className="text-[10px] font-mono font-bold bg-black text-white px-3 py-1.5 uppercase tracking-widest self-start">
                {step.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════ PIPELINE ════════════ */
function VisualPipeline() {
  return (
    <section className="py-24 bg-white border-b-2 border-black">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <span className="section-label">Architecture</span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">The Scientific Loop</h2>
        </div>

        <div className="grid lg:grid-cols-3 border-2 border-black shadow-[6px_6px_0_0_#000] max-w-5xl mx-auto">
          {[
            {
              phase: "01", title: "Baseline", bg: "bg-white",
              items: ["Load original model", "Run 89 probes", "Measure Python: 50%", "Measure JS/TS/C++: 75%"],
              Icon: CheckCircle2,
            },
            {
              phase: "02", title: "Unlearn", bg: "bg-[#f0ff00]",
              items: ["Gradient ascent on Python", "Gradient descent on retain", "Optimize dual objective", "Save new model version"],
              Icon: Zap,
            },
            {
              phase: "03", title: "Verify", bg: "bg-white",
              items: ["Re-run same 89 probes", "Python: 50% → 0%", "JS/TS/C++: Preserved", "Verdict: PASS"],
              Icon: BarChart3,
            },
          ].map((phase, i) => (
            <div key={phase.phase} className={`${phase.bg} p-8 ${i < 2 ? "border-r-2 border-black" : ""}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase tracking-wide">{phase.title}</h3>
                <span className="text-xs font-mono font-bold text-black/30">Phase {phase.phase}</span>
              </div>
              <div className="space-y-2">
                {phase.items.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-medium text-black/70 py-2 border-b border-black/10 last:border-0">
                    <phase.Icon size={14} className="shrink-0 text-black/50" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-4 text-sm font-mono font-bold uppercase tracking-widest bg-black text-white px-6 py-3">
            <span>Original</span>
            <ArrowRight size={16} className="text-[#f0ff00]" />
            <span className="text-[#f0ff00]">Unlearned</span>
            <ArrowRight size={16} className="text-[#f0ff00]" />
            <span>v2.0</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ FEATURES ════════════ */
function Features() {
  const features = [
    { icon: Shield, title: "Evidence-Based", desc: "No internal weight claims. All results come from controlled probing with measurable outcomes." },
    { icon: GitBranch, title: "Version Control", desc: "Every operation creates a new model version. Original models are never overwritten." },
    { icon: Layers, title: "Dual Objective", desc: "Retain-aware unlearning balances forgetting and preservation with weighted loss." },
    { icon: Cpu, title: "GPU Workers", desc: "Isolated Celery workers handle GPU-intensive tasks asynchronously." },
    { icon: Database, title: "Full Provenance", desc: "Model hashes, hyperparameters, seeds — every experiment is fully reproducible." },
    { icon: FlaskConical, title: "Robustness Testing", desc: "Tests paraphrases, indirect prompts, and code completion to verify forgetting holds." },
  ];

  return (
    <section id="features" className="py-24 bg-[#f5f5f0] border-b-2 border-black">
      <div className="container mx-auto">
        <div className="mb-14">
          <span className="section-label">Capabilities</span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Built for Research</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="card p-7 bg-white group hover:bg-black hover:text-white">
              <div className="w-10 h-10 bg-[#f0ff00] border-2 border-black flex items-center justify-center mb-5 group-hover:bg-white transition-colors">
                <f.icon size={18} className="stroke-[2.5px]" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wide mb-2">{f.title}</h3>
              <p className="text-sm text-black/60 group-hover:text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════ RESULTS ════════════ */
function Results() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "−50.0%", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0%", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0%", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0%", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0%", isTarget: false },
  ];

  return (
    <section className="py-24 bg-[#f0ff00] border-b-2 border-black">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-14 items-start">
          {/* Left */}
          <div>
            <span className="section-label">Proof of Concept</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Real Results.</h2>
            <p className="text-sm font-mono text-black/60 leading-relaxed mb-6">
              Tested on{" "}
              <span className="bg-black text-white px-2 py-0.5 font-mono text-xs">Salesforce/codegen-350M</span>.
              <br /><br />
              Python capability reduced to zero while other languages remain fully intact.
            </p>
            <div className="flex items-center gap-3 p-4 bg-white border-2 border-black">
              <CheckCircle2 size={20} className="shrink-0" />
              <div>
                <div className="text-sm font-black uppercase tracking-wide">Verdict: PASS</div>
                <div className="text-xs text-black/50 font-mono mt-0.5">Low collateral damage</div>
              </div>
            </div>
          </div>

          {/* Right: table */}
          <div className="border-2 border-black shadow-[6px_6px_0_0_#000] bg-white">
            <div className="grid grid-cols-4 bg-black text-white text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 border-black">
              <div className="p-3 border-r-2 border-white/20">Capability</div>
              <div className="p-3 border-r-2 border-white/20 text-center">Before</div>
              <div className="p-3 border-r-2 border-white/20 text-center">After</div>
              <div className="p-3 text-center">Δ</div>
            </div>
            {results.map((r) => (
              <div
                key={r.cap}
                className={`grid grid-cols-4 border-b border-black/10 last:border-0 ${r.isTarget ? "bg-[#fff0f0]" : ""}`}
              >
                <div className="p-3 border-r border-black/10 text-sm font-bold flex items-center gap-2">
                  {r.isTarget && <Target size={12} className="text-[#dc2626] shrink-0" />}
                  {r.cap}
                </div>
                <div className="p-3 border-r border-black/10 text-center text-sm font-mono">{r.before}</div>
                <div className="p-3 border-r border-black/10 text-center text-sm font-mono">{r.after}</div>
                <div className={`p-3 text-center text-sm font-mono font-bold ${r.isTarget ? "text-[#dc2626]" : "text-black/40"}`}>{r.delta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ RESEARCH ════════════ */
function ResearchSection() {
  return (
    <section id="research" className="py-24 bg-white border-b-2 border-black">
      <div className="container mx-auto">
        <div className="mb-14 text-center">
          <span className="section-label">Transparency</span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">What This Is (And Isn't)</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="p-8 border-2 border-black bg-[#f5f5f0]">
            <h3 className="text-base font-black uppercase tracking-wide mb-6 flex items-center gap-2">
              <CheckCircle2 size={16} /> What We Do
            </h3>
            <ul className="space-y-4">
              {[
                "Gradient-based model editing to reduce specific capabilities",
                "Controlled probing to measure observed capability changes",
                "Retain-aware optimization to preserve unrelated skills",
                "Robustness testing against prompt rewording",
                "Full reproducibility with provenance tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-black/70 leading-relaxed">
                  <span className="font-black mt-0.5 text-black shrink-0">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 border-2 border-black bg-black text-white">
            <h3 className="text-base font-black uppercase tracking-wide mb-6 flex items-center gap-2">
              <XCircle size={16} /> What We Don't Claim
            </h3>
            <ul className="space-y-4">
              {[
                "We do NOT inspect internal model weights or knowledge",
                "We do NOT claim complete knowledge deletion",
                "We do NOT guarantee theoretical machine unlearning",
                "Results are empirical, measured through experiments",
                "Residual capability may exist beyond probe coverage",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/60 leading-relaxed">
                  <span className="font-black mt-0.5 text-[#f0ff00] shrink-0">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ CTA ════════════ */
function CTASection() {
  return (
    <section className="py-32 bg-[#f5f5f0] border-b-2 border-black">
      <div className="container mx-auto text-center">
        <span className="section-label">Get Started</span>
        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
          Ready to Unlearn?
        </h2>
        <p className="text-base text-black/60 max-w-lg mx-auto leading-relaxed mb-10">
          Upload a model. Establish a baseline. Run unlearning. Verify results.
          Start experimenting for free today.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/signup" className="btn-primary">
            Get Started Free <ArrowRight size={14} />
          </Link>
          <Link href="/#how-it-works" className="btn-outline">
            See How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════════ FOOTER ════════════ */
function Footer() {
  return (
    <footer className="py-10 bg-black text-white">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#f0ff00] flex items-center justify-center">
            <span className="text-black font-black text-xs">N</span>
          </div>
          <span className="font-black text-base tracking-tight">NULLMIND</span>
        </div>
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest text-center">
          Built with PyTorch · HuggingFace · FastAPI · Next.js
        </p>
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
          © 2026 NullMind
        </p>
      </div>
    </footer>
  );
}

/* ════════════ PAGE ════════════ */
export default function Home() {
  return (
    <main className="pt-[64px]">
      <Header />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <VisualPipeline />
      <Features />
      <Results />
      <ResearchSection />
      <CTASection />
      <Footer />
    </main>
  );
}
