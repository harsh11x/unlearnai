"use client";

import Link from "next/link";
import Header from "@/components/Header";
import {
  Upload, Brain, FlaskConical, BarChart3, Shield, GitBranch,
  ChevronDown, ArrowRight, Zap, Eye, Target, CheckCircle2,
  XCircle, AlertTriangle, Database, Cpu, Layers
} from "lucide-react";

/* ──────────── HERO ──────────── */
function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 grid-bg relative">
      <div className="max-w-[1400px] mx-auto w-full">
        {/* Top tag */}
        <div className="inline-flex items-center gap-2 border border-brutal-accent px-4 py-2 mb-8">
          <div className="w-2 h-2 bg-brutal-accent rounded-full animate-pulse-glow" />
          <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">
            Open Research Platform — v1.0
          </span>
        </div>

        {/* Main headline */}
        <h1 className="font-display font-bold text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight mb-8">
          SELECTIVELY
          <br />
          <span className="text-gradient">UNLEARN</span>
          <br />
          AI MODELS
        </h1>

        <p className="font-body text-xl md:text-2xl text-brutal-mid max-w-2xl mb-12 leading-relaxed">
          A production platform for <span className="text-white font-semibold">measured capability reduction</span> in
          language models. Forget what you need to. Keep what matters.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 mb-16">
          <Link
            href="/signup"
            className="btn-brutal bg-brutal-accent text-brutal-black text-lg flex items-center gap-3"
          >
            Get Started <ArrowRight size={20} />
          </Link>
          <Link
            href="/#how-it-works"
            className="btn-brutal text-white text-lg"
          >
            See How It Works
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px border border-white/20">
          {[
            { label: "Probe Categories", value: "20+", icon: Target },
            { label: "Evaluation Probes", value: "89", icon: FlaskConical },
            { label: "Unlearning Methods", value: "2", icon: Brain },
            { label: "Languages Supported", value: "5", icon: Database },
          ].map((stat) => (
            <div key={stat.label} className="bg-brutal-gray p-6 flex items-center gap-4">
              <stat.icon size={24} className="text-brutal-accent shrink-0" />
              <div>
                <div className="font-display font-bold text-2xl">{stat.value}</div>
                <div className="font-mono text-xs text-brutal-mid uppercase">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-16">
          <ChevronDown size={32} className="text-brutal-mid animate-bounce" />
        </div>
      </div>
    </section>
  );
}

/* ──────────── PROBLEM ──────────── */
function ProblemSection() {
  return (
    <section className="py-24 px-6 border-t-3 border-white">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">The Problem</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-6 leading-tight">
              AI Models<br />
              <span className="text-brutal-accent">Can&apos;t Forget</span>
            </h2>
            <p className="text-brutal-mid text-lg leading-relaxed">
              Once trained, language models permanently encode their training data.
              They can reproduce copyrighted code, leak private information, and
              generate harmful content — with no way to selectively remove
              specific knowledge.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: AlertTriangle, text: "Models memorize training data permanently" },
              { icon: AlertTriangle, text: "No built-in mechanism to forget specific knowledge" },
              { icon: AlertTriangle, text: "Retraining from scratch is expensive and wasteful" },
              { icon: AlertTriangle, text: "Privacy regulations demand right to erasure" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 border border-white/10 p-4">
                <item.icon size={20} className="text-brutal-accent shrink-0 mt-0.5" />
                <span className="text-white/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── HOW IT WORKS ──────────── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Upload,
      title: "Upload Model",
      desc: "Upload any open-weight model (safetensors, bin, HuggingFace Hub). The system validates architecture, extracts metadata, and checks GPU requirements.",
      detail: "Supports GPT-2, CodeGen, LLaMA, Mistral, and more.",
      color: "text-brutal-accent",
    },
    {
      num: "02",
      icon: Eye,
      title: "Explore Capabilities",
      desc: "Run controlled probing experiments across 20 categories and 89 probes to establish an evidence-based baseline of what the model can do.",
      detail: "Scores represent observed capability, not internal knowledge.",
      color: "text-brutal-green",
    },
    {
      num: "03",
      icon: Target,
      title: "Select Target",
      desc: "Choose what to unlearn. In V1, we focus on Python — measuring its reduction while preserving JavaScript, TypeScript, C++, and general programming.",
      detail: "Extensible to any domain: languages, APIs, documents.",
      color: "text-brutal-blue",
    },
    {
      num: "04",
      icon: Brain,
      title: "Run Unlearning",
      desc: "Choose between gradient-based forgetting baseline or retain-aware unlearning. The system optimizes a dual objective: forget the target while preserving other capabilities.",
      detail: "total_loss = -forget_weight × forget_loss + retain_weight × retain_loss",
      color: "text-brutal-yellow",
    },
    {
      num: "05",
      icon: FlaskConical,
      title: "Verify Results",
      desc: "Re-run the exact same evaluation suite against both original and unlearned models. Compare before/after across all capabilities with robustness testing.",
      detail: "Tests paraphrases, indirect prompts, and code completion.",
      color: "text-brutal-accent",
    },
    {
      num: "06",
      icon: BarChart3,
      title: "Review Report",
      desc: "Get a comprehensive report: forgetting achievement, retention score, collateral damage, robustness, and a final verdict (PASS / PASS WITH REVIEW / FAIL).",
      detail: "Every result is reproducible with full provenance tracking.",
      color: "text-brutal-green",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 border-t-3 border-white">
      <div className="max-w-[1400px] mx-auto">
        <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">Process</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-16">
          How It Works
        </h2>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="grid md:grid-cols-[80px_1fr_1fr] gap-6 border-t border-white/10 py-10 group hover:bg-white/[0.02] transition-colors"
            >
              <div className={`font-display font-bold text-5xl ${step.color}`}>
                {step.num}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <step.icon size={24} className={step.color} />
                  <h3 className="font-display font-bold text-2xl">{step.title}</h3>
                </div>
                <p className="text-brutal-mid leading-relaxed">{step.desc}</p>
              </div>
              <div className="flex items-center">
                <div className="border border-white/10 p-4 bg-brutal-gray font-mono text-sm text-brutal-mid">
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── VISUAL PIPELINE ──────────── */
function VisualPipeline() {
  return (
    <section className="py-24 px-6 border-t-3 border-white bg-brutal-gray">
      <div className="max-w-[1400px] mx-auto">
        <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">Architecture</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-16">
          The Scientific Loop
        </h2>

        {/* Pipeline visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-3 border-white">
          {/* Before */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-white">
            <div className="font-mono text-xs text-brutal-accent mb-4 uppercase tracking-widest">Phase 1</div>
            <h3 className="font-display font-bold text-xl mb-4">Baseline</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brutal-green" />
                <span>Load original model</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brutal-green" />
                <span>Run 89 probes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brutal-green" />
                <span>Measure Python: <span className="text-brutal-green font-bold">50%</span></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brutal-green" />
                <span>Measure JS/TS/C++: <span className="text-brutal-green font-bold">75%</span></span>
              </div>
            </div>
          </div>

          {/* Unlearning */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-white bg-brutal-black/50">
            <div className="font-mono text-xs text-brutal-yellow mb-4 uppercase tracking-widest">Phase 2</div>
            <h3 className="font-display font-bold text-xl mb-4">Unlearn</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-brutal-yellow" />
                <span>Gradient ascent on Python</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-brutal-yellow" />
                <span>Gradient descent on retain</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-brutal-yellow" />
                <span>Optimize dual objective</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-brutal-yellow" />
                <span>Save new model version</span>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="p-8">
            <div className="font-mono text-xs text-brutal-blue mb-4 uppercase tracking-widest">Phase 3</div>
            <h3 className="font-display font-bold text-xl mb-4">Verify</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brutal-blue" />
                <span>Re-run same 89 probes</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brutal-blue" />
                <span>Python: <span className="text-brutal-accent font-bold">50% → 0%</span> <span className="text-brutal-green">(-50)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brutal-blue" />
                <span>JS/TS/C++: <span className="text-brutal-green font-bold">Preserved</span></span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brutal-blue" />
                <span>Verdict: <span className="text-brutal-accent font-bold">PASS</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Flow arrow */}
        <div className="flex justify-center my-8">
          <div className="flex items-center gap-4 font-mono text-sm text-brutal-mid">
            <span>Original Model</span>
            <ArrowRight size={20} className="text-brutal-accent" />
            <span className="text-brutal-accent font-bold">Unlearned Model</span>
            <ArrowRight size={20} className="text-brutal-accent" />
            <span>v2 (New Version)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── FEATURES ──────────── */
function Features() {
  const features = [
    {
      icon: Shield,
      title: "Evidence-Based",
      desc: "No claims about internal knowledge. All results come from controlled probing experiments with measurable outcomes.",
    },
    {
      icon: GitBranch,
      title: "Version Control",
      desc: "Every operation creates a new model version. Original models are never overwritten. Full lineage tracking.",
    },
    {
      icon: Layers,
      title: "Dual Objective",
      desc: "Retain-aware unlearning balances forgetting and preservation: minimize target capability while protecting unrelated skills.",
    },
    {
      icon: Cpu,
      title: "GPU Workers",
      desc: "Isolated Celery workers handle GPU-intensive tasks. The API server never directly executes model code.",
    },
    {
      icon: Database,
      title: "Full Provenance",
      desc: "Model hashes, dataset hashes, hyperparameters, random seeds, software versions — every experiment is reproducible.",
    },
    {
      icon: FlaskConical,
      title: "Robustness Testing",
      desc: "Tests paraphrases, indirect prompts, and code completion probes to verify forgetting survives rewording.",
    },
  ];

  return (
    <section id="features" className="py-24 px-6 border-t-3 border-white">
      <div className="max-w-[1400px] mx-auto">
        <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">Capabilities</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-16">
          Built for Research
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {features.map((f) => (
            <div key={f.title} className="bg-brutal-black p-8 hover:bg-brutal-gray transition-colors group">
              <f.icon size={32} className="text-brutal-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-display font-bold text-xl mb-3">{f.title}</h3>
              <p className="text-brutal-mid leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── RESULTS SHOWCASE ──────────── */
function ResultsShowcase() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "-50.0", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0", isTarget: false },
  ];

  return (
    <section className="py-24 px-6 border-t-3 border-white bg-brutal-gray">
      <div className="max-w-[1400px] mx-auto">
        <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">Proof of Concept</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-4">
          Real Results
        </h2>
        <p className="text-brutal-mid text-lg mb-12 max-w-2xl">
          Tested on <span className="text-white font-semibold">Salesforce/codegen-350M-multi</span> (304M parameters).
          Python capability reduced while other languages preserved.
        </p>

        <div className="border-3 border-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 bg-brutal-accent text-brutal-black font-display font-bold text-sm uppercase tracking-wider">
            <div className="p-4">Capability</div>
            <div className="p-4 text-center">Before</div>
            <div className="p-4 text-center">After</div>
            <div className="p-4 text-center">Change</div>
          </div>

          {/* Rows */}
          {results.map((r) => (
            <div
              key={r.cap}
              className={`grid grid-cols-4 border-t border-white/10 ${r.isTarget ? "bg-brutal-accent/10" : ""}`}
            >
              <div className="p-4 font-display font-semibold flex items-center gap-2">
                {r.isTarget && <Target size={16} className="text-brutal-accent" />}
                {r.cap}
                {r.isTarget && <span className="text-[10px] font-mono text-brutal-accent border border-brutal-accent px-1">TARGET</span>}
              </div>
              <div className="p-4 text-center font-mono">{r.before}</div>
              <div className="p-4 text-center font-mono">{r.after}</div>
              <div className={`p-4 text-center font-mono font-bold ${r.isTarget ? "text-brutal-accent" : "text-brutal-green"}`}>
                {r.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-8 border-3 border-brutal-green p-6 bg-brutal-green/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-brutal-green" />
            <span className="font-display font-bold text-2xl text-brutal-green">VERDICT: PASS</span>
          </div>
          <p className="text-brutal-mid mt-2 font-mono text-sm">
            Python capability successfully reduced. Retained capabilities preserved. Low collateral damage.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ──────────── RESEARCH / LIMITATIONS ──────────── */
function ResearchSection() {
  return (
    <section id="research" className="py-24 px-6 border-t-3 border-white">
      <div className="max-w-[1400px] mx-auto">
        <span className="font-mono text-xs text-brutal-accent uppercase tracking-widest">Transparency</span>
        <h2 className="font-display font-bold text-4xl md:text-5xl mt-4 mb-12">
          What This Is (And Isn&apos;t)
        </h2>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-display font-bold text-xl mb-4 text-brutal-green flex items-center gap-2">
              <CheckCircle2 size={20} /> What We Do
            </h3>
            <ul className="space-y-3 text-brutal-mid">
              <li className="flex items-start gap-2">
                <span className="text-brutal-green mt-1">→</span>
                Gradient-based model editing to reduce specific capabilities
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-green mt-1">→</span>
                Controlled probing to measure observed capability changes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-green mt-1">→</span>
                Retain-aware optimization to preserve unrelated skills
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-green mt-1">→</span>
                Robustness testing against prompt rewording
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-green mt-1">→</span>
                Full reproducibility with provenance tracking
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-xl mb-4 text-brutal-accent flex items-center gap-2">
              <XCircle size={20} /> What We Don&apos;t Claim
            </h3>
            <ul className="space-y-3 text-brutal-mid">
              <li className="flex items-start gap-2">
                <span className="text-brutal-accent mt-1">→</span>
                We do NOT inspect internal model weights or knowledge
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-accent mt-1">→</span>
                We do NOT claim complete knowledge deletion
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-accent mt-1">→</span>
                We do NOT guarantee theoretical machine unlearning
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-accent mt-1">→</span>
                Results are empirical, measured through controlled experiments
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brutal-accent mt-1">→</span>
                Residual capability may exist beyond probe coverage
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────── CTA ──────────── */
function CTASection() {
  return (
    <section className="py-32 px-6 border-t-3 border-white bg-brutal-accent">
      <div className="max-w-[1400px] mx-auto text-center">
        <h2 className="font-display font-bold text-4xl md:text-6xl text-brutal-black mb-6">
          Ready to Unlearn?
        </h2>
        <p className="text-brutal-black/70 text-xl mb-10 max-w-xl mx-auto">
          Upload a model. Establish a baseline. Run unlearning. Verify results.
          Start experimenting with selective capability reduction today.
        </p>
        <Link
          href="/signup"
          className="btn-brutal bg-brutal-black text-brutal-white text-xl inline-flex items-center gap-3"
        >
          Get Started Free <ArrowRight size={24} />
        </Link>
      </div>
    </section>
  );
}

/* ──────────── FOOTER ──────────── */
function Footer() {
  return (
    <footer className="py-12 px-6 border-t-3 border-white">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brutal-accent flex items-center justify-center">
            <span className="font-mono text-brutal-black font-bold text-sm">U</span>
          </div>
          <span className="font-display font-bold text-sm">
            UNLEARN<span className="text-brutal-accent">STUDIO</span>
          </span>
        </div>
        <p className="font-mono text-xs text-brutal-mid">
          Open Research Platform — Built with PyTorch, HuggingFace Transformers, FastAPI, Next.js
        </p>
        <p className="font-mono text-xs text-brutal-mid">
          © 2026 Unlearn Studio
        </p>
      </div>
    </footer>
  );
}

/* ──────────── PAGE ──────────── */
export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <VisualPipeline />
      <Features />
      <ResultsShowcase />
      <ResearchSection />
      <CTASection />
      <Footer />
    </main>
  );
}
