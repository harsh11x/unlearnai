"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Brain, Eye, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, ChevronDown, Zap, Play
} from "lucide-react";

/* ─── Animated section wrapper (Animations removed for brutalism) ─── */
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
      {/* Brutalist Grid is in globals.css applied to body, so we let it show or override here */}
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDM5LjVoNDBWMDBIMHYzOS41eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>

      <div className="w-full px-[5px] mx-auto pt-24 pb-16 relative z-10">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-3 px-4 py-2 border-2 border-black bg-white shadow-[2px_2px_0_0_#000] mb-8">
          <div className="w-3 h-3 bg-error border border-black" />
          <span className="text-xs font-bold font-mono tracking-widest uppercase text-black">
            Open Research Platform — v1.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="uppercase space-y-4">
          <span className="block text-[clamp(2.5rem,5vw,5rem)] leading-[0.9] font-black tracking-tighter">
            Selectively
          </span>
          <span className="block text-[clamp(3rem,6vw,6rem)] leading-[0.8] font-bold font-serif text-white bg-black inline-block px-4 py-2 border-2 border-black my-4 shadow-[4px_4px_0_0_#000] transform -rotate-1">
            UNLEARN
          </span>
          <span className="block text-[clamp(2.5rem,5vw,5rem)] leading-[0.9] font-black tracking-tighter">
            AI Models
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-8 text-lg md:text-xl font-bold font-mono text-black max-w-2xl leading-relaxed border-l-4 border-black pl-6 bg-white p-6 shadow-[4px_4px_0_0_#000]">
          A production platform for{" "}
          <span className="bg-highlight px-2 py-1 border-2 border-black inline-block my-1">measured capability reduction</span>{" "}
          in language models. Forget what you need to.{" "}
          <span className="underline decoration-4 underline-offset-4 mt-1 inline-block">Keep what matters.</span>
        </p>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 mt-10">
          <Link href="/signup" className="btn-primary text-base px-8 py-4 border-2">
            Start Experimenting <ArrowRight size={20} className="stroke-[3px]" />
          </Link>
          <Link href="/#how-it-works" className="btn-outline text-base px-8 py-4 bg-white border-2">
            See How It Works
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "20+", label: "Probe Categories" },
            { value: "89", label: "Evaluation Probes" },
            { value: "2", label: "Unlearning Methods" },
            { value: "5", label: "Languages Supported" },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-white border-2 border-black p-6 shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all">
              <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-highlight stroke-black mb-2" style={{ WebkitTextStroke: "1px black" }}>{stat.value}</div>
              <div className="text-xs font-bold font-mono uppercase mt-4 border-t-2 border-black pt-4">{stat.label}</div>
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
    <Section className="py-20 bg-white">
      <div className="w-full px-[5px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="border-4 border-black p-8 bg-highlight shadow-[8px_8px_0_0_#000]">
            <span className="text-xs font-black font-mono tracking-widest uppercase bg-black text-white px-3 py-1.5 inline-block mb-4">The Problem</span>
            <h2 className="mt-6 text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[1] uppercase tracking-tighter mb-8">
              AI Models<br/>
              <span className="text-white mt-2 inline-block" style={{ WebkitTextStroke: "2px black" }}>Can&apos;t Forget</span>
            </h2>
            <p className="mt-8 font-mono text-base font-bold leading-relaxed bg-white border-2 border-black p-6 shadow-[4px_4px_0_0_#000]">
              Once trained, language models permanently encode their training data.
              They can reproduce copyrighted code, leak private information, and
              generate harmful content — with{" "}
              <span className="bg-error text-white px-1.5 py-0.5 inline-block my-1">no way to selectively remove</span>{" "}
              specific knowledge.
            </p>
          </div>
          <div className="space-y-6">
            {[
              "Models memorize training data permanently",
              "No built-in mechanism to forget specific knowledge",
              "Retraining from scratch is expensive and wasteful",
              "Privacy regulations demand right to erasure",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-center gap-6 p-6 border-2 border-black bg-white hover:bg-highlight hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
              >
                <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_#ffff00]">
                  <span className="text-highlight text-xl font-black font-mono">{i + 1}</span>
                </div>
                <span className="text-black font-bold font-mono text-base uppercase leading-snug">{text}</span>
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
    <Section id="how-it-works" className="py-20 bg-bg-alt">
      <div className="w-full px-[5px] mx-auto">
        <div className="mb-16 border-b-[6px] border-black pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-xs font-black font-mono tracking-widest uppercase bg-black text-highlight px-3 py-1.5 inline-block mb-4">Process</span>
            <h2 className="mt-4 text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter leading-[1]">
              How It <span className="bg-highlight px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_#000] inline-block mt-2 md:mt-0">Works</span>
            </h2>
          </div>
          <p className="font-mono font-bold max-w-sm text-lg border-l-4 border-black pl-6 pb-2">
            Six steps from upload to verified unlearning. Every result is reproducible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="p-8 border-4 border-black bg-white shadow-[6px_6px_0_0_#000] hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[12px_12px_0_0_#000] transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-8">
                <span className="text-4xl">{step.icon}</span>
                <span className="font-mono text-3xl font-black text-black/20">{step.num}</span>
              </div>
              <h3 className="text-xl font-black uppercase mb-6 bg-highlight inline-block self-start px-3 py-1 border-2 border-black">
                {step.title}
              </h3>
              <p className="font-mono font-bold text-sm leading-relaxed mb-8 flex-grow">{step.desc}</p>
              <div className="text-[10px] font-black font-mono bg-black text-white px-4 py-2 uppercase border-l-4 border-highlight">
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
    <Section className="py-20 bg-white">
      <div className="w-full px-[5px] mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-black font-mono tracking-widest uppercase bg-highlight border-2 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] inline-block mb-6">Architecture</span>
          <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase tracking-tighter leading-[1]">
            The Scientific <span className="underline decoration-8 underline-offset-8 decoration-highlight inline-block mt-2">Loop</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 border-[6px] border-black shadow-[12px_12px_0_0_#000]">
          {/* Baseline */}
          <div className="bg-white p-8 md:p-10 border-b-[6px] lg:border-b-0 lg:border-r-[6px] border-black relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-xs px-4 py-2 border-b-4 border-l-4 border-black">PHASE 1</div>
            <h3 className="text-2xl font-black uppercase mt-6 mb-8">Baseline</h3>
            <div className="space-y-4">
              {["Load original model", "Run 89 probes", "Measure Python: 50%", "Measure JS/TS/C++: 75%"].map((item) => (
                <div key={item} className="flex items-center gap-4 font-mono font-bold text-sm border-2 border-black p-3 bg-bg-alt">
                  <CheckCircle2 size={20} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Unlearning */}
          <div className="bg-highlight p-8 md:p-10 border-b-[6px] lg:border-b-0 lg:border-r-[6px] border-black relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-xs px-4 py-2 border-b-4 border-l-4 border-black">PHASE 2</div>
            <h3 className="text-2xl font-black uppercase mt-6 mb-8">Unlearn</h3>
            <div className="space-y-4">
              {["Gradient ascent on Python", "Gradient descent on retain", "Optimize dual objective", "Save new model version"].map((item) => (
                <div key={item} className="flex items-center gap-4 font-mono font-bold text-sm border-2 border-black p-3 bg-white">
                  <Zap size={20} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verify */}
          <div className="bg-white p-8 md:p-10 relative">
            <div className="absolute top-0 right-0 bg-black text-white font-mono font-black text-xs px-4 py-2 border-b-4 border-l-4 border-black">PHASE 3</div>
            <h3 className="text-2xl font-black uppercase mt-6 mb-8">Verify</h3>
            <div className="space-y-4">
              {["Re-run same 89 probes", "Python: 50% → 0%", "JS/TS/C++: Preserved", "Verdict: PASS"].map((item) => (
                <div key={item} className="flex items-center gap-4 font-mono font-bold text-sm border-2 border-black p-3 bg-bg-alt">
                  <BarChart3 size={20} className="stroke-[3px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="flex justify-center mt-12">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base font-black font-mono uppercase bg-black text-white p-4 border-2 border-black shadow-[6px_6px_0_0_#ffff00]">
            <span>Original</span>
            <ArrowRight size={20} className="text-highlight stroke-[3px]" />
            <span className="text-highlight">Unlearned</span>
            <ArrowRight size={20} className="text-highlight stroke-[3px]" />
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
    <Section id="features" className="py-20 bg-bg-alt">
      <div className="w-full px-[5px] mx-auto">
        <div className="flex flex-col items-center mb-16 text-center">
          <span className="text-xs font-black font-mono tracking-widest uppercase bg-black text-white px-4 py-2 border-2 border-black shadow-[4px_4px_0_0_#ffff00] mb-6 inline-block">Capabilities</span>
          <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase tracking-tighter leading-[1]">
            Built for <br className="md:hidden" /><span className="bg-white border-4 border-black px-3 py-1.5 shadow-[4px_4px_0_0_#000] inline-block mt-4 md:mt-0 md:ml-3">Research</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-8 border-4 border-black bg-white shadow-[6px_6px_0_0_#000] hover:bg-black hover:text-white transition-colors group"
            >
              <div className="w-16 h-16 bg-highlight border-4 border-black flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-colors">
                <f.icon size={32} className="stroke-[3px]" />
              </div>
              <h3 className="text-xl font-black uppercase mb-4">{f.title}</h3>
              <p className="font-mono font-bold text-sm leading-relaxed opacity-90">{f.desc}</p>
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
    <Section className="py-20 bg-highlight">
      <div className="w-full px-[5px] mx-auto">
        <div className="mb-16 border-b-[6px] border-black pb-8 flex flex-col lg:flex-row justify-between lg:items-end gap-8">
          <div>
            <span className="text-xs font-black font-mono tracking-widest uppercase bg-black text-white px-3 py-1.5 inline-block mb-6">Proof of Concept</span>
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter leading-[0.9]">
              Real <span className="text-white bg-black px-3 inline-block my-2" style={{ WebkitTextStroke: "1px black" }}>Results</span>
            </h2>
          </div>
          <p className="font-mono font-bold max-w-lg text-lg border-l-4 border-black pl-6 bg-white p-6 shadow-[4px_4px_0_0_#000]">
            Tested on <span className="bg-black text-white px-2 py-0.5 inline-block my-1">Salesforce/codegen-350M</span>.<br/><br/>
            Python capability reduced while other languages preserved.
          </p>
        </div>

        <div className="border-[6px] border-black bg-white shadow-[12px_12px_0_0_#000]">
          {/* Header */}
          <div className="grid grid-cols-4 bg-black text-white text-sm font-black uppercase font-mono tracking-widest border-b-4 border-black">
            <div className="p-4 md:p-6 border-r-4 border-black">Capability</div>
            <div className="p-4 md:p-6 border-r-4 border-black text-center">Before</div>
            <div className="p-4 md:p-6 border-r-4 border-black text-center">After</div>
            <div className="p-4 md:p-6 text-center">Change</div>
          </div>

          {/* Rows */}
          {results.map((r, idx) => (
            <div
              key={r.cap}
              className={`grid grid-cols-4 border-b-4 border-black last:border-b-0 hover:bg-bg-alt transition-none ${r.isTarget ? "bg-highlight/30" : ""}`}
            >
              <div className="p-4 md:p-6 font-black uppercase flex items-center gap-3 border-r-4 border-black text-base md:text-lg">
                {r.isTarget && <Target size={24} className="stroke-[3px]" />}
                {r.cap}
                {r.isTarget && (
                  <span className="hidden md:inline-block text-[10px] font-mono font-black bg-black text-white px-2 py-1 ml-auto">
                    TARGET
                  </span>
                )}
              </div>
              <div className="p-4 md:p-6 text-center font-mono font-bold text-lg border-r-4 border-black flex items-center justify-center">{r.before}</div>
              <div className="p-4 md:p-6 text-center font-mono font-bold text-lg border-r-4 border-black flex items-center justify-center">{r.after}</div>
              <div className={`p-4 md:p-6 text-center font-mono font-black text-xl flex items-center justify-center ${r.isTarget ? "text-error" : ""}`}>
                {r.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-12 p-8 border-4 border-black bg-white shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row items-center md:items-start gap-6 relative">
          <div className="absolute top-0 right-0 w-8 h-8 border-b-4 border-l-4 border-black bg-highlight"></div>
          <CheckCircle2 size={40} className="text-black shrink-0 stroke-[3px]" />
          <div>
            <div className="font-black text-2xl uppercase mb-4">Verdict: PASS</div>
            <p className="font-mono font-bold text-lg max-w-3xl leading-relaxed">
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
    <Section id="research" className="py-20 bg-white">
      <div className="w-full px-[5px] mx-auto">
        <div className="flex flex-col items-center mb-16 text-center">
          <span className="text-xs font-black font-mono tracking-widest uppercase border-2 border-black bg-black text-white px-4 py-2 shadow-[4px_4px_0_0_#ffff00] mb-8 inline-block">Transparency</span>
          <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase tracking-tighter leading-[1]">
            What This Is{" "}
            <br className="md:hidden" />
            <span className="bg-highlight border-4 border-black px-4 py-1.5 shadow-[4px_4px_0_0_#000] inline-block -rotate-2 ml-3 mt-4 md:mt-0">(And Isn&apos;t)</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
          <div className="p-8 md:p-12 border-[6px] border-black bg-bg-alt shadow-[12px_12px_0_0_#000]">
            <h3 className="font-black text-2xl mb-8 flex items-center gap-4 uppercase">
              <CheckCircle2 size={28} className="stroke-[3px]" /> What We Do
            </h3>
            <ul className="space-y-6">
              {[
                "Gradient-based model editing to reduce specific capabilities",
                "Controlled probing to measure observed capability changes",
                "Retain-aware optimization to preserve unrelated skills",
                "Robustness testing against prompt rewording",
                "Full reproducibility with provenance tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-4 font-mono font-bold text-base leading-relaxed">
                  <span className="text-black font-black mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 md:p-12 border-[6px] border-black bg-black text-white shadow-[12px_12px_0_0_#ffff00]">
            <h3 className="font-black text-2xl mb-8 flex items-center gap-4 uppercase">
              <XCircle size={28} className="stroke-[3px]" /> What We Don&apos;t Claim
            </h3>
            <ul className="space-y-6">
              {[
                "We do NOT inspect internal model weights or knowledge",
                "We do NOT claim complete knowledge deletion",
                "We do NOT guarantee theoretical machine unlearning",
                "Results are empirical, measured through experiments",
                "Residual capability may exist beyond probe coverage",
              ].map((item) => (
                <li key={item} className="flex items-start gap-4 font-mono font-bold text-base leading-relaxed">
                  <span className="text-highlight font-black mt-0.5">→</span>{item}
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
    <Section className="py-24 bg-bg-alt">
      <div className="max-w-[900px] mx-auto px-[5px]">
        <div className="border-[8px] border-black bg-highlight p-10 md:p-20 text-center shadow-[16px_16px_0_0_#000]">
          <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tighter mb-8 leading-[1]">
            Ready to <span className="bg-white px-4 py-1 border-[6px] border-black inline-block mt-4 md:mt-0 md:ml-3">Unlearn</span>?
          </h2>
          <p className="font-mono font-bold text-lg md:text-xl mb-10 max-w-2xl mx-auto bg-black text-white p-6 leading-relaxed">
            Upload a model. Establish a baseline. Run unlearning. Verify results.
            Start experimenting today.
          </p>
          <Link href="/signup" className="btn-primary bg-black text-white text-xl px-12 py-5 hover:bg-white hover:text-black shadow-[6px_6px_0_0_#fff] border-4">
            Get Started Free <ArrowRight size={24} className="stroke-[3px]" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ════════════ FOOTER ════════════ */
function Footer() {
  return (
    <footer className="py-12 px-[5px] bg-black text-white border-t-[12px] border-highlight">
      <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border-4 border-black flex items-center justify-center">
            <span className="text-black font-serif font-black text-xl">N</span>
          </div>
          <span className="font-serif font-black text-xl uppercase tracking-widest">
            NullMind
          </span>
        </div>
        <p className="text-xs font-bold font-mono uppercase tracking-widest border-2 border-white/20 p-4 bg-white/5">
          Built with PyTorch · HuggingFace · FastAPI · Next.js
        </p>
        <p className="text-xs font-bold font-mono uppercase bg-highlight text-black px-4 py-2 font-black border-2 border-black">
          © 2026 NullMind
        </p>
      </div>
    </footer>
  );
}

/* ════════════ PAGE ════════════ */
export default function Home() {
  return (
    <main className="pt-[70px]">
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
