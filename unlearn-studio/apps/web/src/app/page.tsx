"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NeuralVisualizer from "@/components/visual/NeuralVisualizer";
import ModelComparisonSlider from "@/components/visual/ModelComparisonSlider";
import InteractiveProcessExplorer from "@/components/visual/InteractiveProcessExplorer";
import ComputeCalculator from "@/components/visual/ComputeCalculator";
import ProbeSimulator from "@/components/visual/ProbeSimulator";

import {
  ArrowRight, Target, CheckCircle2, XCircle,
  Shield, GitBranch, Database, Cpu,
  Layers, ArrowUpRight, Lock, Zap, RefreshCw, Scale, Terminal
} from "lucide-react";

/* ════════════ HERO SECTION WITH VISUAL CANVAS ════════════ */
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 sm:pt-36 md:pt-40 pb-20 md:pb-28 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b] overflow-hidden">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto my-auto relative z-10 space-y-12">
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="brutalist-badge-outline text-[#09090b]">
            <span className="w-2 h-2 bg-[#09090b] rounded-full animate-pulse" />
            <span>NULLMIND V1.0 // LLM UNLEARNING & RETRAIN ENGINE</span>
          </div>
          <div className="brutalist-badge bg-[#09090b] text-white font-mono">
            INTERACTIVE NEURAL DEEP MIND VISUALIZER
          </div>
        </div>

        {/* Headline */}
        <div className="max-w-4xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#09090b] uppercase font-sans">
            SELECTIVELY <br />
            <span className="bg-[#09090b] text-white px-4 py-1 inline-block my-2 border-2 border-[#09090b] shadow-[4px_4px_0_0_#09090b]">
              UNLEARN & RETRAIN
            </span> <br />
            AI MODELS.
          </h1>

          <p className="font-mono text-sm md:text-base font-semibold text-[#52525b] leading-relaxed mt-6 max-w-3xl">
            Surgically erase targeted copyrighted code, PII, and unsafe neural representations without spending $100k+ to retrain full model parameters from scratch.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <Link href="/signup" className="brutalist-btn-primary text-sm py-3.5 px-8">
              Start Free Experiment <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" className="brutalist-btn-secondary text-sm py-3.5 px-8">
              Launch Studio Workspace <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* Embedded Interactive Canvas Visualizer */}
        <div className="w-full">
          <NeuralVisualizer />
        </div>

      </div>
    </section>
  );
}

/* ════════════ BEFORE VS AFTER COMPARISON SLIDER ════════════ */
function ComparisonSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#efeeea] border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto space-y-10">
        
        <div className="max-w-3xl">
          <div className="brutalist-badge mb-3">01 // BEFORE & AFTER MODEL TRANSFORMATION</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight">
            Bloated Error State vs. Streamlined Retrained Model
          </h2>
          <p className="font-mono text-xs sm:text-sm text-[#52525b] mt-3 leading-relaxed">
            See how AI models behave before using NullMind (high compute cost, error prone, GDPR non-compliant) vs after targeted node erasure (94% compute savings, 0% residual target).
          </p>
        </div>

        {/* Embedded Interactive Slider Component */}
        <ModelComparisonSlider />

      </div>
    </section>
  );
}

/* ════════════ INTERACTIVE PROCESS EXPLORER ════════════ */
function ProcessJourneySection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto space-y-10">
        
        {/* Embedded Interactive Process Journey Component */}
        <InteractiveProcessExplorer />

      </div>
    </section>
  );
}

/* ════════════ COMPUTE & FINANCIAL CALCULATOR ════════════ */
function CalculatorSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#efeeea] arch-grid-dense border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        {/* Embedded Interactive Calculator Component */}
        <ComputeCalculator />

      </div>
    </section>
  );
}

/* ════════════ LIVE PROBE TERMINAL SANDBOX ════════════ */
function SandboxSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#f7f6f2] arch-grid border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        {/* Embedded Interactive Terminal Sandbox Component */}
        <ProbeSimulator />

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
    <section id="results" className="relative py-24 sm:py-32 bg-[#efeeea] border-b-2 border-[#09090b]">
      <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <div className="brutalist-badge">02 // PROOF OF CONCEPT BENCHMARK</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight">
              Real Evaluation Scorecard
            </h2>
            <p className="font-mono text-xs sm:text-sm text-[#52525b] leading-relaxed">
              Tested on <span className="font-bold text-[#09090b]">Salesforce/codegen-350M</span> checkpoint. Target Python capability eliminated with zero collateral damage on JS/TS/C++.
            </p>

            <div className="brutalist-card p-6 bg-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-[#09090b] shrink-0" />
                <div>
                  <div className="font-mono text-sm font-extrabold text-[#09090b] uppercase">VERDICT: PASS AUDIT</div>
                  <div className="font-mono text-xs text-[#52525b] mt-1">100% of collateral capability sets preserved.</div>
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
          <div className="brutalist-badge mb-3">03 // TRANSPARENCY NOTICE</div>
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
        
        <div className="brutalist-card p-10 md:p-14 text-center bg-white space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#09090b] uppercase tracking-tight leading-tight max-w-3xl mx-auto">
            Ready to Unlearn & Retrain Your Models?
          </h2>
          
          <p className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] max-w-xl mx-auto">
            Upload your model checkpoint, run probe baseline, select target capability, and verify unlearning within minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
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
      <ComparisonSection />
      <ProcessJourneySection />
      <CalculatorSection />
      <SandboxSection />
      <ResultsSection />
      <ResearchSection />
      <CTASection />
      <Footer />
    </main>
  );
}
