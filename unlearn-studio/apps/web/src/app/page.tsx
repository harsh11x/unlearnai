"use client";

import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowRight, Target, CheckCircle2, XCircle,
  FlaskConical, BarChart3, Shield, GitBranch, Database, Cpu,
  Layers, Zap
} from "lucide-react";

/* ════════════ HERO SECTION ════════════ */
function Hero() {
  return (
    <section className="relative pt-36 md:pt-44 pb-28 md:pb-36 bg-[#eae5d9] chart-grid border-b-4 border-[#0f172a] overflow-hidden">
      {/* Background Floating Decorative Sticky Notes */}
      <div className="absolute top-28 right-12 w-36 h-36 bg-[#fef08a] border-2 border-[#0f172a] rotate-12 opacity-30 pointer-events-none hidden xl:block shadow-[4px_4px_0_0_#0f172a]">
        <div className="p-3 font-hand text-xl text-slate-800">unlearn_v1.py</div>
      </div>
      <div className="absolute bottom-12 right-1/3 w-32 h-32 bg-[#fbcfe8] border-2 border-[#0f172a] -rotate-12 opacity-30 pointer-events-none hidden xl:block shadow-[4px_4px_0_0_#0f172a]">
        <div className="p-3 font-hand text-lg text-slate-800">python = 0%</div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto relative z-10">
        
        {/* Top Tag Label */}
        <div className="inline-flex items-center gap-2 bg-[#ffffff] border-2 border-[#0f172a] px-4 py-2 shadow-[3px_3px_0_0_#0f172a] mb-8 -rotate-1">
          <span className="w-2.5 h-2.5 bg-[#ef4444] rounded-full border border-[#0f172a]" />
          <span className="font-mono text-xs md:text-sm font-bold uppercase tracking-widest text-[#0f172a]">
            📌 RESEARCH BULLETIN — NULLMIND PLATFORM V1.0
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Headline & Subtitle */}
          <div className="w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-[#0f172a]">
              SELECTIVELY <br />
              <span className="relative inline-block my-3">
                <span className="bg-[#fef08a] border-3 border-[#0f172a] px-4 py-1.5 shadow-[5px_5px_0_0_#0f172a] inline-block -rotate-1">
                  UNLEARN
                </span>
                <div className="tape tape-top-right"></div>
              </span> <br />
              AI MODELS.
            </h1>

            {/* Sticky Card Note Subtitle */}
            <div className="mt-8 relative bg-white border-2 border-[#0f172a] p-6 md:p-8 shadow-[6px_6px_0_0_#0f172a] rotate-1 w-full">
              <div className="pushpin"></div>
              <p className="font-mono text-sm md:text-base lg:text-lg font-bold text-slate-800 leading-relaxed">
                A production platform for{" "}
                <span className="bg-[#bae6fd] px-2 py-0.5 border border-[#0f172a]">
                  measured capability reduction
                </span>{" "}
                in language models. Forget targeted data.{" "}
                <span className="bg-[#bbf7d0] px-2 py-0.5 border border-[#0f172a] underline decoration-2">
                  Keep everything else.
                </span>
              </p>
              <div className="mt-4 text-right font-hand text-2xl font-bold text-slate-600">
                ~ Empirical & Reproducible
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

          {/* Right Column: Interactive Sticky Note Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            
            {/* Sticky 1 */}
            <div className="sticky-note bg-[#fef08a] p-6 -rotate-2 w-full">
              <div className="tape tape-top-center"></div>
              <div className="font-mono text-4xl md:text-5xl font-black text-[#0f172a]">20+</div>
              <div className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 mt-3 border-t-2 border-[#0f172a]/30 pt-3">
                Probe Categories
              </div>
              <div className="font-hand text-xl text-slate-700 mt-1">Code, Safety, Math...</div>
            </div>

            {/* Sticky 2 */}
            <div className="sticky-note bg-[#bae6fd] p-6 rotate-2 w-full">
              <div className="tape tape-top-right"></div>
              <div className="font-mono text-4xl md:text-5xl font-black text-[#0f172a]">89</div>
              <div className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 mt-3 border-t-2 border-[#0f172a]/30 pt-3">
                Evaluation Probes
              </div>
              <div className="font-hand text-xl text-slate-700 mt-1">Targeted test battery</div>
            </div>

            {/* Sticky 3 */}
            <div className="sticky-note bg-[#fbcfe8] p-6 rotate-2 w-full">
              <div className="tape tape-top-left"></div>
              <div className="font-mono text-4xl md:text-5xl font-black text-[#0f172a]">2</div>
              <div className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 mt-3 border-t-2 border-[#0f172a]/30 pt-3">
                Unlearn Methods
              </div>
              <div className="font-hand text-xl text-slate-700 mt-1">Ascent + Retain Loss</div>
            </div>

            {/* Sticky 4 */}
            <div className="sticky-note bg-[#bbf7d0] p-6 -rotate-2 w-full">
              <div className="tape tape-top-center"></div>
              <div className="font-mono text-4xl md:text-5xl font-black text-[#0f172a]">5</div>
              <div className="font-mono text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 mt-3 border-t-2 border-[#0f172a]/30 pt-3">
                Languages Tested
              </div>
              <div className="font-hand text-xl text-slate-700 mt-1">Python, JS, TS, C++</div>
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
    <section className="py-28 md:py-36 bg-[#e5dec9] border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        {/* Folder / Cardboard Wrapper spanning full width */}
        <div className="cardboard p-6 md:p-10 lg:p-12 relative w-full">
          <div className="absolute -top-4 left-6 bg-[#ef4444] text-white px-4 py-1 font-mono font-black text-xs uppercase tracking-widest border-2 border-[#0f172a] shadow-[2px_2px_0_0_#0f172a]">
            ⚠️ CASE FILE #409: THE PERMANENCE PROBLEM
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            
            {/* Left Box */}
            <div className="w-full">
              <div className="stamp mb-4">CONFIDENTIAL</div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#0f172a] leading-tight">
                AI Models Cannot <br />
                <span className="bg-[#fef08a] px-3 py-1 border-2 border-[#0f172a] inline-block my-2">Selectively Forget</span>
              </h2>
              <p className="mt-4 font-mono text-sm md:text-base text-slate-800 leading-relaxed">
                Once trained, LLMs permanently memorize code, PII, and copyrighted content across millions of parameters.
              </p>

              <div className="mt-6 p-5 bg-white border-2 border-[#0f172a] shadow-[5px_5px_0_0_#0f172a] rotate-1">
                <span className="font-hand text-2xl md:text-3xl font-bold text-[#ef4444]">
                  "Retraining from scratch costs $100k+ every time a removal request arrives."
                </span>
              </div>
            </div>

            {/* Right Sticky Card Stack */}
            <div className="space-y-4 w-full">
              {[
                { title: "Permanent Memorization", color: "bg-[#fef08a]", text: "Training data is baked directly into neural network weights." },
                { title: "No Erase Button", color: "bg-[#bae6fd]", text: "Standard RLHF or fine-tuning only suppresses output — data remains accessible via jailbreaks." },
                { title: "Prohibitive Retraining Cost", color: "bg-[#fbcfe8]", text: "Re-cleansing data and retraining full parameters is economically unfeasible." },
                { title: "Right to be Forgotten", color: "bg-[#bbf7d0]", text: "Privacy compliance (GDPR/CCPA) requires verifiable data removal." },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`sticky-note ${item.color} p-5 flex items-start gap-4 transition-all hover:translate-x-2 w-full`}
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
    <section id="how-it-works" className="py-28 md:py-36 bg-[#eae5d9] chart-grid border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        {/* Header Tag */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-3">
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

        {/* 6 Sticky Notes Grid filling full width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`sticky-note ${step.color} ${step.rot} p-6 md:p-7 flex flex-col justify-between min-h-[260px] w-full`}
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
  );
}

/* ════════════ VISUAL PIPELINE / CHART PAPER LAB ════════════ */
function VisualPipeline() {
  return (
    <section className="py-28 md:py-36 bg-[#f4efe4] border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        <div className="text-center mb-14">
          <div className="stamp stamp-green mb-3">SCIENTIFIC DUAL LOSS</div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
            Retention-Aware Loss Architecture
          </h2>
        </div>

        {/* Blueprint Chart Board */}
        <div className="bg-white border-3 border-[#0f172a] p-6 md:p-10 lg:p-12 shadow-[10px_10px_0_0_#0f172a] chart-grid-dense relative w-full">
          <div className="pushpin"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Phase 1 */}
            <div className="bg-[#fef08a] border-2 border-[#0f172a] p-6 shadow-[5px_5px_0_0_#0f172a] relative -rotate-1 w-full">
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
            <div className="bg-[#fbcfe8] border-2 border-[#0f172a] p-6 shadow-[5px_5px_0_0_#0f172a] relative rotate-1 w-full">
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
            <div className="bg-[#bbf7d0] border-2 border-[#0f172a] p-6 shadow-[5px_5px_0_0_#0f172a] relative -rotate-1 w-full">
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

          <div className="mt-10 text-center">
            <span className="inline-block bg-[#0f172a] text-[#fef08a] font-mono text-xs md:text-sm font-bold uppercase tracking-widest px-6 py-3.5 border-2 border-[#0f172a] shadow-[4px_4px_0_0_#0f172a]">
              ⚡ RESULT: TARGET CAPABILITY REDUCED WHILE PRESERVING RETAINED SKILLS
            </span>
          </div>
        </div>

      </div>
    </section>
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
    <section id="features" className="py-28 md:py-36 bg-[#e5dec9] border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        <div className="mb-14">
          <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-3">
            ⚙️ ENGINE CAPABILITIES
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
            Built for Rigorous ML Research
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`sticky-note ${f.color} p-7 flex flex-col justify-between w-full`}
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
    <section className="py-28 md:py-36 bg-[#fef08a] border-b-4 border-[#0f172a] chart-grid">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column */}
          <div className="w-full">
            <div className="stamp stamp-green mb-4">PROOFS OF CONCEPT</div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] leading-tight">
              Real Evaluation Scorecard
            </h2>
            <p className="font-mono text-sm md:text-base text-slate-800 leading-relaxed mt-4">
              Tested on <span className="bg-black text-white px-2 py-0.5 font-mono text-xs md:text-sm">Salesforce/codegen-350M</span>.
            </p>

            <div className="mt-6 p-6 bg-white border-2 border-[#0f172a] shadow-[6px_6px_0_0_#0f172a] -rotate-1 w-full">
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
          <div className="bg-white border-3 border-[#0f172a] shadow-[8px_8px_0_0_#0f172a] p-5 rotate-1 w-full">
            <div className="font-mono text-xs md:text-sm font-black uppercase bg-[#0f172a] text-white p-3 flex justify-between items-center mb-3">
              <span>EVALUATION METRICS TABLE</span>
              <span className="text-[#fef08a]">codegen-350m-v2</span>
            </div>

            <div className="divide-y-2 divide-[#0f172a]">
              <div className="grid grid-cols-4 font-mono text-xs font-black text-slate-600 p-2.5 bg-[#f4efe4]">
                <div>CAPABILITY</div>
                <div className="text-center">BEFORE</div>
                <div className="text-center">AFTER</div>
                <div className="text-center">DELTA</div>
              </div>

              {results.map((r) => (
                <div 
                  key={r.cap} 
                  className={`grid grid-cols-4 font-mono text-xs md:text-sm font-bold p-3.5 items-center ${
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
  );
}

/* ════════════ RESEARCH TRANSPARENCY MEMO ════════════ */
function ResearchSection() {
  return (
    <section id="research" className="py-28 md:py-36 bg-[#eae5d9] border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto">
        
        <div className="text-center mb-14">
          <div className="inline-block bg-[#0f172a] text-white font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 mb-3">
            🔬 TRANSPARENCY NOTICE
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a]">
            What We Do (And Don't Claim)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 w-full">
          
          {/* Memo 1: What We Do */}
          <div className="sticky-note bg-[#bbf7d0] p-7 -rotate-1 w-full">
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
          <div className="sticky-note bg-[#fbcfe8] p-7 rotate-1 w-full">
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
  );
}

/* ════════════ CTA & FOOTER ════════════ */
function CTASection() {
  return (
    <section className="py-28 md:py-36 bg-[#f4efe4] border-b-4 border-[#0f172a]">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto text-center">
        
        <div className="sticky-note bg-[#fef08a] p-8 md:p-14 rotate-1 relative w-full">
          <div className="pushpin"></div>
          
          <h2 className="text-3xl md:text-5xl font-black text-[#0f172a] leading-tight">
            Ready to Unlearn Your Models?
          </h2>
          
          <p className="font-mono text-sm md:text-base lg:text-lg font-bold text-slate-800 mt-4 max-w-2xl mx-auto">
            Upload your model checkpoint, run probe baseline, select target capability, and verify unlearning within minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/signup" className="btn-sticky text-base py-3.5 px-8">
              Start Free Trial 📌
            </Link>
            <Link href="/#how-it-works" className="btn-tape text-base py-3.5 px-8">
              Read Documentation 📖
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 bg-[#0f172a] text-white">
      <div className="w-full px-4 md:px-8 lg:px-12 mx-auto flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs md:text-sm">
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
    <main className="pt-[68px]">
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
