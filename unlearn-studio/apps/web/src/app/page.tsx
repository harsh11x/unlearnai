"use client";

import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowRight, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, Zap, CpuIcon, Check, FileCheck, RefreshCw, Lock, Sparkles
} from "lucide-react";

/* ════════════ COMIC SECTION DIVIDER ════════════ */
function ComicDivider({ color = "#eae5d9" }: { color?: string }) {
  return (
    <div className="w-full overflow-hidden leading-none relative z-20 -my-1">
      <svg
        className="relative block w-full h-8 md:h-12"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        {/* Comic Zigzag Sawtooth Cut */}
        <path
          d="M0,0 L40,45 L80,0 L120,45 L160,0 L200,45 L240,0 L280,45 L320,0 L360,45 L400,0 L440,45 L480,0 L520,45 L560,0 L600,45 L640,0 L680,45 L720,0 L760,45 L800,0 L840,45 L880,0 L920,45 L960,0 L1000,45 L1040,0 L1080,45 L1120,0 L1160,45 L1200,0 L1200,120 L0,120 Z"
          fill={color}
          stroke="#0f172a"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

/* ════════════ HERO SECTION ════════════ */
function Hero() {
  return (
    <section className="relative pt-44 sm:pt-56 md:pt-64 lg:pt-72 pb-32 sm:pb-40 md:pb-48 bg-[#eae5d9] chart-grid overflow-hidden">
      {/* Background Floating Decorative Sticky Notes */}
      <div className="absolute top-44 right-12 w-40 h-40 bg-[#fef08a] border-2 border-[#0f172a] rotate-12 opacity-30 pointer-events-none hidden xl:block shadow-[4px_4px_0_0_#0f172a]">
        <div className="p-3 font-hand text-xl text-slate-800">unlearn_v1.py</div>
        <div className="font-mono text-[10px] text-slate-600 px-3">L_loss = L_forget + λL_retain</div>
      </div>
      <div className="absolute bottom-20 right-1/3 w-36 h-36 bg-[#fbcfe8] border-2 border-[#0f172a] -rotate-12 opacity-30 pointer-events-none hidden xl:block shadow-[4px_4px_0_0_#0f172a]">
        <div className="p-3 font-hand text-lg text-slate-800">python = 0.0%</div>
        <div className="font-mono text-[10px] text-slate-600 px-3">✅ JS/TS/C++ 100% Intact</div>
      </div>

      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto relative z-10 my-auto">
        
        {/* Top Tag Label */}
        <div className="inline-flex flex-wrap items-center gap-3 bg-[#ffffff] border-2 border-[#0f172a] px-4 py-2 shadow-[3px_3px_0_0_#0f172a] mb-12 -rotate-1">
          <span className="w-2.5 h-2.5 bg-[#ef4444] rounded-full border border-[#0f172a]" />
          <span className="font-mono text-xs md:text-sm font-bold uppercase tracking-widest text-[#0f172a]">
            📌 OPEN RESEARCH BULLETIN — NULLMIND PLATFORM V1.0
          </span>
          <span className="bg-[#fef08a] border border-[#0f172a] px-2 py-0.5 font-mono text-[10px] font-black uppercase">
            PYTORCH 2.4 + FASTAPI
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Headline & Deep Project Info */}
          <div className="lg:col-span-7 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.15] text-[#0f172a]">
              SELECTIVELY <br />
              <span className="relative inline-block my-4">
                <span className="bg-[#fef08a] border-3 border-[#0f172a] px-4 py-2 shadow-[5px_5px_0_0_#0f172a] inline-block -rotate-1">
                  UNLEARN
                </span>
                <div className="tape tape-top-right"></div>
              </span> <br />
              AI MODELS.
            </h1>

            {/* Deep Informative Card Notes */}
            <div className="mt-8 relative bg-white border-2 border-[#0f172a] p-6 md:p-8 shadow-[6px_6px_0_0_#0f172a] rotate-1 w-full space-y-4">
              <div className="pushpin"></div>
              
              <div className="flex items-center justify-between border-b-2 border-[#0f172a]/20 pb-3">
                <span className="font-mono text-xs font-black uppercase bg-[#0f172a] text-white px-2.5 py-0.5">
                  WHAT IS NULLMIND?
                </span>
                <span className="font-hand text-xl font-bold text-slate-700">#MachineUnlearning</span>
              </div>

              <p className="font-mono text-sm md:text-base font-bold text-slate-800 leading-relaxed">
                NullMind is an open-source research platform for{" "}
                <span className="bg-[#bae6fd] px-2 py-0.5 border border-[#0f172a]">
                  Selective Capability Reduction (SCR)
                </span>{" "}
                in Large Language Models. Instead of spending $100k+ retraining models from scratch, NullMind executes target gradient ascent to cleanly erase targeted datasets while preserving unrelated knowledge domains.
              </p>

              {/* Informative Use-Case Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { icon: "📜", label: "GDPR Erase" },
                  { icon: "⚖️", label: "Copyright Removal" },
                  { icon: "🛡️", label: "Safety Alignment" },
                  { icon: "🧬", label: "Capability Pruning" },
                ].map((uc) => (
                  <div key={uc.label} className="bg-[#f4efe4] border border-[#0f172a] p-2 text-center">
                    <div className="text-base">{uc.icon}</div>
                    <div className="font-mono text-[10px] font-black uppercase text-[#0f172a] mt-0.5">{uc.label}</div>
                  </div>
                ))}
              </div>

              <div className="text-right font-hand text-xl font-bold text-slate-600 border-t border-dashed border-[#0f172a]/30 pt-2">
                ~ Empirical, Verifiable & Zero Collateral Damage ~
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link href="/signup" className="btn-sticky text-base py-3.5 px-7">
                Start Experimenting <ArrowRight size={18} />
              </Link>
              <Link href="/#how-it-works" className="btn-tape text-base py-3.5 px-7">
                See How It Works 📋
              </Link>
            </div>
          </div>

          {/* Right Column: Rich Info Panels & Stats Grid */}
          <div className="lg:col-span-5 w-full space-y-6">
            
            {/* Tech Spec Sticky Panel */}
            <div className="bg-[#fbcfe8] border-2 border-[#0f172a] p-6 shadow-[5px_5px_0_0_#0f172a] -rotate-1 relative">
              <div className="tape tape-top-center"></div>
              <h3 className="font-mono text-xs font-black uppercase bg-[#0f172a] text-white px-2 py-0.5 inline-block mb-3">
                SYSTEM SPECIFICATIONS
              </h3>
              <div className="font-mono text-xs font-bold text-slate-800 space-y-2">
                <div className="flex justify-between border-b border-[#0f172a]/20 pb-1">
                  <span>Architecture Support:</span>
                  <span className="text-[#0f172a] font-black">LLaMA 3, Qwen 2.5, CodeGen</span>
                </div>
                <div className="flex justify-between border-b border-[#0f172a]/20 pb-1">
                  <span>Loss Formulation:</span>
                  <span className="text-[#0f172a] font-black">Dual Loss (Ascent + Descent)</span>
                </div>
                <div className="flex justify-between border-b border-[#0f172a]/20 pb-1">
                  <span>Probing Benchmark:</span>
                  <span className="text-[#0f172a] font-black">89 Automated Probe Battery</span>
                </div>
                <div className="flex justify-between">
                  <span>GPU Task Queue:</span>
                  <span className="text-[#0f172a] font-black">Async Celery + Redis</span>
                </div>
              </div>
            </div>

            {/* Sticky Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="sticky-note bg-[#fef08a] p-5 -rotate-2">
                <div className="tape tape-top-left"></div>
                <div className="font-mono text-3xl font-black text-[#0f172a]">20+</div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 border-t border-[#0f172a]/30 pt-2">
                  Probe Categories
                </div>
                <div className="font-hand text-lg text-slate-600 mt-0.5">Code, PII, Safety...</div>
              </div>

              <div className="sticky-note bg-[#bae6fd] p-5 rotate-2">
                <div className="tape tape-top-right"></div>
                <div className="font-mono text-3xl font-black text-[#0f172a]">89</div>
                <div className="font-mono text-xs md:text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 border-t border-[#0f172a]/30 pt-2">
                  Evaluation Probes
                </div>
                <div className="font-hand text-lg text-slate-600 mt-0.5">Targeted test battery</div>
              </div>

              <div className="sticky-note bg-[#bbf7d0] p-5 rotate-2">
                <div className="tape tape-top-left"></div>
                <div className="font-mono text-3xl font-black text-[#0f172a]">2</div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 border-t border-[#0f172a]/30 pt-2">
                  Unlearn Methods
                </div>
                <div className="font-hand text-lg text-slate-600 mt-0.5">Ascent + Retain Loss</div>
              </div>

              <div className="sticky-note bg-[#fed7aa] p-5 -rotate-2">
                <div className="tape tape-top-center"></div>
                <div className="font-mono text-3xl font-black text-[#0f172a]">5</div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 border-t border-[#0f172a]/30 pt-2">
                  Languages Tested
                </div>
                <div className="font-hand text-lg text-slate-600 mt-0.5">Python, JS, TS, C++</div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════ PROBLEM SECTION ════════════ */
function ProblemSection() {
  return (
    <>
      <ComicDivider color="#e5dec9" />
      <section className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#e5dec9]">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          {/* Folder / Cardboard Wrapper */}
          <div className="cardboard p-6 sm:p-10 md:p-14 relative w-full">
            {/* Header Badge seated cleanly inside */}
            <div className="inline-block bg-[#ef4444] text-white px-4 py-1.5 font-mono font-black text-xs uppercase tracking-widest border-2 border-[#0f172a] shadow-[2px_2px_0_0_#0f172a] mb-8">
              ⚠️ CASE FILE #409: THE PERMANENCE PROBLEM
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              
              {/* Left Box */}
              <div className="w-full">
                <div className="stamp mb-6">CONFIDENTIAL</div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#0f172a] leading-tight">
                  AI Models Cannot <br />
                  <span className="bg-[#fef08a] px-3 py-1 border-2 border-[#0f172a] inline-block my-3">Selectively Forget</span>
                </h2>
                <p className="mt-6 font-mono text-sm md:text-base text-slate-800 leading-relaxed">
                  Once trained, LLMs permanently memorize code, PII, and copyrighted content across millions of parameters.
                </p>

                <div className="mt-8 p-6 bg-white border-2 border-[#0f172a] shadow-[5px_5px_0_0_#0f172a] rotate-1">
                  <span className="font-hand text-2xl md:text-3xl font-bold text-[#ef4444]">
                    "Retraining from scratch costs $100k+ every time a removal request arrives."
                  </span>
                </div>
              </div>

              {/* Right Sticky Card Stack */}
              <div className="space-y-6 w-full">
                {[
                  { title: "Permanent Memorization", color: "bg-[#fef08a]", text: "Training data is baked directly into neural network weights." },
                  { title: "No Erase Button", color: "bg-[#bae6fd]", text: "Standard RLHF or fine-tuning only suppresses output — data remains accessible via jailbreaks." },
                  { title: "Prohibitive Retraining Cost", color: "bg-[#fbcfe8]", text: "Re-cleansing data and retraining full parameters is economically unfeasible." },
                  { title: "Right to be Forgotten", color: "bg-[#bbf7d0]", text: "Privacy compliance (GDPR/CCPA) requires verifiable data removal." },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`sticky-note ${item.color} p-6 flex items-start gap-4 transition-all hover:translate-x-2 w-full`}
                  >
                    <span className="font-mono font-black text-xl bg-[#0f172a] text-white w-8 h-8 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-mono text-sm md:text-base font-bold uppercase text-[#0f172a]">{item.title}</h3>
                      <p className="font-mono text-xs md:text-sm text-slate-800 mt-1">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ HOW IT WORKS (Sticky Note Grid) ════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Upload Model", desc: "Upload any open-weight model (HuggingFace / Safetensors). System validates metadata & GPU specs.", tag: "Safetensors · HF", color: "bg-[#fef08a]", rot: "-rotate-2" },
    { num: "02", title: "Explore Baseline", desc: "Run probing suite across 20 categories and 89 probes to record starting capabilities.", tag: "89 Probes Battery", color: "bg-[#bae6fd]", rot: "rotate-1" },
    { num: "03", title: "Select Target", desc: "Define capability target (e.g. Python code generation) to selectively unlearn.", tag: "Target: Python", color: "bg-[#fbcfe8]", rot: "-rotate-1" },
    { num: "04", title: "Run Unlearning", desc: "Execute gradient ascent on target dataset combined with gradient descent on retain set.", tag: "Dual Objective Loss", color: "bg-[#bbf7d0]", rot: "rotate-2" },
    { num: "05", title: "Verify Results", desc: "Re-evaluate exact probes. Verify target dropped to ~0% while collateral skills remained intact.", tag: "Paraphrase Tests", color: "bg-[#fed7aa]", rot: "-rotate-2" },
    { num: "06", title: "Audit Report", desc: "Generate reproducible PDF audit report with model weights diff and pass/fail verdict.", tag: "PASS / FAIL Audit", color: "bg-[#fef08a]", rot: "rotate-1" },
  ];

  return (
    <>
      <ComicDivider color="#eae5d9" />
      <section id="how-it-works" className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#eae5d9] chart-grid">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          {/* Header Tag */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-4">
                📋 PROTOCOL PIPELINE
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] tracking-tight">
                Six Steps to Verified Unlearning
              </h2>
            </div>
            <div className="font-hand text-2xl md:text-3xl font-bold text-slate-700 bg-[#fef08a] px-5 py-2 border-2 border-[#0f172a] -rotate-2">
              ~ Fully Reproducible Pipeline ~
            </div>
          </div>

          {/* 6 Sticky Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {steps.map((step) => (
              <div
                key={step.num}
                className={`sticky-note ${step.color} ${step.rot} p-7 md:p-9 flex flex-col justify-between min-h-[290px] w-full`}
              >
                <div className="tape tape-top-center"></div>

                <div>
                  <div className="flex items-center justify-between border-b-2 border-[#0f172a]/20 pb-3 mb-4">
                    <span className="font-mono text-xs font-bold uppercase bg-[#0f172a] text-white px-2 py-0.5">
                      STEP {step.num}
                    </span>
                    <span className="font-hand text-2xl font-bold text-slate-700">#probe</span>
                  </div>

                  <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase">{step.title}</h3>
                  <p className="font-mono text-xs md:text-sm font-bold text-slate-800 leading-relaxed mt-3">{step.desc}</p>
                </div>

                <div className="mt-6 pt-3 border-t-2 border-dashed border-[#0f172a]/30 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black uppercase text-slate-700 bg-white/70 px-2 py-1 border border-[#0f172a]/40">
                    {step.tag}
                  </span>
                  <span className="text-base">📌</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ VISUAL PIPELINE / CHART PAPER LAB ════════════ */
function VisualPipeline() {
  return (
    <>
      <ComicDivider color="#f4efe4" />
      <section className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#f4efe4]">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          <div className="text-center mb-16">
            <div className="stamp stamp-green mb-4">SCIENTIFIC DUAL LOSS</div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
              Retention-Aware Loss Architecture
            </h2>
          </div>

          {/* Blueprint Chart Board */}
          <div className="bg-white border-3 border-[#0f172a] p-6 md:p-10 lg:p-14 shadow-[10px_10px_0_0_#0f172a] chart-grid-dense relative w-full">
            <div className="pushpin"></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              
              {/* Phase 1 */}
              <div className="bg-[#fef08a] border-2 border-[#0f172a] p-7 md:p-9 shadow-[5px_5px_0_0_#0f172a] relative -rotate-1 w-full">
                <div className="absolute top-2 right-2 font-mono text-xs font-bold bg-[#0f172a] text-white px-2 py-0.5">
                  PHASE A
                </div>
                <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-2 mb-4">
                  1. Baseline Score
                </h3>
                <ul className="font-mono text-xs md:text-sm font-bold text-slate-800 space-y-3">
                  <li className="flex items-center gap-2">✓ Python Probes: 50.0%</li>
                  <li className="flex items-center gap-2">✓ JavaScript: 50.0%</li>
                  <li className="flex items-center gap-2">✓ TypeScript: 100.0%</li>
                  <li className="flex items-center gap-2">✓ C++ Probes: 75.0%</li>
                </ul>
              </div>

              {/* Phase 2 */}
              <div className="bg-[#fbcfe8] border-2 border-[#0f172a] p-7 md:p-9 shadow-[5px_5px_0_0_#0f172a] relative rotate-1 w-full">
                <div className="absolute top-2 right-2 font-mono text-xs font-bold bg-[#0f172a] text-white px-2 py-0.5">
                  PHASE B
                </div>
                <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-2 mb-4">
                  2. Dual Unlearn
                </h3>
                <div className="font-mono text-xs md:text-sm font-bold text-slate-800 space-y-3">
                  <div className="p-2.5 bg-white border border-[#0f172a]">
                    🔥 Gradient Ascent: Target (Python)
                  </div>
                  <div className="p-2.5 bg-white border border-[#0f172a]">
                    🛡️ Gradient Descent: Retain Set
                  </div>
                  <div className="font-hand text-2xl text-slate-700 text-center mt-3">
                    L_total = L_forget + λ L_retain
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="bg-[#bbf7d0] border-2 border-[#0f172a] p-7 md:p-9 shadow-[5px_5px_0_0_#0f172a] relative -rotate-1 w-full">
                <div className="absolute top-2 right-2 font-mono text-xs font-bold bg-[#0f172a] text-white px-2 py-0.5">
                  PHASE C
                </div>
                <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-2 mb-4">
                  3. Verification
                </h3>
                <ul className="font-mono text-xs md:text-sm font-bold text-slate-800 space-y-3">
                  <li className="flex items-center gap-2 text-red-600 font-black">🎯 Python: 50% → 0.0% (UNLEARNED)</li>
                  <li className="flex items-center gap-2">✅ JavaScript: 50.0% (PRESERVED)</li>
                  <li className="flex items-center gap-2">✅ TypeScript: 100.0% (PRESERVED)</li>
                  <li className="flex items-center gap-2">✅ C++: 75.0% (PRESERVED)</li>
                </ul>
              </div>

            </div>

            <div className="mt-12 text-center">
              <span className="inline-block bg-[#0f172a] text-[#fef08a] font-mono text-xs md:text-sm font-bold uppercase tracking-widest px-6 py-4 border-2 border-[#0f172a] shadow-[4px_4px_0_0_#0f172a]">
                ⚡ RESULT: TARGET CAPABILITY REDUCED WHILE PRESERVING RETAINED SKILLS
              </span>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ FEATURES SECTION ════════════ */
function Features() {
  const features = [
    { title: "Evidence-Based", desc: "No opaque internal model weight claims. All unlearning is validated via controlled probing.", color: "bg-[#fef08a]", icon: Shield },
    { title: "Version Lineage", desc: "Every experiment creates an immutable checkpoint version. Original models are untouched.", color: "bg-[#bae6fd]", icon: GitBranch },
    { title: "Dual Objective", desc: "Retain-aware loss prevents model degradation while erasing targeted capability domains.", color: "bg-[#fbcfe8]", icon: Layers },
    { title: "GPU Worker Queue", desc: "Async Celery background tasks handle model loading and gradient computation seamlessly.", color: "bg-[#bbf7d0]", icon: Cpu },
    { title: "Full Provenance", desc: "Complete reproducibility log with dataset hashes, learning rates, and seed tracking.", color: "bg-[#fed7aa]", icon: Database },
    { title: "Robustness Suite", desc: "Paraphrase and adversarial prompt tests ensure unlearning resists simple jailbreaks.", color: "bg-[#fef08a]", icon: FlaskConical },
  ];

  return (
    <>
      <ComicDivider color="#e5dec9" />
      <section id="features" className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#e5dec9]">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          <div className="mb-16">
            <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-3">
              ⚙️ ENGINE CAPABILITIES
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
              Built for Rigorous ML Research
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`sticky-note ${f.color} p-7 md:p-9 flex flex-col justify-between w-full`}
              >
                <div>
                  <div className="w-12 h-12 bg-[#0f172a] text-white flex items-center justify-center mb-5 border border-[#0f172a]">
                    <f.icon size={22} />
                  </div>
                  <h3 className="font-mono text-lg font-black text-[#0f172a] uppercase">{f.title}</h3>
                  <p className="font-mono text-xs md:text-sm font-bold text-slate-800 leading-relaxed mt-3">{f.desc}</p>
                </div>
                <div className="font-hand text-xl text-slate-600 mt-6 text-right">
                  #feature-{i + 1}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ REAL RESULTS SCORECARD ════════════ */
function Results() {
  const results = [
    { cap: "Python", before: "50.0%", after: "0.0%", delta: "-50.0%", isTarget: true },
    { cap: "JavaScript", before: "50.0%", after: "50.0%", delta: "0.0%", isTarget: false },
    { cap: "TypeScript", before: "100.0%", after: "100.0%", delta: "0.0%", isTarget: false },
    { cap: "C++", before: "75.0%", after: "75.0%", delta: "0.0%", isTarget: false },
    { cap: "General Prog.", before: "16.7%", after: "16.7%", delta: "0.0%", isTarget: false },
  ];

  return (
    <>
      <ComicDivider color="#fef08a" />
      <section className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#fef08a] chart-grid">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            
            {/* Left Column */}
            <div className="w-full">
              <div className="stamp stamp-green mb-4">PROOFS OF CONCEPT</div>
              <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] leading-tight">
                Real Evaluation Scorecard
              </h2>
              <p className="font-mono text-sm md:text-base text-slate-800 leading-relaxed mt-4">
                Tested on <span className="bg-black text-white px-2 py-0.5 font-mono text-xs md:text-sm">Salesforce/codegen-350M</span>.
              </p>

              <div className="mt-8 p-6 md:p-8 bg-white border-2 border-[#0f172a] shadow-[6px_6px_0_0_#0f172a] -rotate-1 w-full">
                <div className="flex items-center gap-4">
                  <CheckCircle2 size={32} className="text-green-600 shrink-0" />
                  <div>
                    <div className="font-mono text-base md:text-lg font-black text-[#0f172a] uppercase">VERDICT: PASS</div>
                    <div className="font-mono text-xs md:text-sm text-slate-700 mt-1">Target Python capability eliminated with 0 collateral damage on JS/TS/C++.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Chart Table */}
            <div className="bg-white border-3 border-[#0f172a] shadow-[8px_8px_0_0_#0f172a] p-5 md:p-7 rotate-1 w-full">
              <div className="font-mono text-xs md:text-sm font-black uppercase bg-[#0f172a] text-white p-4 flex justify-between items-center mb-4">
                <span>EVALUATION METRICS TABLE</span>
                <span className="text-[#fef08a]">codegen-350m-v2</span>
              </div>

              <div className="divide-y-2 divide-[#0f172a]">
                <div className="grid grid-cols-4 font-mono text-xs font-black text-slate-600 p-3 bg-[#f4efe4]">
                  <div>CAPABILITY</div>
                  <div className="text-center">BEFORE</div>
                  <div className="text-center">AFTER</div>
                  <div className="text-center">DELTA</div>
                </div>

                {results.map((r) => (
                  <div 
                    key={r.cap} 
                    className={`grid grid-cols-4 font-mono text-xs md:text-sm font-bold p-4 items-center ${
                      r.isTarget ? "bg-[#fbcfe8]" : "hover:bg-[#f4efe4]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-[#0f172a]">
                      {r.isTarget && <Target size={16} className="text-red-600 shrink-0" />}
                      {r.cap}
                      {r.isTarget && <span className="text-[9px] bg-red-600 text-white px-1 ml-1 hidden sm:inline-block">TARGET</span>}
                    </div>
                    <div className="text-center text-slate-700">{r.before}</div>
                    <div className="text-center text-slate-700">{r.after}</div>
                    <div className={`text-center font-black ${r.isTarget ? "text-red-600" : "text-slate-500"}`}>
                      {r.delta}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ RESEARCH TRANSPARENCY MEMO ════════════ */
function ResearchSection() {
  return (
    <>
      <ComicDivider color="#eae5d9" />
      <section id="research" className="relative min-h-[85vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#eae5d9]">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto my-auto">
          
          <div className="text-center mb-16">
            <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-3">
              🔬 TRANSPARENCY NOTICE
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
              What We Do (And Don't Claim)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 w-full">
            
            {/* Memo 1: What We Do */}
            <div className="sticky-note bg-[#bbf7d0] p-8 md:p-10 -rotate-1 w-full">
              <div className="tape tape-top-left"></div>
              <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-3 mb-5 flex items-center gap-2">
                <CheckCircle2 size={22} className="text-green-700" /> WHAT WE DO
              </h3>
              <ul className="font-mono text-xs md:text-sm font-bold text-slate-800 space-y-4">
                <li className="flex items-start gap-2.5"><span>✓</span> Gradient-based model editing to reduce specific capabilities</li>
                <li className="flex items-start gap-2.5"><span>✓</span> Controlled probing battery to measure output differences</li>
                <li className="flex items-start gap-2.5"><span>✓</span> Retain-aware optimization to preserve un-targeted skills</li>
                <li className="flex items-start gap-2.5"><span>✓</span> Robustness tests against paraphrased and indirect prompts</li>
              </ul>
            </div>

            {/* Memo 2: What We Don't Claim */}
            <div className="sticky-note bg-[#fbcfe8] p-8 md:p-10 rotate-1 w-full">
              <div className="tape tape-top-right"></div>
              <h3 className="font-mono text-lg md:text-xl font-black text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-3 mb-5 flex items-center gap-2">
                <XCircle size={22} className="text-red-600" /> WHAT WE DON'T CLAIM
              </h3>
              <ul className="font-mono text-xs md:text-sm font-bold text-slate-800 space-y-4">
                <li className="flex items-start gap-2.5"><span>✕</span> We do NOT inspect internal model weights or neural representations</li>
                <li className="flex items-start gap-2.5"><span>✕</span> We do NOT claim 100% mathematical knowledge deletion</li>
                <li className="flex items-start gap-2.5"><span>✕</span> We do NOT guarantee theoretical machine unlearning proofs</li>
                <li className="flex items-start gap-2.5"><span>✕</span> Results are empirical and based strictly on probe performance</li>
              </ul>
            </div>

          </div>

        </div>
      </section>
    </>
  );
}

/* ════════════ CTA & FOOTER ════════════ */
function CTASection() {
  return (
    <>
      <ComicDivider color="#f4efe4" />
      <section className="relative min-h-[70vh] flex flex-col justify-center py-14 sm:py-20 md:py-24 bg-[#f4efe4]">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto text-center my-auto">
          
          <div className="sticky-note bg-[#fef08a] p-10 md:p-16 rotate-1 relative w-full">
            <div className="pushpin"></div>
            
            <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] leading-tight">
              Ready to Unlearn Your Models?
            </h2>
            
            <p className="font-mono text-sm md:text-base lg:text-lg font-bold text-slate-800 mt-4 max-w-2xl mx-auto">
              Upload your model checkpoint, run probe baseline, select target capability, and verify unlearning within minutes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-12">
              <Link href="/signup" className="btn-sticky text-base py-4 px-9">
                Start Free Trial 📌
              </Link>
              <Link href="/#how-it-works" className="btn-tape text-base py-4 px-9">
                Read Documentation 📖
              </Link>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

function Footer() {
  return (
    <footer className="py-16 bg-[#0f172a] text-white">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 mx-auto flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-xs md:text-sm">
        <div className="flex items-center gap-3">
          <span className="bg-[#fef08a] text-[#0f172a] font-black px-2 py-0.5">NULLMIND</span>
          <span>Open Research Platform for LLM Capability Reduction</span>
        </div>
        <div className="text-slate-400">
          Built with PyTorch · HuggingFace · FastAPI · Next.js
        </div>
        <div>
          © 2026 NullMind Studio
        </div>
      </div>
    </footer>
  );
}

/* ════════════ MAIN PAGE ════════════ */
export default function Home() {
  return (
    <main className="pt-[72px]">
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
