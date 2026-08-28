"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  Target,
  CheckCircle2,
  FlaskConical,
  Shield,
  GitBranch,
  Database,
  Cpu,
  Layers,
  Brain,
  Zap,
  XCircle,
  ArrowUpRight,
  ChevronRight,
  Upload,
  Eye,
  Settings,
  BarChart3,
  FileCheck,
  Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   ANIMATION WRAPPER
   ═══════════════════════════════════════════════ */

function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-[72px] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-highlight/[0.04] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-accent/[0.03] rounded-full blur-[100px]" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        {/* Badge */}
        <FadeInSection>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-ink-muted tracking-wide">
              V1.0 — Open Source Machine Unlearning
            </span>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left Column */}
          <div className="max-w-2xl">
            <FadeInSection delay={0.1}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-ink">
                Selectively{" "}
                <span className="gradient-text">Unlearn</span>{" "}
                AI Models.
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <p className="mt-6 text-lg md:text-xl text-ink-muted leading-relaxed max-w-xl">
                An open research platform for measured LLM capability
                reduction. Forget copyrighted code, PII, and unsafe data
                without retraining from scratch.
              </p>
            </FadeInSection>

            <FadeInSection delay={0.3}>
              <div className="flex flex-wrap items-center gap-4 mt-10">
                <Link href="/signup" className="btn-primary text-base py-3.5 px-8">
                  Start Experimenting
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/#how-it-works"
                  className="btn-outline text-base py-3.5 px-8"
                >
                  See How It Works
                </Link>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.4}>
              <div className="flex items-center gap-6 mt-10 text-sm text-ink-subtle">
                <div className="flex items-center gap-2">
                  <Shield size={15} className="text-success" />
                  <span>Evidence-Based</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlaskConical size={15} className="text-accent" />
                  <span>89 Probes</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch size={15} className="text-highlight" />
                  <span>Versioned</span>
                </div>
              </div>
            </FadeInSection>
          </div>

          {/* Right Column - Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                value: "20+",
                label: "Probe Categories",
                desc: "Code, Safety, Math & more",
                color: "from-highlight/10 to-highlight/5",
                border: "border-highlight/20",
              },
              {
                value: "89",
                label: "Evaluation Probes",
                desc: "Targeted test battery",
                color: "from-accent/10 to-accent/5",
                border: "border-accent/20",
              },
              {
                value: "2",
                label: "Unlearn Methods",
                desc: "Ascent + Retain-Aware",
                color: "from-purple-500/10 to-purple-500/5",
                border: "border-purple-500/20",
              },
              {
                value: "5",
                label: "Languages Tested",
                desc: "Python, JS, TS, C++ & more",
                color: "from-success/10 to-success/5",
                border: "border-success/20",
              },
            ].map((stat, i) => (
              <FadeInSection key={stat.label} delay={0.2 + i * 0.1}>
                <div
                  className={`glass-card p-6 bg-gradient-to-br ${stat.color} border ${stat.border}`}
                >
                  <div className="text-3xl md:text-4xl font-bold text-ink mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {stat.label}
                  </div>
                  <div className="text-xs text-ink-subtle mt-1">{stat.desc}</div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   PROBLEM SECTION
   ═══════════════════════════════════════════════ */

function ProblemSection() {
  return (
    <section className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="absolute inset-0 grid-bg-dense" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-error/5 border border-error/20 mb-6">
              <span className="text-xs font-semibold text-error tracking-wide uppercase">
                The Problem
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              AI Models Cannot{" "}
              <span className="text-error">Selectively Forget</span>
            </h2>
            <p className="mt-4 text-lg text-ink-muted max-w-2xl mx-auto">
              Once trained, LLMs permanently memorize code, PII, and
              copyrighted content across millions of parameters.
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              title: "Permanent Memorization",
              desc: "Training data is baked directly into neural network weights. There is no undo button.",
              icon: Brain,
              color: "text-highlight",
            },
            {
              title: "No Erase Button",
              desc: "Standard RLHF or fine-tuning only suppresses output — data remains accessible via jailbreaks.",
              icon: XCircle,
              color: "text-error",
            },
            {
              title: "Prohibitive Retraining Cost",
              desc: "Re-cleansing data and retraining full parameters costs $100k+ per removal request.",
              icon: Database,
              color: "text-accent",
            },
            {
              title: "Right to be Forgotten",
              desc: "Privacy compliance (GDPR/CCPA) requires verifiable data removal from trained models.",
              icon: Shield,
              color: "text-success",
            },
          ].map((item, i) => (
            <FadeInSection key={item.title} delay={i * 0.1}>
              <div className="glass-card p-6 flex items-start gap-4 h-full">
                <div
                  className={`w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <item.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink mb-1">{item.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════ */

function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Upload,
      title: "Upload Model",
      desc: "Upload any open-weight HuggingFace model. System validates architecture, parameters, and GPU compatibility.",
      color: "text-highlight",
    },
    {
      num: "02",
      icon: Eye,
      title: "Explore Baseline",
      desc: "Run 89-probe evaluation suite across 20 categories to record starting capabilities.",
      color: "text-accent",
    },
    {
      num: "03",
      icon: Target,
      title: "Select Target",
      desc: "Define which capability to reduce — e.g., Python code generation, specific API knowledge.",
      color: "text-purple-400",
    },
    {
      num: "04",
      icon: Settings,
      title: "Configure Method",
      desc: "Choose unlearning algorithm and hyperparameters: learning rate, steps, retain weight.",
      color: "text-highlight",
    },
    {
      num: "05",
      icon: Zap,
      title: "Run Unlearning",
      desc: "GPU worker executes gradient ascent on target while preserving non-target capabilities.",
      color: "text-error",
    },
    {
      num: "06",
      icon: BarChart3,
      title: "Verify & Report",
      desc: "Re-evaluate with the same probes. Compare before/after metrics, collateral damage, and robustness.",
      color: "text-success",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
              <span className="text-xs font-semibold text-ink-muted tracking-wide uppercase">
                Pipeline
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              Six Steps to Verified Unlearning
            </h2>
            <p className="mt-4 text-lg text-ink-muted max-w-2xl mx-auto">
              A fully reproducible pipeline from model upload to verified
              capability reduction.
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <FadeInSection key={step.num} delay={i * 0.08}>
              <div className="glass-card p-6 h-full group hover:border-white/[0.1] transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center ${step.color}`}
                  >
                    <step.icon size={20} />
                  </div>
                  <span className="font-mono text-xs text-ink-subtle tracking-wider">
                    STEP {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   VISUAL PIPELINE
   ═══════════════════════════════════════════════ */

function VisualPipeline() {
  return (
    <section className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="absolute inset-0 grid-bg" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/20 mb-6">
              <Sparkles size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent tracking-wide uppercase">
                Retention-Aware Architecture
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              Dual Objective Loss
            </h2>
            <p className="mt-4 text-lg text-ink-muted max-w-2xl mx-auto">
              Balances forgetting targeted capabilities with preserving
              everything else.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <div className="glass-card p-8 md:p-12 glow-amber">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Phase A */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-highlight/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-highlight">
                      A
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Baseline
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-4">
                  Score Capabilities
                </h3>
                <ul className="space-y-2.5 text-sm text-ink-muted">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                    Python Probes: 50.0%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                    JavaScript: 50.0%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                    TypeScript: 100.0%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                    C++ Probes: 75.0%
                  </li>
                </ul>
              </div>

              {/* Phase B */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-purple-400">
                      B
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Unlearn
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-4">
                  Dual Loss Optimization
                </h3>
                <div className="space-y-3">
                  <div className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-ink-muted">
                    🔥 Gradient Ascent: Target
                  </div>
                  <div className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-ink-muted">
                    🛡️ Gradient Descent: Retain Set
                  </div>
                  <div className="mt-4 px-4 py-3 bg-highlight/5 border border-highlight/20 rounded-lg text-center">
                    <span className="font-mono text-sm text-highlight">
                      L = −L_forget + λ · L_retain
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase C */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-success/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-success">
                      C
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Verify
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-4">
                  Re-evaluate Results
                </h3>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-center gap-2 text-error font-semibold">
                    <Target size={14} />
                    Python: 50% → 0.0%
                  </li>
                  <li className="flex items-center gap-2 text-success">
                    <CheckCircle2 size={14} />
                    JavaScript: 50.0% ✓
                  </li>
                  <li className="flex items-center gap-2 text-success">
                    <CheckCircle2 size={14} />
                    TypeScript: 100.0% ✓
                  </li>
                  <li className="flex items-center gap-2 text-success">
                    <CheckCircle2 size={14} />
                    C++: 75.0% ✓
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-success/5 border border-success/20 rounded-full">
                <CheckCircle2 size={16} className="text-success" />
                <span className="text-sm font-semibold text-success">
                  Target reduced while preserving retained skills
                </span>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════ */

function Features() {
  const features = [
    {
      title: "Evidence-Based",
      desc: "No opaque internal weight claims. All unlearning is validated through controlled probing experiments.",
      icon: Shield,
      color: "text-highlight",
    },
    {
      title: "Version Lineage",
      desc: "Every experiment creates an immutable checkpoint. Original models are always untouched.",
      icon: GitBranch,
      color: "text-accent",
    },
    {
      title: "Dual Objective",
      desc: "Retain-aware loss prevents model degradation while erasing targeted capability domains.",
      icon: Layers,
      color: "text-purple-400",
    },
    {
      title: "GPU Worker Queue",
      desc: "Async Celery background tasks handle model loading and gradient computation seamlessly.",
      icon: Cpu,
      color: "text-highlight",
    },
    {
      title: "Full Provenance",
      desc: "Complete reproducibility log with dataset hashes, learning rates, seed tracking, and audit trail.",
      icon: Database,
      color: "text-accent",
    },
    {
      title: "Robustness Suite",
      desc: "Paraphrase and adversarial prompt tests ensure unlearning resists simple jailbreak attempts.",
      icon: FlaskConical,
      color: "text-success",
    },
  ];

  return (
    <section id="features" className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
              <Zap size={14} className="text-highlight" />
              <span className="text-xs font-semibold text-ink-muted tracking-wide uppercase">
                Capabilities
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              Built for Rigorous ML Research
            </h2>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FadeInSection key={f.title} delay={i * 0.08}>
              <div className="glass-card p-7 h-full group hover:border-white/[0.1] transition-all duration-300">
                <div
                  className={`w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center mb-5 ${f.color}`}
                >
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   RESULTS SCORECARD
   ═══════════════════════════════════════════════ */

function Results() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "-50.0%", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0%", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0%", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0%", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0%", isTarget: false },
  ];

  return (
    <section id="results" className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="absolute inset-0 grid-bg-dense" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/5 border border-success/20 mb-6">
              <FileCheck size={14} className="text-success" />
              <span className="text-xs font-semibold text-success tracking-wide uppercase">
                Verified Results
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              Real Evaluation Scorecard
            </h2>
            <p className="mt-4 text-lg text-ink-muted max-w-2xl mx-auto">
              Tested on{" "}
              <span className="font-mono text-sm bg-white/[0.06] px-2 py-0.5 rounded text-ink">
                Salesforce/codegen-350M-multi
              </span>{" "}
              (304M parameters)
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Verdict */}
          <FadeInSection>
            <div className="space-y-6">
              <div className="glass-card p-8 border-success/20 bg-success/[0.03]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-success" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-success">
                      Verdict: PASS
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      Target Python capability eliminated with zero collateral
                      damage on JS/TS/C++.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Forgetting", value: "50%", color: "text-highlight" },
                  { label: "Retention", value: "100%", color: "text-success" },
                  { label: "Collateral", value: "LOW", color: "text-success" },
                ].map((m) => (
                  <div key={m.label} className="glass-card p-4 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle mb-1">
                      {m.label}
                    </div>
                    <div className={`text-2xl font-bold ${m.color}`}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* Right - Table */}
          <FadeInSection delay={0.15}>
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Evaluation Metrics
                </span>
                <span className="font-mono text-xs text-ink-subtle">
                  codegen-350m-v2
                </span>
              </div>

              {/* Header */}
              <div className="grid grid-cols-4 px-5 py-3 border-b border-white/[0.04] text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                <div>Capability</div>
                <div className="text-center">Before</div>
                <div className="text-center">After</div>
                <div className="text-center">Delta</div>
              </div>

              {/* Rows */}
              {results.map((r) => (
                <div
                  key={r.cap}
                  className={`grid grid-cols-4 px-5 py-3.5 border-b border-white/[0.03] last:border-0 transition-colors ${
                    r.isTarget ? "bg-highlight/[0.04]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-ink">
                    {r.isTarget && (
                      <Target size={13} className="text-highlight shrink-0" />
                    )}
                    {r.cap}
                    {r.isTarget && (
                      <span className="text-[9px] font-mono bg-highlight/10 text-highlight px-1.5 py-0.5 rounded">
                        TARGET
                      </span>
                    )}
                  </div>
                  <div className="text-center font-mono text-sm text-ink-muted">
                    {r.before}
                  </div>
                  <div className="text-center font-mono text-sm text-ink-muted">
                    {r.after}
                  </div>
                  <div
                    className={`text-center font-mono text-sm font-semibold ${
                      r.isTarget ? "text-error" : "text-ink-subtle"
                    }`}
                  >
                    {r.delta}
                  </div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   RESEARCH TRANSPARENCY
   ═══════════════════════════════════════════════ */

function ResearchSection() {
  return (
    <section id="research" className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
              <FlaskConical size={14} className="text-ink-muted" />
              <span className="text-xs font-semibold text-ink-muted tracking-wide uppercase">
                Transparency
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
              What We Do (And Don&apos;t Claim)
            </h2>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeInSection>
            <div className="glass-card p-8 border-success/10 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-success" />
                </div>
                <h3 className="text-lg font-semibold text-ink">
                  What We Do
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-ink-muted">
                {[
                  "Gradient-based model editing to reduce specific capabilities",
                  "Controlled probing battery to measure output differences",
                  "Retain-aware optimization to preserve un-targeted skills",
                  "Robustness tests against paraphrased and indirect prompts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      size={15}
                      className="text-success shrink-0 mt-0.5"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="glass-card p-8 border-error/10 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                  <XCircle size={20} className="text-error" />
                </div>
                <h3 className="text-lg font-semibold text-ink">
                  What We Don&apos;t Claim
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-ink-muted">
                {[
                  "We do NOT inspect internal model weights or neural representations",
                  "We do NOT claim 100% mathematical knowledge deletion",
                  "We do NOT guarantee theoretical machine unlearning proofs",
                  "Results are empirical and based strictly on probe performance",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <XCircle
                      size={15}
                      className="text-error/60 shrink-0 mt-0.5"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   CTA SECTION
   ═══════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="relative py-24 md:py-32 border-t border-white/[0.04]">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-highlight/[0.04] rounded-full blur-[120px]" />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8 text-center">
        <FadeInSection>
          <h2 className="text-3xl md:text-5xl font-bold text-ink tracking-tight">
            Ready to Unlearn Your Models?
          </h2>
          <p className="mt-4 text-lg text-ink-muted max-w-2xl mx-auto">
            Upload your model checkpoint, run probe baseline, select target
            capability, and verify unlearning within minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link href="/signup" className="btn-primary text-base py-3.5 px-8">
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <Link
              href="https://github.com/harsh11x/unlearnai"
              target="_blank"
              className="btn-outline text-base py-3.5 px-8"
            >
              View on GitHub
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

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
