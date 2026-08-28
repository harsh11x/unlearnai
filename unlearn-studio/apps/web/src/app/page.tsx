"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DeepMindNeuralCanvas from "@/components/visual/DeepMindNeuralCanvas";
import ModelBeforeAfterSlider from "@/components/visual/ModelBeforeAfterSlider";
import NeuralNodeErasureSandbox from "@/components/visual/NeuralNodeErasureSandbox";
import ComputeReductionCalculator from "@/components/visual/ComputeReductionCalculator";
import LivePromptProbeSandbox from "@/components/visual/LivePromptProbeSandbox";

import {
  ArrowRight, Target, CheckCircle2, XCircle,
  Shield, GitBranch, Database, Cpu,
  Layers, ArrowUpRight, Lock, Zap, RefreshCw, Scale, Terminal
} from "lucide-react";

/* ════════════ HERO SECTION ════════════ */
function Hero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center pt-32 sm:pt-36 md:pt-40 pb-20 md:pb-28 bg-slate-50 clean-grid border-b border-slate-200/80 overflow-hidden font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto my-auto relative z-10">
        
        {/* Main Grid: Left Headline & Mission vs Right Live Deep Mind Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="clean-badge">
                <span className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                NULLMIND V1.0 // LLM UNLEARN ENGINE
              </span>
              <span className="font-mono text-xs font-semibold bg-white text-slate-700 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                PRODUCTION SOFTWARE
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-slate-900 font-sans">
              SELECTIVELY <br />
              <span className="bg-slate-900 text-white px-3 py-1 inline-block my-2 rounded-xl shadow-lg">
                UNLEARN & RETRAIN
              </span> <br />
              AI MODELS.
            </h1>

            {/* Mission Box */}
            <div className="clean-card p-6 bg-white space-y-4">
              <p className="font-sans text-xs md:text-sm font-medium text-slate-700 leading-relaxed">
                NullMind is an open production platform for{" "}
                <span className="bg-slate-100 text-slate-900 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                  measured LLM capability reduction & targeted retraining
                </span>. Surgically erase copyrighted code, PII, and unsafe data without spending $100k+ to retrain full model weights from scratch.
              </p>

              {/* 4 Pillars Summary */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 font-sans text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Target Ascent
                </div>
                <div className="flex items-center gap-1.5 text-slate-900">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Retain Loss
                </div>
                <div className="flex items-center gap-1.5 text-slate-900">
                  <CheckCircle2 size={14} className="text-emerald-600" /> 89 Probes Battery
                </div>
                <div className="flex items-center gap-1.5 text-slate-900">
                  <CheckCircle2 size={14} className="text-emerald-600" /> PDF Audit Report
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/#node-sandbox" className="clean-btn-primary text-xs py-3.5 px-7">
                Play With Node Sandbox <ArrowRight size={15} />
              </Link>
              <Link href="/#calculator" className="clean-btn-secondary text-xs py-3.5 px-7">
                Calculate Compute Savings <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          {/* Right Column: Embedded Deep Mind Canvas (Span 7) */}
          <div id="deep-mind" className="lg:col-span-7 w-full">
            <DeepMindNeuralCanvas />
          </div>

        </div>

      </div>
    </section>
  );
}

/* ════════════ BEFORE VS AFTER COMPARISON SLIDER ════════════ */
function ComparisonSection() {
  return (
    <section id="transformation" className="relative py-24 sm:py-32 bg-white border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto space-y-10">
        
        <div className="max-w-3xl">
          <div className="clean-badge mb-3">01 // BEFORE & AFTER MODEL TRANSFORMATION</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Bloated Error State vs. Streamlined Retrained Model
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
            See how AI models behave before using NullMind (high compute cost, error prone, GDPR non-compliant) vs after targeted node erasure (94% compute savings, 0% residual target).
          </p>
        </div>

        {/* Embedded Interactive Slider Component */}
        <ModelBeforeAfterSlider />

      </div>
    </section>
  );
}

/* ════════════ PLAYABLE NODE ERASURE SANDBOX ════════════ */
function NodeSandboxSection() {
  return (
    <section id="node-sandbox" className="relative py-24 sm:py-32 bg-slate-50 clean-grid border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        {/* Embedded Interactive Node Sandbox Component */}
        <NeuralNodeErasureSandbox />

      </div>
    </section>
  );
}

/* ════════════ COMPUTE REDUCTION CALCULATOR ════════════ */
function CalculatorSection() {
  return (
    <section id="calculator" className="relative py-24 sm:py-32 bg-white clean-grid-dense border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        {/* Embedded Interactive Calculator Component */}
        <ComputeReductionCalculator />

      </div>
    </section>
  );
}

/* ════════════ LIVE PROBE TERMINAL SANDBOX ════════════ */
function PromptSandboxSection() {
  return (
    <section id="probe-sandbox" className="relative py-24 sm:py-32 bg-slate-50 clean-grid border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        {/* Embedded Interactive Terminal Sandbox Component */}
        <LivePromptProbeSandbox />

      </div>
    </section>
  );
}

/* ════════════ REAL RESULTS SCORECARD ════════════ */
function ResultsSection() {
  const results = [
    { cap: "Python Code Generation", before: "50.0%", after: "0.0%", delta: "-50.0%", isTarget: true },
    { cap: "JavaScript Code Generation", before: "50.0%", after: "50.0%", delta: "0.0%", isTarget: false },
    { cap: "TypeScript Syntax & Types", before: "100.0%", after: "100.0%", delta: "0.0%", isTarget: false },
    { cap: "C++ Memory Management", before: "75.0%", after: "75.0%", delta: "0.0%", isTarget: false },
    { cap: "General Algorithmic Logic", before: "16.7%", after: "16.7%", delta: "0.0%", isTarget: false },
  ];

  return (
    <section id="results" className="relative py-24 sm:py-32 bg-white border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <div className="clean-badge">02 // PROOF OF CONCEPT BENCHMARK</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Real Evaluation Scorecard
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tested on <span className="font-bold text-slate-900">Salesforce/codegen-350M</span> checkpoint. Target Python capability eliminated with zero collateral damage on JS/TS/C++.
            </p>

            <div className="clean-card p-6 bg-slate-50">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="font-sans text-sm font-bold text-slate-900 uppercase">VERDICT: PASS AUDIT</div>
                  <div className="font-sans text-xs text-slate-600 mt-0.5">100% of collateral capability sets preserved.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 clean-card p-6 bg-white">
            <div className="font-mono text-xs font-semibold uppercase bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center mb-4">
              <span>EVALUATION METRICS TABLE</span>
              <span>codegen-350m-v2</span>
            </div>

            <div className="divide-y divide-slate-200">
              <div className="grid grid-cols-4 font-sans text-xs font-semibold text-slate-500 p-3 bg-slate-50 rounded-lg">
                <div>CAPABILITY</div>
                <div className="text-center">BEFORE</div>
                <div className="text-center">AFTER</div>
                <div className="text-center">DELTA</div>
              </div>

              {results.map((r) => (
                <div 
                  key={r.cap} 
                  className={`grid grid-cols-4 font-sans text-xs sm:text-sm font-medium p-3.5 items-center ${
                    r.isTarget ? "bg-rose-50/50 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {r.isTarget && <Target size={14} className="text-rose-600 shrink-0" />}
                    {r.cap}
                    {r.isTarget && <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md ml-1 hidden sm:inline-block">TARGET</span>}
                  </div>
                  <div className="text-center text-slate-600">{r.before}</div>
                  <div className="text-center text-slate-600">{r.after}</div>
                  <div className={`text-center font-bold ${r.isTarget ? "text-rose-600" : "text-slate-500"}`}>
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
    <section id="research" className="relative py-24 sm:py-32 bg-slate-50 clean-grid border-b border-slate-200/80 font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="clean-badge mb-3">03 // TRANSPARENCY NOTICE</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            What We Do (And Don't Claim)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="clean-card p-6 md:p-8 bg-white">
            <h3 className="font-sans text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" /> WHAT WE DO
            </h3>
            <ul className="font-sans text-xs sm:text-sm font-medium text-slate-600 space-y-3">
              <li className="flex items-start gap-2"><span>■</span> Gradient-based model editing to reduce specific capability domains</li>
              <li className="flex items-start gap-2"><span>■</span> Controlled probing battery to empirically measure output delta</li>
              <li className="flex items-start gap-2"><span>■</span> Retain-aware optimization loss to preserve collateral skills</li>
              <li className="flex items-start gap-2"><span>■</span> Robustness tests against paraphrased and indirect prompts</li>
            </ul>
          </div>

          <div className="clean-card p-6 md:p-8 bg-white">
            <h3 className="font-sans text-base font-bold text-slate-900 uppercase border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
              <XCircle size={20} className="text-rose-600" /> WHAT WE DON'T CLAIM
            </h3>
            <ul className="font-sans text-xs sm:text-sm font-medium text-slate-600 space-y-3">
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

/* ════════════ FINAL CTA SECTION ════════════ */
function CTASection() {
  return (
    <section className="relative py-20 sm:py-28 bg-white font-sans">
      <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
        
        <div className="clean-card p-10 md:p-14 text-center bg-slate-950 text-white space-y-5 rounded-3xl shadow-2xl border border-slate-800">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Ready to Unlearn & Retrain Your Models?
          </h2>
          
          <p className="font-sans text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Upload your model checkpoint, run probe baseline, select target capability, and verify unlearning within minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/#node-sandbox" className="clean-btn-primary text-sm py-3.5 px-8">
              Play With Node Sandbox →
            </Link>
            <Link href="/#calculator" className="clean-btn-secondary text-sm py-3.5 px-8">
              Calculate Compute Savings ↗
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
    <main className="pt-[72px] bg-slate-50 min-h-screen">
      <Header />
      <Hero />
      <ComparisonSection />
      <NodeSandboxSection />
      <CalculatorSection />
      <PromptSandboxSection />
      <ResultsSection />
      <ResearchSection />
      <CTASection />
      <Footer />
    </main>
  );
}
