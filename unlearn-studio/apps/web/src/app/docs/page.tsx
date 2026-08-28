"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Terminal, Cpu, Shield, BookOpen, ArrowRight, Code, FileText, CheckCircle2 } from "lucide-react";

export default function DocsPage() {
  return (
    <main className="pt-[68px] bg-[#f7f6f2] min-h-screen">
      <Header />

      {/* Docs Header Banner */}
      <section className="py-16 sm:py-24 bg-[#efeeea] border-b-2 border-[#09090b] arch-grid">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
          <div className="brutalist-badge mb-3">DOCUMENTATION & RESEARCH SPECIFICATION</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#09090b] uppercase tracking-tight font-sans">
            DOCUMENTATION & SDK GUIDE
          </h1>
          <p className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] mt-3 max-w-2xl">
            Complete technical guide for measured LLM unlearning, dual-objective loss math, probe battery evaluation, and FastAPI/CLI SDK integration.
          </p>
        </div>
      </section>

      {/* Docs Grid Content */}
      <section className="py-16 sm:py-24">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 space-y-2 font-mono text-xs font-bold">
              <div className="brutalist-card p-4 bg-white space-y-2">
                <div className="text-[10px] text-[#71717a] uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1">
                  // QUICK NAVIGATION
                </div>
                {[
                  "01. Quick Start",
                  "02. Loss Mathematics",
                  "03. 89-Probe Battery",
                  "04. Python CLI & SDK",
                  "05. REST API Reference",
                  "06. PDF Audit Standard",
                ].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    className="block p-2 border border-transparent hover:border-[#09090b] hover:bg-[#f7f6f2] transition-all text-[#09090b]"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Main Docs Content */}
            <div className="lg:col-span-9 space-y-10">
              
              {/* Section 1: Quick Start */}
              <div id="01-quick-start" className="brutalist-card p-6 md:p-8 bg-white space-y-4">
                <div className="brutalist-badge">01 // GETTING STARTED</div>
                <h2 className="text-2xl font-extrabold text-[#09090b] uppercase font-sans">Quick Start Guide</h2>
                <p className="font-mono text-xs text-[#52525b] leading-relaxed">
                  NullMind provides both a Next.js web studio and a lightweight Python CLI package. Install the engine and run baseline capability probes in under 2 minutes.
                </p>

                <div className="brutalist-card-dark p-4 font-mono text-xs overflow-x-auto">
                  <div className="text-[#71717a] mb-2"># Install NullMind Engine CLI</div>
                  <div className="text-white">pip install nullmind-studio</div>
                  <div className="text-[#71717a] my-2"># Run 89-probe evaluation baseline on Safetensors model</div>
                  <div className="text-white">nullmind probe --model Salesforce/codegen-350M-multi --output baseline.json</div>
                </div>
              </div>

              {/* Section 2: Loss Mathematics */}
              <div id="02-loss-mathematics" className="brutalist-card p-6 md:p-8 bg-white space-y-4">
                <div className="brutalist-badge">02 // SCIENTIFIC FORMULATION</div>
                <h2 className="text-2xl font-extrabold text-[#09090b] uppercase font-sans">Dual-Objective Loss Mathematics</h2>
                <p className="font-mono text-xs text-[#52525b] leading-relaxed">
                  To selectively unlearn target capabilities without causing catastrophic forgetting in retained domains, NullMind optimizes a dual-objective loss formulation:
                </p>

                <div className="brutalist-card p-6 bg-[#f7f6f2] font-mono text-center space-y-2">
                  <div className="text-xs text-[#71717a] uppercase font-bold">TOTAL LOSS FUNCTION</div>
                  <div className="text-lg sm:text-xl font-extrabold text-[#09090b]">
                    L_total = L_forget(θ) + λ · L_retain(θ)
                  </div>
                  <div className="text-[11px] text-[#52525b] pt-2">
                    Where L_forget is gradient ascent on target dataset and L_retain is cross-entropy gradient descent on preserved domains with scaling weight λ.
                  </div>
                </div>
              </div>

              {/* Section 3: Probe Battery */}
              <div id="03-89-probe-battery" className="brutalist-card p-6 md:p-8 bg-white space-y-4">
                <div className="brutalist-badge">03 // EMPIRICAL EVALUATION</div>
                <h2 className="text-2xl font-extrabold text-[#09090b] uppercase font-sans">89-Probe Evaluation Battery</h2>
                <p className="font-mono text-xs text-[#52525b] leading-relaxed">
                  NullMind relies on controlled empirical probing rather than inspecting neural weights directly. Probes evaluate target capabilities across 20+ categories:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {[
                    "Python Code Generation (Target)",
                    "JavaScript / TypeScript Syntax",
                    "C++ Memory Management",
                    "PII & Private Key Patterns",
                    "Algorithmic Problem Solving",
                    "Safety & Toxic Content Alignment",
                  ].map((probe) => (
                    <div key={probe} className="p-3 border-2 border-[#09090b] bg-[#f7f6f2] flex items-center gap-2 font-bold">
                      <CheckCircle2 size={14} className="text-[#09090b]" />
                      <span>{probe}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Python SDK Code */}
              <div id="04-python-cli-sdk" className="brutalist-card p-6 md:p-8 bg-white space-y-4">
                <div className="brutalist-badge">04 // PYTHON SDK EXAMPLES</div>
                <h2 className="text-2xl font-extrabold text-[#09090b] uppercase font-sans">Python SDK Code Example</h2>

                <div className="brutalist-card-dark p-5 font-mono text-xs overflow-x-auto space-y-1">
                  <span className="text-[#71717a]">from nullmind import UnlearnEngine, ProbeSuite</span><br />
                  <br />
                  <span className="text-zinc-400"># 1. Initialize Engine with model path</span><br />
                  <span>engine = UnlearnEngine("models/codegen-350m-multi")</span><br />
                  <br />
                  <span className="text-zinc-400"># 2. Run baseline evaluation</span><br />
                  <span>baseline_score = engine.evaluate_probes(categories=["python", "javascript"])</span><br />
                  <br />
                  <span className="text-zinc-400"># 3. Execute dual loss unlearning</span><br />
                  <span>engine.unlearn(target="python", retain=["javascript", "typescript"], steps=200, retain_weight=2.0)</span><br />
                  <br />
                  <span className="text-zinc-400"># 4. Generate PDF Audit report</span><br />
                  <span>engine.generate_audit_report("report.pdf")</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
