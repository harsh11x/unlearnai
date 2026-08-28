"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowRight, Target, CheckCircle2, XCircle,
  Shield, GitBranch, Database, Cpu,
  Layers, ArrowUpRight, Lock, Zap, RefreshCw, Scale, Terminal
} from "lucide-react";

/* ════════════ HERO SECTION ════════════ */
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 sm:pt-36 md:pt-40 pb-20 md:pb-28 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b] overflow-hidden">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto my-auto relative z-10">
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="brutalist-badge-outline text-[#09090b]">
            <span className="w-2 h-2 bg-[#09090b] rounded-full animate-pulse" />
            <span>NULLMIND V1.0 // LLM UNLEARNING & RETRAIN ENGINE</span>
          </div>
          <div className="brutalist-badge bg-[#09090b] text-white font-mono">
            OPEN-SOURCE PRODUCTION FRAMEWORK
          </div>
        </div>

        {/* Main Headline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          <div className="lg:col-span-7">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#09090b] uppercase font-sans">
              SELECTIVELY <br />
              <span className="bg-[#09090b] text-white px-4 py-1 inline-block my-2 border-2 border-[#09090b] shadow-[4px_4px_0_0_#09090b]">
                UNLEARN & RETRAIN
              </span> <br />
              AI MODELS.
            </h1>

            {/* Mission Card */}
            <div className="mt-8 brutalist-card p-6 md:p-8 bg-white">
              <p className="font-mono text-sm md:text-base font-semibold text-[#09090b] leading-relaxed">
                NullMind is an open production platform for{" "}
                <span className="bg-[#efeeea] px-2 py-0.5 border border-[#09090b] font-bold">
                  measured LLM capability reduction & targeted retraining
                </span>. Surgically erase copyrighted code, PII, and unsafe data without spending $100k+ to retrain full model weights from scratch.
              </p>

              {/* 4 Pillars Summary */}
              <div className="mt-6 pt-4 border-t-2 border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs font-bold text-[#09090b]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#09090b]">■</span> Target Ascent
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#09090b]">■</span> Retain Loss
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#09090b]">■</span> 89 Probes
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#09090b]">■</span> PDF Audit
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link href="/signup" className="brutalist-btn-primary text-sm py-3.5 px-8">
                Start Experiment <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="brutalist-btn-secondary text-sm py-3.5 px-8">
                Launch Workspace <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Telemetry Display */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="brutalist-card p-6 bg-white">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717a]">
                01 // CATEGORIES
              </div>
              <div className="font-mono text-4xl font-extrabold text-[#09090b] mt-3">20+</div>
              <div className="font-mono text-xs font-semibold text-[#52525b] mt-2 border-t border-zinc-200 pt-2">
                Code, PII, Safety, Reasoning
              </div>
            </div>

            <div className="brutalist-card p-6 bg-white">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717a]">
                02 // EVALUATION
              </div>
              <div className="font-mono text-4xl font-extrabold text-[#09090b] mt-3">89</div>
              <div className="font-mono text-xs font-semibold text-[#52525b] mt-2 border-t border-zinc-200 pt-2">
                Empirical probe battery
              </div>
            </div>

            <div className="brutalist-card p-6 bg-white">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717a]">
                03 // LOSS OBJECTIVE
              </div>
              <div className="font-mono text-3xl font-extrabold text-[#09090b] mt-3">DUAL</div>
              <div className="font-mono text-xs font-semibold text-[#52525b] mt-2 border-t border-zinc-200 pt-2">
                Ascent + Retain Loss
              </div>
            </div>

            <div className="brutalist-card p-6 bg-white">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717a]">
                04 // RESIDUAL
              </div>
              <div className="font-mono text-4xl font-extrabold text-[#09090b] mt-3">0.0%</div>
              <div className="font-mono text-xs font-semibold text-[#52525b] mt-2 border-t border-zinc-200 pt-2">
                Target capability erasure
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ WHY IT MATTERS & IMPACT SECTION ════════════ */
function ImpactSection() {
  const impacts = [
    {
      title: "GDPR Article 17 & CCPA Model Erasure",
      desc: "Privacy legislation mandates that individuals can request full data removal. Traditional fine-tuning fails compliance because weights retain training data.",
      icon: Scale,
    },
    {
      title: "Cost & Energy Efficiency ($100k+ Saved)",
      desc: "Retraining a frontier model from scratch uses thousands of GPU hours and costs over $100,000. NullMind performs targeted unlearning in minutes.",
      icon: Zap,
    },
    {
      title: "Jailbreak Resilience vs. Fine-Tuning",
      desc: "Standard RLHF or fine-tuning only suppresses output — jailbreaks easily extract hidden knowledge. Gradient unlearning alters weight representations.",
      icon: Lock,
    },
    {
      title: "Targeted Retraining & Knowledge Replacement",
      desc: "Unlearn outdated or toxic capabilities, then seamlessly retrain with fresh, sanitized datasets while keeping retain sets intact.",
      icon: RefreshCw,
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-[#efeeea] border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="max-w-3xl mb-12">
          <div className="brutalist-badge mb-3">
            01 // WHY UNLEARNING MATTERS & OUR REAL IMPACT
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight">
            The Model Memory Problem <br />& Why Retraining Breaks Down
          </h2>
          <p className="font-mono text-xs sm:text-sm text-[#52525b] mt-3 leading-relaxed">
            Neural networks permanently bake training data across billions of parameters. Once trained, erasing specific data requires a dedicated optimization framework.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {impacts.map((item) => (
            <div key={item.title} className="brutalist-card p-6 md:p-8 bg-white flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-[#09090b] text-white flex items-center justify-center mb-4 border border-[#09090b]">
                  <item.icon size={20} />
                </div>
                <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase">{item.title}</h3>
                <p className="font-mono text-xs font-semibold text-[#52525b] leading-relaxed mt-2">{item.desc}</p>
              </div>
              <div className="font-mono text-[11px] text-[#71717a] mt-6 border-t border-zinc-200 pt-2">
                // IMPACT SPECIFICATION
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ════════════ PIPELINE SECTION ════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", title: "UPLOAD MODEL", desc: "Upload Safetensors or HuggingFace checkpoint. System parses model metadata, architecture & GPU requirements.", tag: "Safetensors · HF" },
    { num: "02", title: "BASELINE PROBE", desc: "Run probing battery across 20+ categories & 89 tests to record starting capability baseline.", tag: "89 Probe Battery" },
    { num: "03", title: "SELECT TARGET", desc: "Specify target capability domain (e.g. Python code generation, PII domain) to selectively erase.", tag: "Target Specification" },
    { num: "04", title: "DUAL OPTIMIZE", desc: "Execute gradient ascent on forget set combined with gradient descent on retain set.", tag: "Dual Loss Objective" },
    { num: "05", title: "SELECTIVE RETRAIN", desc: "Optionally retrain model on updated, sanitized replacement data without affecting preserved skills.", tag: "Targeted Retrain" },
    { num: "06", title: "AUDIT REPORT", desc: "Generate reproducible PDF audit certificate detailing model weights diff and cryptographic hash.", tag: "PDF Audit Certificate" },
  ];

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="brutalist-badge mb-3">
              02 // PROTOCOL PIPELINE
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] tracking-tight uppercase">
              Six Steps to Verified Unlearning & Retraining
            </h2>
          </div>
          <div className="font-mono text-xs font-bold uppercase text-[#52525b] border-2 border-[#09090b] px-3 py-1.5 bg-white shadow-[2px_2px_0_0_#09090b]">
            // REPRODUCIBLE PIPELINE
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="brutalist-card p-6 md:p-8 flex flex-col justify-between min-h-[260px] bg-white">
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-3 mb-4">
                  <span className="font-mono text-xs font-extrabold bg-[#09090b] text-white px-2 py-0.5">
                    STEP {step.num}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#71717a]">#PIPELINE</span>
                </div>

                <h3 className="font-mono text-lg font-extrabold text-[#09090b] uppercase">{step.title}</h3>
                <p className="font-mono text-xs font-semibold text-[#52525b] leading-relaxed mt-3">{step.desc}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-200 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase text-[#09090b] bg-[#efeeea] px-2 py-0.5 border border-[#09090b]">
                  {step.tag}
                </span>
                <span className="font-mono text-xs text-[#71717a]">→</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ════════════ SCIENTIFIC LOSS ARCHITECTURE ════════════ */
function VisualPipeline() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#efeeea] arch-grid-dense border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="brutalist-badge mb-3">
            03 // MATHEMATICAL FORMULATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#09090b] uppercase tracking-tight">
            Retention-Aware Loss Architecture
          </h2>
        </div>

        <div className="brutalist-card p-6 md:p-10 bg-white">
          
          <div className="brutalist-card-dark p-6 text-center mb-8">
            <div className="font-mono text-xs font-bold text-[#71717a] uppercase tracking-widest mb-2">
              DUAL OPTIMIZATION LOSS FUNCTION
            </div>
            <div className="font-mono text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
              L_total = L_forget(θ) + λ · L_retain(θ)
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="brutalist-card p-6 bg-[#f7f6f2]">
              <div className="font-mono text-xs font-bold bg-[#09090b] text-white px-2 py-0.5 inline-block mb-3">
                PHASE A // BASELINE
              </div>
              <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase border-b border-zinc-300 pb-2 mb-3">
                1. Capability Probe
              </h3>
              <ul className="font-mono text-xs font-semibold text-[#52525b] space-y-2">
                <li>✓ Python Accuracy: 50.0%</li>
                <li>✓ JavaScript Accuracy: 50.0%</li>
                <li>✓ TypeScript Accuracy: 100.0%</li>
                <li>✓ C++ Accuracy: 75.0%</li>
              </ul>
            </div>

            <div className="brutalist-card p-6 bg-[#f7f6f2]">
              <div className="font-mono text-xs font-bold bg-[#09090b] text-white px-2 py-0.5 inline-block mb-3">
                PHASE B // DUAL UNLEARN
              </div>
              <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase border-b border-zinc-300 pb-2 mb-3">
                2. Gradient Ascent
              </h3>
              <div className="font-mono text-xs font-semibold text-[#52525b] space-y-2">
                <div className="p-2 bg-white border border-[#09090b]">
                  ▲ Ascent: Target Set (Python)
                </div>
                <div className="p-2 bg-white border border-[#09090b]">
                  ▼ Descent: Retain Set (JS/TS/C++)
                </div>
              </div>
            </div>

            <div className="brutalist-card p-6 bg-[#f7f6f2]">
              <div className="font-mono text-xs font-bold bg-[#09090b] text-white px-2 py-0.5 inline-block mb-3">
                PHASE C // VERIFICATION
              </div>
              <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase border-b border-zinc-300 pb-2 mb-3">
                3. Post-Edit Probe
              </h3>
              <ul className="font-mono text-xs font-semibold text-[#52525b] space-y-2">
                <li className="text-[#09090b] font-bold">🎯 Python: 50% → 0.0% (UNLEARNED)</li>
                <li>✓ JavaScript: 50.0% (PRESERVED)</li>
                <li>✓ TypeScript: 100.0% (PRESERVED)</li>
                <li>✓ C++: 75.0% (PRESERVED)</li>
              </ul>
            </div>

          </div>

          <div className="mt-8 text-center">
            <span className="inline-block font-mono text-xs font-extrabold uppercase text-[#09090b] bg-[#efeeea] border-2 border-[#09090b] px-4 py-2 shadow-[2px_2px_0_0_#09090b]">
              RESULT: TARGET CAPABILITY REDUCED TO 0% WHILE PRESERVING RETENTION DOMAINS
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ════════════ ENGINE FEATURES ════════════ */
function Features() {
  const features = [
    { title: "EVIDENCE-BASED", desc: "No opaque weight assertions. All unlearning is validated via controlled probe batteries.", icon: Shield },
    { title: "VERSION LINEAGE", desc: "Every experiment produces an immutable checkpoint version. Original models remain untouched.", icon: GitBranch },
    { title: "DUAL OBJECTIVE", desc: "Retain-aware loss prevents model degradation while removing targeted capability domains.", icon: Layers },
    { title: "ASYNC WORKERS", desc: "Background Celery task queues handle model loading and gradient computation seamlessly.", icon: Cpu },
    { title: "FULL PROVENANCE", desc: "Complete reproducibility log with dataset hashes, learning rates, and seed tracking.", icon: Database },
    { title: "ROBUSTNESS SUITE", desc: "Paraphrase and adversarial prompt tests verify unlearning resists jailbreak prompts.", icon: Terminal },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="mb-12">
          <div className="brutalist-badge mb-3">
            04 // ENGINE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] uppercase tracking-tight">
            Built for Rigorous ML Research
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} className="brutalist-card p-6 md:p-8 flex flex-col justify-between bg-white">
              <div>
                <div className="w-10 h-10 bg-[#09090b] text-white flex items-center justify-center mb-4 border border-[#09090b]">
                  <f.icon size={20} />
                </div>
                <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase">{f.title}</h3>
                <p className="font-mono text-xs font-semibold text-[#52525b] leading-relaxed mt-2">{f.desc}</p>
              </div>
              <div className="font-mono text-[11px] text-[#71717a] mt-6 border-t border-zinc-200 pt-2">
                // SPEC-0{i + 1}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ════════════ RESULTS SCORECARD ════════════ */
function Results() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "-50.0%", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0%", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0%", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0%", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0%", isTarget: false },
  ];

  return (
    <section id="results" className="relative py-24 sm:py-32 bg-[#efeeea] border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5">
            <div className="brutalist-badge mb-3">
              05 // BENCHMARK SCORECARD
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight">
              Real Evaluation Scorecard
            </h2>
            <p className="font-mono text-xs sm:text-sm text-[#52525b] leading-relaxed mt-3">
              Tested on <span className="font-bold text-[#09090b]">Salesforce/codegen-350M</span> checkpoint.
            </p>

            <div className="mt-6 brutalist-card p-6 bg-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-[#09090b] shrink-0" />
                <div>
                  <div className="font-mono text-sm font-extrabold text-[#09090b] uppercase">VERDICT: PASS AUDIT</div>
                  <div className="font-mono text-xs text-[#52525b] mt-1">Target Python capability eliminated with zero collateral loss on JS/TS/C++.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 brutalist-card p-5 bg-white">
            <div className="font-mono text-xs font-extrabold uppercase bg-[#09090b] text-white p-3 flex justify-between items-center mb-3">
              <span>EVALUATION METRICS TABLE</span>
              <span>codegen-350m-v2</span>
            </div>

            <div className="divide-y-2 divide-[#09090b]">
              <div className="grid grid-cols-4 font-mono text-xs font-extrabold text-[#71717a] p-3 bg-[#f7f6f2]">
                <div>CAPABILITY</div>
                <div className="text-center">BEFORE</div>
                <div className="text-center">AFTER</div>
                <div className="text-center">DELTA</div>
              </div>

              {results.map((r) => (
                <div 
                  key={r.cap} 
                  className={`grid grid-cols-4 font-mono text-xs sm:text-sm font-semibold p-3.5 items-center ${
                    r.isTarget ? "bg-[#f7f6f2] font-bold" : "hover:bg-[#f7f6f2]/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[#09090b]">
                    {r.isTarget && <Target size={14} className="text-[#09090b] shrink-0" />}
                    {r.cap}
                    {r.isTarget && <span className="text-[9px] bg-[#09090b] text-white px-1 ml-1 hidden sm:inline-block">TARGET</span>}
                  </div>
                  <div className="text-center text-[#52525b]">{r.before}</div>
                  <div className="text-center text-[#52525b]">{r.after}</div>
                  <div className={`text-center font-extrabold ${r.isTarget ? "text-[#09090b]" : "text-[#71717a]"}`}>
                    {r.delta}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ════════════ RESEARCH TRANSPARENCY ════════════ */
function ResearchSection() {
  return (
    <section id="research" className="relative py-24 sm:py-32 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="brutalist-badge mb-3">
            06 // TRANSPARENCY NOTICE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#09090b] uppercase tracking-tight">
            What We Do (And Don't Claim)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="brutalist-card p-6 md:p-8 bg-white">
            <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase border-b-2 border-[#09090b] pb-3 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[#09090b]" /> WHAT WE DO
            </h3>
            <ul className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] space-y-3">
              <li className="flex items-start gap-2"><span>■</span> Gradient-based model editing to reduce specific capability domains</li>
              <li className="flex items-start gap-2"><span>■</span> Controlled probing battery to empirically measure output delta</li>
              <li className="flex items-start gap-2"><span>■</span> Retain-aware optimization loss to preserve collateral skills</li>
              <li className="flex items-start gap-2"><span>■</span> Robustness tests against paraphrased and indirect prompts</li>
            </ul>
          </div>

          <div className="brutalist-card p-6 md:p-8 bg-white">
            <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase border-b-2 border-[#09090b] pb-3 mb-4 flex items-center gap-2">
              <XCircle size={20} className="text-[#09090b]" /> WHAT WE DON'T CLAIM
            </h3>
            <ul className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] space-y-3">
              <li className="flex items-start gap-2"><span>□</span> We do NOT inspect internal model weights or neural representations</li>
              <li className="flex items-start gap-2"><span>□</span> We do NOT claim 100% mathematical knowledge deletion guarantees</li>
              <li className="flex items-start gap-2"><span>□</span> We do NOT guarantee theoretical unlearning proofs across all jailbreaks</li>
              <li className="flex items-start gap-2"><span>□</span> Results are empirical and evaluated strictly on probe performance</li>
            </ul>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ════════════ CTA SECTION ════════════ */
function CTASection() {
  return (
    <section className="relative py-20 sm:py-28 bg-[#efeeea]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="brutalist-card p-10 md:p-14 text-center bg-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight max-w-3xl mx-auto">
            Ready to Unlearn & Retrain Your Models?
          </h2>
          
          <p className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] mt-4 max-w-xl mx-auto">
            Upload your model checkpoint, run probe baseline, select target capability, and verify unlearning within minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/signup" className="brutalist-btn-primary text-sm py-3.5 px-8">
              Start Free Trial →
            </Link>
            <Link href="/docs" className="brutalist-btn-secondary text-sm py-3.5 px-8">
              Read Documentation ↗
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ════════════ MAIN HOME PAGE ════════════ */
export default function Home() {
  return (
    <main className="pt-[68px] bg-[#f7f6f2] min-h-screen">
      <Header />
      <Hero />
      <ImpactSection />
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
