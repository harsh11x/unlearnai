"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Brain, Eye, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, ChevronDown, Zap, Play
} from "lucide-react";

/* ─── Animated section wrapper ─── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`border-b-4 border-black ${className}`}>
      {children}
    </section>
  );
}

/* ════════════ HERO ════════════ */
function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center relative border-b-4 border-black bg-highlight">
      {/* Brutalist Grid */}
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHBhdGggZD0iTTAgMGg4MHY4MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDc5LjVoODBWMDBIMHY3OS41eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>

      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto pt-32 pb-24 relative z-10 flex flex-col items-center text-center md:items-start md:text-left">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] mb-12">
          <div className="w-3 h-3 bg-error border border-black" />
          <span className="text-sm font-bold font-mono tracking-widest uppercase text-black">
            Open Research Platform — v1.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="uppercase space-y-6 w-full max-w-5xl">
          <span className="block text-[clamp(3rem,6vw,6rem)] leading-[0.9] font-black tracking-tighter">
            Selectively
          </span>
          <span className="block text-[clamp(4rem,8vw,8rem)] leading-[0.8] font-bold font-serif text-white bg-black inline-block px-6 py-4 border-2 border-black my-6 shadow-[8px_8px_0_0_#000] transform -rotate-1">
            UNLEARN
          </span>
          <span className="block text-[clamp(3rem,6vw,6rem)] leading-[0.9] font-black tracking-tighter">
            AI Models
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-12 text-xl md:text-2xl font-bold font-mono text-black max-w-3xl leading-loose border-l-4 border-black pl-8 bg-white p-8 shadow-[8px_8px_0_0_#000]">
          A production platform for{" "}
          <span className="bg-highlight px-3 py-1 border-2 border-black inline-block mx-1">measured capability reduction</span>{" "}
          in language models. Forget what you need to.{" "}
          <span className="underline decoration-4 underline-offset-8 mt-2 inline-block">Keep what matters.</span>
        </p>

        {/* CTA */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-16">
          <Link href="/signup" className="btn-primary text-lg px-10 py-5 border-[3px]">
            Start Experimenting <ArrowRight size={24} className="stroke-[3px]" />
          </Link>
          <Link href="/#how-it-works" className="btn-outline text-lg px-10 py-5 bg-white border-[3px]">
            See How It Works
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-32 w-full grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {[
            { value: "20+", label: "Probe Categories" },
            { value: "89", label: "Evaluation Probes" },
            { value: "2", label: "Unlearning Methods" },
            { value: "5", label: "Languages Supported" },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-white border-2 border-black p-8 shadow-[6px_6px_0_0_#000] hover:-translate-y-2 hover:shadow-[10px_10px_0_0_#000] transition-all flex flex-col items-center md:items-start text-center md:text-left">
              <div className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-highlight stroke-black mb-4" style={{ WebkitTextStroke: "2px black" }}>{stat.value}</div>
              <div className="text-sm font-bold font-mono uppercase mt-4 border-t-2 border-black pt-4 w-full">{stat.label}</div>
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
    <Section className="py-32 bg-white">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div className="border-4 border-black p-10 md:p-14 bg-highlight shadow-[12px_12px_0_0_#000]">
            <span className="text-sm font-black font-mono tracking-widest uppercase bg-black text-white px-4 py-2 inline-block mb-8">The Problem</span>
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-black leading-[1] uppercase tracking-tighter mb-10">
              AI Models<br/>
              <span className="text-white mt-4 inline-block" style={{ WebkitTextStroke: "2px black" }}>Can&apos;t Forget</span>
            </h2>
            <p className="mt-10 font-mono text-xl md:text-2xl font-bold leading-relaxed bg-white border-2 border-black p-8 shadow-[8px_8px_0_0_#000]">
              Once trained, language models permanently encode their training data.
              They can reproduce copyrighted code, leak private information, and
              generate harmful content — with{" "}
              <span className="bg-error text-white px-2 py-1 inline-block my-2">no way to selectively remove</span>{" "}
              specific knowledge.
            </p>
          </div>
          <div className="space-y-8 lg:mt-12">
            {[
              "Models memorize training data permanently",
              "No built-in mechanism to forget specific knowledge",
              "Retraining from scratch is expensive and wasteful",
              "Privacy regulations demand right to erasure",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-center gap-8 p-8 border-2 border-black bg-white hover:bg-highlight hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#000] transition-all"
              >
                <div className="w-16 h-16 bg-black flex items-center justify-center shrink-0 shadow-[6px_6px_0_0_#ffff00]">
                  <span className="text-highlight text-2xl font-black font-mono">{i + 1}</span>
                </div>
                <span className="text-black font-bold font-mono text-xl uppercase leading-relaxed">{text}</span>
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
    <Section id="how-it-works" className="py-32 bg-bg-alt">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="mb-20 border-b-4 border-black pb-12 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div>
            <span className="text-sm font-black font-mono tracking-widest uppercase bg-black text-highlight px-4 py-2 inline-block mb-8">Process</span>
            <h2 className="text-[clamp(3.5rem,7vw,6rem)] font-black uppercase tracking-tighter leading-[1]">
              How It <span className="bg-highlight px-4 py-2 border-4 border-black shadow-[8px_8px_0_0_#000] inline-block mt-4 md:mt-0 md:ml-4">Works</span>
            </h2>
          </div>
          <p className="font-mono font-bold max-w-lg text-xl border-l-4 border-black pl-8 pb-2 leading-relaxed">
            Six steps from upload to verified unlearning. Every result is reproducible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="p-10 border-4 border-black bg-white shadow-[8px_8px_0_0_#000] hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[16px_16px_0_0_#000] transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-10">
                <span className="text-5xl">{step.icon}</span>
                <span className="font-mono text-4xl font-black text-black/20">{step.num}</span>
              </div>
              <h3 className="text-2xl font-black uppercase mb-8 bg-highlight inline-block self-start px-4 py-2 border-2 border-black">
                {step.title}
              </h3>
              <p className="font-mono font-bold text-base leading-loose mb-10 flex-grow text-black/80">{step.desc}</p>
              <div className="text-xs font-black font-mono bg-black text-white px-5 py-3 uppercase border-l-4 border-highlight">
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
    <Section className="py-32 bg-white">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="text-center mb-20">
          <span className="text-sm font-black font-mono tracking-widest uppercase bg-highlight border-2 border-black px-5 py-2.5 shadow-[6px_6px_0_0_#000] inline-block mb-10">Architecture</span>
          <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter leading-[1]">
            The Scientific <span className="underline decoration-8 underline-offset-8 decoration-highlight inline-block mt-4 md:mt-0 ml-4">Loop</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 border-[8px] border-black shadow-[16px_16px_0_0_#000] mx-auto max-w-6xl">
          {/* Baseline */}
          <div className="bg-white p-10 md:p-14 border-b-[8px] lg:border-b-0 lg:border-r-[8px] border-black relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-sm px-5 py-2.5 border-b-4 border-l-4 border-black">PHASE 1</div>
            <h3 className="text-3xl font-black uppercase mt-8 mb-10">Baseline</h3>
            <div className="space-y-6">
              {["Load original model", "Run 89 probes", "Measure Python: 50%", "Measure JS/TS/C++: 75%"].map((item) => (
                <div key={item} className="flex items-center gap-5 font-mono font-bold text-lg border-2 border-black p-4 bg-bg-alt">
                  <CheckCircle2 size={24} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unlearning */}
          <div className="bg-highlight p-10 md:p-14 border-b-[8px] lg:border-b-0 lg:border-r-[8px] border-black relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-sm px-5 py-2.5 border-b-4 border-l-4 border-black">PHASE 2</div>
            <h3 className="text-3xl font-black uppercase mt-8 mb-10">Unlearn</h3>
            <div className="space-y-6">
              {["Gradient ascent on Python", "Gradient descent on retain", "Optimize dual objective", "Save new model version"].map((item) => (
                <div key={item} className="flex items-center gap-5 font-mono font-bold text-lg border-2 border-black p-4 bg-white">
                  <Zap size={24} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verify */}
          <div className="bg-white p-10 md:p-14 relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-sm px-5 py-2.5 border-b-4 border-l-4 border-black">PHASE 3</div>
            <h3 className="text-3xl font-black uppercase mt-8 mb-10">Verify</h3>
            <div className="space-y-6">
              {["Re-run same 89 probes", "Python: 50% → 0%", "JS/TS/C++: Preserved", "Verdict: PASS"].map((item) => (
                <div key={item} className="flex items-center gap-5 font-mono font-bold text-lg border-2 border-black p-4 bg-bg-alt">
                  <BarChart3 size={24} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="flex justify-center mt-16">
          <div className="flex flex-wrap items-center justify-center gap-6 text-lg md:text-xl font-black font-mono uppercase bg-black text-white p-6 border-2 border-black shadow-[8px_8px_0_0_#ffff00]">
            <span>Original</span>
            <ArrowRight size={28} className="text-highlight stroke-[3px]" />
            <span className="text-highlight">Unlearned</span>
            <ArrowRight size={28} className="text-highlight stroke-[3px]" />
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
    <Section id="features" className="py-32 bg-bg-alt">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="flex flex-col items-center mb-20 text-center">
          <span className="text-sm font-black font-mono tracking-widest uppercase bg-black text-white px-5 py-2.5 border-2 border-black shadow-[6px_6px_0_0_#ffff00] mb-8 inline-block">Capabilities</span>
          <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter leading-[1]">
            Built for <br className="md:hidden" /><span className="bg-white border-4 border-black px-4 py-2 shadow-[6px_6px_0_0_#000] inline-block mt-4 md:mt-0 md:ml-4">Research</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-10 border-4 border-black bg-white shadow-[10px_10px_0_0_#000] hover:bg-black hover:text-white transition-colors group flex flex-col items-center text-center md:items-start md:text-left"
            >
              <div className="w-20 h-20 bg-highlight border-4 border-black flex items-center justify-center mb-10 group-hover:bg-white group-hover:text-black transition-colors">
                <f.icon size={40} className="stroke-[3px]" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-6">{f.title}</h3>
              <p className="font-mono font-bold text-base leading-relaxed opacity-90">{f.desc}</p>
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
    <Section className="py-32 bg-highlight">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="mb-20 border-b-4 border-black pb-12 flex flex-col lg:flex-row justify-between lg:items-end gap-12">
          <div>
            <span className="text-sm font-black font-mono tracking-widest uppercase bg-black text-white px-4 py-2 inline-block mb-8">Proof of Concept</span>
            <h2 className="text-[clamp(3.5rem,7vw,6rem)] font-black uppercase tracking-tighter leading-[0.9]">
              Real <span className="text-white bg-black px-4 inline-block my-2" style={{ WebkitTextStroke: "2px black" }}>Results</span>
            </h2>
          </div>
          <p className="font-mono font-bold max-w-2xl text-xl border-l-4 border-black pl-8 bg-white p-8 shadow-[6px_6px_0_0_#000] leading-relaxed">
            Tested on <span className="bg-black text-white px-3 py-1 inline-block my-2">Salesforce/codegen-350M</span>.<br/>
            Python capability reduced while other languages preserved.
          </p>
        </div>

        <div className="border-[8px] border-black bg-white shadow-[16px_16px_0_0_#000]">
          {/* Header */}
          <div className="grid grid-cols-4 bg-black text-white text-base font-black uppercase font-mono tracking-widest border-b-4 border-black">
            <div className="p-6 md:p-8 border-r-4 border-black">Capability</div>
            <div className="p-6 md:p-8 border-r-4 border-black text-center">Before</div>
            <div className="p-6 md:p-8 border-r-4 border-black text-center">After</div>
            <div className="p-6 md:p-8 text-center">Change</div>
          </div>

          {/* Rows */}
          {results.map((r, idx) => (
            <div
              key={r.cap}
              className={`grid grid-cols-4 border-b-4 border-black last:border-b-0 hover:bg-bg-alt transition-none ${r.isTarget ? "bg-highlight/30" : ""}`}
            >
              <div className="p-6 md:p-8 font-black uppercase flex items-center gap-4 border-r-4 border-black text-lg md:text-xl">
                {r.isTarget && <Target size={28} className="stroke-[3px]" />}
                {r.cap}
                {r.isTarget && (
                  <span className="hidden md:inline-block text-xs font-mono font-black bg-black text-white px-3 py-1.5 ml-auto">
                    TARGET
                  </span>
                )}
              </div>
              <div className="p-6 md:p-8 text-center font-mono font-bold text-xl md:text-2xl border-r-4 border-black flex items-center justify-center">{r.before}</div>
              <div className="p-6 md:p-8 text-center font-mono font-bold text-xl md:text-2xl border-r-4 border-black flex items-center justify-center">{r.after}</div>
              <div className={`p-6 md:p-8 text-center font-mono font-black text-2xl md:text-3xl flex items-center justify-center ${r.isTarget ? "text-error" : ""}`}>
                {r.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-16 p-10 border-4 border-black bg-white shadow-[12px_12px_0_0_#000] flex flex-col md:flex-row items-center md:items-start gap-8 relative max-w-5xl mx-auto">
          <div className="absolute top-0 right-0 w-10 h-10 border-b-4 border-l-4 border-black bg-highlight"></div>
          <CheckCircle2 size={56} className="text-black shrink-0 stroke-[3px]" />
          <div>
            <div className="font-black text-3xl uppercase mb-4 text-center md:text-left">Verdict: PASS</div>
            <p className="font-mono font-bold text-xl leading-loose text-center md:text-left">
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
    <Section id="research" className="py-32 bg-white">
      <div className="w-full max-w-[1600px] px-[8px] md:px-8 mx-auto">
        <div className="flex flex-col items-center mb-24 text-center">
          <span className="text-sm font-black font-mono tracking-widest uppercase border-2 border-black bg-black text-white px-5 py-2.5 shadow-[6px_6px_0_0_#ffff00] mb-10 inline-block">Transparency</span>
          <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter leading-[1]">
            What This Is{" "}
            <br className="md:hidden" />
            <span className="bg-highlight border-4 border-black px-5 py-2 shadow-[6px_6px_0_0_#000] inline-block -rotate-2 ml-4 mt-6 md:mt-0">(And Isn&apos;t)</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="p-10 md:p-14 border-[8px] border-black bg-bg-alt shadow-[16px_16px_0_0_#000]">
            <h3 className="font-black text-3xl mb-10 flex items-center gap-5 uppercase">
              <CheckCircle2 size={36} className="stroke-[3px]" /> What We Do
            </h3>
            <ul className="space-y-8">
              {[
                "Gradient-based model editing to reduce specific capabilities",
                "Controlled probing to measure observed capability changes",
                "Retain-aware optimization to preserve unrelated skills",
                "Robustness testing against prompt rewording",
                "Full reproducibility with provenance tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-5 font-mono font-bold text-lg leading-relaxed">
                  <span className="text-black font-black mt-1">→</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-10 md:p-14 border-[8px] border-black bg-black text-white shadow-[16px_16px_0_0_#ffff00]">
            <h3 className="font-black text-3xl mb-10 flex items-center gap-5 uppercase">
              <XCircle size={36} className="stroke-[3px]" /> What We Don&apos;t Claim
            </h3>
            <ul className="space-y-8">
              {[
                "We do NOT inspect internal model weights or knowledge",
                "We do NOT claim complete knowledge deletion",
                "We do NOT guarantee theoretical machine unlearning",
                "Results are empirical, measured through experiments",
                "Residual capability may exist beyond probe coverage",
              ].map((item) => (
                <li key={item} className="flex items-start gap-5 font-mono font-bold text-lg leading-relaxed">
                  <span className="text-highlight font-black mt-1">→</span>{item}
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
    <Section className="py-40 bg-bg-alt">
      <div className="max-w-[1100px] mx-auto px-[8px] md:px-8">
        <div className="border-[8px] border-black bg-highlight p-12 md:p-24 text-center shadow-[20px_20px_0_0_#000]">
          <h2 className="text-[clamp(3.5rem,7vw,6rem)] font-black uppercase tracking-tighter mb-10 leading-[1]">
            Ready to <span className="bg-white px-5 py-2 border-[6px] border-black inline-block mt-4 md:mt-0 md:ml-4">Unlearn</span>?
          </h2>
          <p className="font-mono font-bold text-xl md:text-2xl mb-14 max-w-3xl mx-auto bg-black text-white p-8 leading-relaxed">
            Upload a model. Establish a baseline. Run unlearning. Verify results.
            Start experimenting today.
          </p>
          <Link href="/signup" className="btn-primary bg-black text-white text-xl px-14 py-6 hover:bg-white hover:text-black shadow-[8px_8px_0_0_#fff] border-4">
            Get Started Free <ArrowRight size={28} className="stroke-[3px]" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ FOOTER ════════════ */
function Footer() {
  return (
    <footer className="py-16 px-[8px] md:px-8 bg-black text-white border-t-[16px] border-highlight">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center">
            <span className="text-black font-serif font-black text-2xl">N</span>
          </div>
          <span className="font-serif font-black text-2xl uppercase tracking-widest">
            NullMind
          </span>
        </div>
        <p className="text-sm font-bold font-mono uppercase tracking-widest border-2 border-white/20 p-5 bg-white/5 text-center md:text-left">
          Built with PyTorch · HuggingFace · FastAPI · Next.js
        </p>
        <p className="text-sm font-bold font-mono uppercase bg-highlight text-black px-6 py-3 font-black border-2 border-black">
          © 2026 NullMind
        </p>
      </div>
    </footer>
  );
}

/* ════════════ PAGE ════════════ */
export default function Home() {
  return (
    <main className="pt-[80px]">
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
