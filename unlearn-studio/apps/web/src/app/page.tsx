"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Brain, Eye, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, ChevronDown, Zap, Play
} from "lucide-react";

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Animated section wrapper ─── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, inView } = useInView();
  return (
    <section
      ref={ref}
      id={id}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </section>
  );
}

/* ════════════ HERO ════════════ */
function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
        backgroundSize: "80px 80px"
      }} />

      {/* Gradient orb */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-highlight/5 to-transparent blur-3xl" />

      <div className="max-w-[1320px] mx-auto w-full px-6 md:px-10 pt-32 pb-20 relative z-10">
        {/* Eyebrow */}
        <div className="animate-fade-in-up delay-1 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted">
            Open Research Platform — v1.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up delay-2">
          <span className="block text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-bold tracking-[-0.03em]">
            Selectively
          </span>
          <span className="block text-[clamp(3rem,8vw,7rem)] leading-[0.95] font-serif font-bold italic tracking-[-0.02em]">
            Unlearn
          </span>
          <span className="block text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-bold tracking-[-0.03em]">
            AI Models
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-3 mt-8 text-lg md:text-xl text-ink-muted max-w-xl leading-relaxed">
          A production platform for{" "}
          <span className="highlight">measured capability reduction</span>{" "}
          in language models. Forget what you need to.{" "}
          <span className="font-semibold text-ink">Keep what matters.</span>
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up delay-4 flex flex-wrap gap-4 mt-10">
          <Link href="/signup" className="btn-primary text-base px-8 py-4">
            Start Experimenting <ArrowRight size={18} />
          </Link>
          <Link href="/#how-it-works" className="btn-outline text-base px-8 py-4">
            See How It Works
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up delay-5 mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { value: "20+", label: "Probe Categories" },
            { value: "89", label: "Evaluation Probes" },
            { value: "2", label: "Unlearning Methods" },
            { value: "5", label: "Languages Supported" },
          ].map((stat, i) => (
            <div key={stat.label} className={`animate-fade-in-up delay-${6 + i}`}>
              <div className="text-3xl md:text-4xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-sm text-ink-muted mt-1 tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fade-in delay-8">
        <ChevronDown size={20} className="text-ink-subtle animate-bounce" />
      </div>
    </section>
  );
}

/* ════════════ PROBLEM ════════════ */
function ProblemSection() {
  return (
    <Section className="section">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">The Problem</span>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.02em]">
              AI Models{" "}
              <span className="font-serif italic">Can&apos;t Forget</span>
            </h2>
            <p className="mt-6 text-ink-muted text-lg leading-relaxed max-w-lg">
              Once trained, language models permanently encode their training data.
              They can reproduce copyrighted code, leak private information, and
              generate harmful content — with{" "}
              <span className="highlight">no way to selectively remove</span>{" "}
              specific knowledge.
            </p>
          </div>
          <div className="space-y-4">
            {[
              "Models memorize training data permanently",
              "No built-in mechanism to forget specific knowledge",
              "Retraining from scratch is expensive and wasteful",
              "Privacy regulations demand right to erasure",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-white/50 hover:bg-white hover:shadow-sm transition-all duration-300"
              >
                <div className="w-6 h-6 rounded-full bg-highlight/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-highlight text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-ink/80 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ HOW IT WORKS ════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", icon: "📤", title: "Upload Model", desc: "Upload any open-weight model. The system validates architecture, extracts metadata, and checks GPU requirements.", tag: "safetensors · HuggingFace" },
    { num: "02", icon: "🔍", title: "Explore Capabilities", desc: "Run controlled probing experiments across 20 categories and 89 probes to establish an evidence-based baseline.", tag: "89 probes · 20 categories" },
    { num: "03", icon: "🎯", title: "Select Target", desc: "Choose what to unlearn. In V1, we focus on Python — measuring its reduction while preserving other languages.", tag: "Python → JS · TS · C++" },
    { num: "04", icon: "🧠", title: "Run Unlearning", desc: "Choose between gradient-based forgetting or retain-aware unlearning. Dual objective: forget the target, preserve other capabilities.", tag: "gradient ascent + descent" },
    { num: "05", icon: "🔬", title: "Verify Results", desc: "Re-run the exact same evaluation suite. Compare before/after across all capabilities with robustness testing.", tag: "paraphrases · indirect · code" },
    { num: "06", icon: "📊", title: "Review Report", desc: "Comprehensive report: forgetting achievement, retention score, collateral damage, and a final verdict.", tag: "PASS · REVIEW · FAIL" },
  ];

  return (
    <Section id="how-it-works" className="section bg-white">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">Process</span>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.02em]">
            How It <span className="font-serif italic">Works</span>
          </h2>
          <p className="mt-4 text-ink-muted max-w-lg mx-auto">
            Six steps from upload to verified unlearning. Every result is reproducible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="group p-6 md:p-8 rounded-2xl border border-border/60 bg-bg hover:bg-white hover:shadow-lg hover:border-border transition-all duration-500 hover-lift"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{step.icon}</span>
                <span className="font-mono text-xs text-ink-subtle">{step.num}</span>
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-highlight transition-colors duration-300">
                {step.title}
              </h3>
              <p className="text-ink-muted text-sm leading-relaxed mb-4">{step.desc}</p>
              <div className="text-[11px] font-mono text-ink-subtle tracking-wide uppercase">
                {step.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ════════════ VISUAL PIPELINE ════════════ */
function VisualPipeline() {
  return (
    <Section className="section">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">Architecture</span>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.02em]">
            The Scientific <span className="font-serif italic">Loop</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
          {/* Baseline */}
          <div className="bg-white p-8 md:p-10">
            <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-success mb-4">Phase 1</div>
            <h3 className="text-xl font-bold mb-5">Baseline</h3>
            <div className="space-y-3">
              {["Load original model", "Run 89 probes", "Measure Python: 50%", "Measure JS/TS/C++: 75%"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                  <span className="text-ink/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unlearning */}
          <div className="bg-bg-alt p-8 md:p-10">
            <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight mb-4">Phase 2</div>
            <h3 className="text-xl font-bold mb-5">Unlearn</h3>
            <div className="space-y-3">
              {["Gradient ascent on Python", "Gradient descent on retain", "Optimize dual objective", "Save new model version"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <Zap size={15} className="text-highlight shrink-0" />
                  <span className="text-ink/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verify */}
          <div className="bg-white p-8 md:p-10">
            <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted mb-4">Phase 3</div>
            <h3 className="text-xl font-bold mb-5">Verify</h3>
            <div className="space-y-3">
              {["Re-run same 89 probes", "Python: 50% → 0%", "JS/TS/C++: Preserved", "Verdict: PASS"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <BarChart3 size={15} className="text-ink-muted shrink-0" />
                  <span className="text-ink/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-4 text-sm text-ink-muted font-mono">
            <span>Original</span>
            <ArrowRight size={16} className="text-highlight" />
            <span className="text-ink font-semibold">Unlearned</span>
            <ArrowRight size={16} className="text-highlight" />
            <span>v2 (New Version)</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ FEATURES ════════════ */
function Features() {
  const features = [
    { icon: Shield, title: "Evidence-Based", desc: "No claims about internal knowledge. All results come from controlled probing with measurable outcomes." },
    { icon: GitBranch, title: "Version Control", desc: "Every operation creates a new model version. Original models are never overwritten. Full lineage tracking." },
    { icon: Layers, title: "Dual Objective", desc: "Retain-aware unlearning balances forgetting and preservation with weighted loss optimization." },
    { icon: Cpu, title: "GPU Workers", desc: "Isolated Celery workers handle GPU-intensive tasks. The API server never directly executes model code." },
    { icon: Database, title: "Full Provenance", desc: "Model hashes, dataset hashes, hyperparameters, seeds — every experiment is fully reproducible." },
    { icon: FlaskConical, title: "Robustness Testing", desc: "Tests paraphrases, indirect prompts, and code completion to verify forgetting survives rewording." },
  ];

  return (
    <Section id="features" className="section bg-white">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">Capabilities</span>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.02em]">
            Built for <span className="font-serif italic">Research</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-7 rounded-2xl border border-border/60 hover:border-border hover:shadow-lg transition-all duration-500 hover-lift bg-bg"
            >
              <div className="w-11 h-11 rounded-xl bg-ink/5 flex items-center justify-center mb-5 group-hover:bg-ink group-hover:text-white transition-all duration-300">
                <f.icon size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-ink-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ════════════ RESULTS ════════════ */
function Results() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "-50.0", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0", isTarget: false },
  ];

  return (
    <Section className="section">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="mb-12">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">Proof of Concept</span>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.02em]">
            Real <span className="font-serif italic">Results</span>
          </h2>
          <p className="mt-4 text-ink-muted max-w-xl">
            Tested on <span className="font-semibold text-ink">Salesforce/codegen-350M</span> (304M parameters).
            Python capability reduced while other languages preserved.
          </p>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden bg-white">
          {/* Header */}
          <div className="grid grid-cols-4 bg-ink text-white text-[11px] font-semibold uppercase tracking-[0.1em]">
            <div className="p-4 md:p-5">Capability</div>
            <div className="p-4 md:p-5 text-center">Before</div>
            <div className="p-4 md:p-5 text-center">After</div>
            <div className="p-4 md:p-5 text-center">Change</div>
          </div>

          {/* Rows */}
          {results.map((r) => (
            <div
              key={r.cap}
              className={`grid grid-cols-4 border-t border-border/50 transition-colors hover:bg-bg-alt/50 ${r.isTarget ? "bg-highlight/[0.03]" : ""}`}
            >
              <div className="p-4 md:p-5 font-semibold text-sm flex items-center gap-2">
                {r.isTarget && <Target size={14} className="text-highlight" />}
                {r.cap}
                {r.isTarget && (
                  <span className="text-[9px] font-mono text-highlight border border-highlight/30 px-1.5 py-0.5 rounded">
                    TARGET
                  </span>
                )}
              </div>
              <div className="p-4 md:p-5 text-center font-mono text-sm text-ink-muted">{r.before}</div>
              <div className="p-4 md:p-5 text-center font-mono text-sm text-ink-muted">{r.after}</div>
              <div className={`p-4 md:p-5 text-center font-mono text-sm font-bold ${r.isTarget ? "text-highlight" : "text-success"}`}>
                {r.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-6 p-6 rounded-2xl border border-success/20 bg-success/[0.03] flex items-start gap-4">
          <CheckCircle2 size={22} className="text-success shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-lg text-success">Verdict: PASS</div>
            <p className="text-ink-muted text-sm mt-1">
              Python capability successfully reduced. Retained capabilities preserved. Low collateral damage.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ RESEARCH ════════════ */
function ResearchSection() {
  return (
    <Section id="research" className="section bg-white">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-highlight">Transparency</span>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-[-0.02em]">
            What This Is{" "}
            <span className="font-serif italic">(And Isn&apos;t)</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="p-8 rounded-2xl border border-border/60 bg-bg">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-success" /> What We Do
            </h3>
            <ul className="space-y-3.5">
              {[
                "Gradient-based model editing to reduce specific capabilities",
                "Controlled probing to measure observed capability changes",
                "Retain-aware optimization to preserve unrelated skills",
                "Robustness testing against prompt rewording",
                "Full reproducibility with provenance tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-ink/80 text-sm leading-relaxed">
                  <span className="text-success mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 rounded-2xl border border-border/60 bg-bg">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2.5">
              <XCircle size={18} className="text-error" /> What We Don&apos;t Claim
            </h3>
            <ul className="space-y-3.5">
              {[
                "We do NOT inspect internal model weights or knowledge",
                "We do NOT claim complete knowledge deletion",
                "We do NOT guarantee theoretical machine unlearning",
                "Results are empirical, measured through experiments",
                "Residual capability may exist beyond probe coverage",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-ink/80 text-sm leading-relaxed">
                  <span className="text-error mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ CTA ════════════ */
function CTASection() {
  return (
    <Section className="section">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        <div className="relative overflow-hidden rounded-3xl bg-ink text-white p-12 md:p-20 text-center">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-highlight/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <h2 className="text-[clamp(2rem,5vw,4rem)] font-bold tracking-[-0.02em] mb-5">
              Ready to <span className="font-serif italic text-highlight">Unlearn</span>?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
              Upload a model. Establish a baseline. Run unlearning. Verify results.
              Start experimenting today.
            </p>
            <Link href="/signup" className="btn-primary bg-white text-ink hover:bg-white/90 text-base px-10 py-4">
              Get Started Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ FOOTER ════════════ */
function Footer() {
  return (
    <footer className="py-12 px-6 md:px-10 border-t border-border">
      <div className="max-w-[1320px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md flex items-center justify-center">
            <span className="text-white font-serif text-xs font-bold italic">N</span>
          </div>
          <span className="font-serif font-bold text-sm">
            Null<span className="italic">Mind</span>
          </span>
        </div>
        <p className="text-xs text-ink-subtle font-mono">
          Built with PyTorch · HuggingFace · FastAPI · Next.js
        </p>
        <p className="text-xs text-ink-subtle">
          © 2026 NullMind
        </p>
      </div>
    </footer>
  );
}

/* ════════════ PAGE ════════════ */
export default function Home() {
  return (
    <main>
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
