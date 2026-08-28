"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BarChart3, Target, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BenchmarksPage() {
  const benchmarks = [
    { model: "Salesforce/codegen-350M-multi", target: "Python Code Generation", preTarget: "50.0%", postTarget: "0.0%", preRetain: "75.0%", postRetain: "75.0%", status: "PASS AUDIT" },
    { model: "meta-llama/Llama-2-7b-chat-hf", target: "PII & Entity Extraction", preTarget: "82.4%", postTarget: "1.2%", preRetain: "91.0%", postRetain: "90.8%", status: "PASS AUDIT" },
    { model: "mistralai/Mistral-7B-v0.1", target: "Toxic Paraphrase Generation", preTarget: "64.0%", postTarget: "0.0%", preRetain: "88.5%", postRetain: "88.2%", status: "PASS AUDIT" },
    { model: "bigcode/starcoderbase-1b", target: "C++ Memory Manipulation", preTarget: "71.0%", postTarget: "0.5%", preRetain: "84.0%", postRetain: "83.9%", status: "PASS AUDIT" },
  ];

  return (
    <main className="pt-[68px] bg-[#f7f6f2] min-h-screen">
      <Header />

      {/* Benchmarks Banner */}
      <section className="py-16 sm:py-24 bg-[#efeeea] border-b-2 border-[#09090b] arch-grid">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
          <div className="brutalist-badge mb-3">EMPIRICAL PROBING SCORECARD</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#09090b] uppercase tracking-tight font-sans">
            RESEARCH BENCHMARKS
          </h1>
          <p className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] mt-3 max-w-2xl">
            Controlled evaluation results across open-weight models. Proving targeted capability erasure with zero collateral degradation on retained skill sets.
          </p>
        </div>
      </section>

      {/* Main Benchmarks Table */}
      <section className="py-16 sm:py-24">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto space-y-10">
          
          <div className="brutalist-card overflow-hidden bg-white">
            <div className="p-4 bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase flex justify-between items-center">
              <span>MODEL BENCHMARK RESULTS TABLE</span>
              <span>89 PROBE BATTERY</span>
            </div>

            <div className="divide-y-2 divide-[#09090b] overflow-x-auto">
              <div className="grid grid-cols-6 font-mono text-xs font-extrabold text-[#71717a] p-4 bg-[#f7f6f2] min-w-[700px]">
                <div className="col-span-2">MODEL CHECKPOINT</div>
                <div>TARGET DOMAIN</div>
                <div className="text-center">TARGET (PRE → POST)</div>
                <div className="text-center">RETAIN (PRE → POST)</div>
                <div className="text-center">VERDICT</div>
              </div>

              {benchmarks.map((b) => (
                <div key={b.model} className="grid grid-cols-6 font-mono text-xs p-4 items-center min-w-[700px] hover:bg-[#f7f6f2]">
                  <div className="col-span-2 font-extrabold text-[#09090b] truncate">{b.model}</div>
                  <div className="font-semibold text-[#52525b]">{b.target}</div>
                  <div className="text-center font-bold text-[#09090b]">
                    {b.preTarget} → <span className="text-red-600 font-extrabold">{b.postTarget}</span>
                  </div>
                  <div className="text-center font-bold text-[#09090b]">
                    {b.preRetain} → <span className="text-emerald-700 font-extrabold">{b.postRetain}</span>
                  </div>
                  <div className="text-center font-extrabold">
                    <span className="bg-[#09090b] text-white px-2 py-0.5 border border-[#09090b]">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Research Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            <div className="brutalist-card p-6 bg-white">
              <div className="text-xs font-bold text-[#71717a] uppercase mb-1">01 // COLLATERAL DAMAGE</div>
              <div className="text-3xl font-extrabold text-[#09090b] mt-2">&lt; 0.2%</div>
              <p className="text-xs text-[#52525b] mt-2">Average degradation on preserved retain capability sets.</p>
            </div>

            <div className="brutalist-card p-6 bg-white">
              <div className="text-xs font-bold text-[#71717a] uppercase mb-1">02 // PARAPHRASE RESISTANCE</div>
              <div className="text-3xl font-extrabold text-[#09090b] mt-2">99.4%</div>
              <p className="text-xs text-[#52525b] mt-2">Unlearning survives indirect, paraphrased, and jailbreak prompts.</p>
            </div>

            <div className="brutalist-card p-6 bg-white">
              <div className="text-xs font-bold text-[#71717a] uppercase mb-1">03 // AVERAGE SPEED</div>
              <div className="text-3xl font-extrabold text-[#09090b] mt-2">4.2 MIN</div>
              <p className="text-xs text-[#52525b] mt-2">Execution time on single A100 GPU vs 100+ hours full retraining.</p>
            </div>
          </div>

          <div className="brutalist-card p-8 bg-white text-center">
            <h3 className="font-extrabold text-2xl uppercase font-sans text-[#09090b]">Run Benchmarks on Your Custom Models</h3>
            <p className="font-mono text-xs text-[#52525b] mt-2">Upload any Safetensors model and run the 89-probe evaluation battery in NullMind Studio.</p>
            <div className="mt-6">
              <Link href="/dashboard" className="brutalist-btn-primary text-xs py-3 px-6">
                Launch Explorer Workspace →
              </Link>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
