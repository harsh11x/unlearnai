"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Terminal, BookOpen, Cpu, Shield, ArrowRight, Code2, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function DocsPage() {
  const [copied, setCopied] = useState(false);
  const cliCommand = "pip install nullmind-studio && nullmind init --model Salesforce/codegen-350M-multi";

  const copyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="pt-[72px] bg-slate-50 min-h-screen font-sans">
      <Header />
      
      <section className="py-16 sm:py-24 bg-slate-50 soft-grid border-b border-slate-200/80">
        <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto">
          
          <div className="max-w-3xl space-y-4 mb-12">
            <div className="soft-badge">DOCUMENTATION & REPRODUCIBILITY GUIDE</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Documentation & SDK Reference
            </h1>
            <p className="font-sans text-sm sm:text-base text-slate-600 leading-relaxed">
              Step-by-step guides for integrating NullMind into PyTorch, HuggingFace, and vLLM pipelines for measured LLM unlearning & selective retraining.
            </p>
          </div>

          {/* Quick Install Banner */}
          <div className="soft-card p-6 bg-slate-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Terminal size={20} />
              </div>
              <div>
                <div className="font-mono text-xs font-semibold text-slate-400">QUICKSTART CLI INSTALLATION</div>
                <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">{cliCommand}</div>
              </div>
            </div>

            <button onClick={copyCommand} className="soft-btn-primary text-xs py-2.5 px-5 shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy Command"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
            {/* Sidebar nav */}
            <div className="lg:col-span-3 space-y-2 font-sans text-xs">
              {["1. Quickstart & Installation", "2. Dual-Loss Objective", "3. 89-Probe Battery Spec", "4. Python SDK Example", "5. PDF Audit Certification"].map((item, i) => (
                <div
                  key={item}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    i === 0 ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-md shadow-indigo-500/20" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Content area */}
            <div className="lg:col-span-9 soft-card p-8 bg-white space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Python SDK Implementation</h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
                Initialize NullMind Engine directly inside PyTorch training loops to apply retain-aware loss ascent.
              </p>

              <div className="rounded-2xl p-5 bg-slate-950 text-white font-mono text-xs space-y-2 border border-slate-800 shadow-xl overflow-x-auto">
                <div className="text-slate-400 font-semibold border-b border-slate-800 pb-2">// example_unlearn.py</div>
                <pre className="text-slate-300 leading-relaxed">
{`from nullmind import UnlearnEngine, ProbeSuite

# 1. Load model checkpoint
engine = UnlearnEngine.from_pretrained(
    "Salesforce/codegen-350M-multi",
    target_capability="python_code_generation"
)

# 2. Run 89-Probe baseline test
baseline_score = engine.evaluate_probes()
print(f"Baseline Probe Accuracy: {baseline_score.accuracy:.1f}%")

# 3. Execute Dual-Loss Gradient Ascent
results = engine.unlearn(
    learning_rate=1e-5,
    max_steps=200,
    retain_weight=2.0,
    enable_selective_retrain=True
)

# 4. Generate Cryptographic PDF Audit Report
engine.export_pdf_audit("audit_certificate.pdf")`}
                </pre>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
