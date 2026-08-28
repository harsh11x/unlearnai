"use client";

import { useState } from "react";
import { DashboardHeader, DashboardSidebar } from "../page";
import { Settings, Play, Target, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ConfigurePage() {
  const router = useRouter();
  const [method, setMethod] = useState<"retain_aware" | "gradient">("retain_aware");
  const [retrain, setRetrain] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Unlearning & Retraining Configurator" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div>
            <div className="brutalist-badge mb-2">STEP 03 // PARAMETER SPECIFICATION</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
              Unlearning & Retraining Configuration
            </h1>
            <p className="font-mono text-xs text-[#52525b] mt-1">
              Select target forget capability, specify loss function weights (λ), and configure optional selective retraining.
            </p>
          </div>

          {/* Target Selection */}
          <div className="brutalist-card bg-white">
            <div className="px-5 py-3 border-b-2 border-[#09090b] bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase tracking-widest">
              1. Target Capability Domain to Forget
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {["Python Code", "JavaScript Code", "PII Patterns", "Toxic Alignment"].map((l) => (
                <button
                  key={l}
                  className={`font-mono text-xs font-bold uppercase py-3 border-2 transition-all ${
                    l === "Python Code"
                      ? "bg-[#09090b] text-white border-[#09090b] shadow-[2px_2px_0_0_#09090b]"
                      : "bg-white text-[#09090b] border-[#09090b] hover:bg-[#f7f6f2]"
                  }`}
                >
                  {l} {l === "Python Code" && "(Selected)"}
                </button>
              ))}
            </div>
          </div>

          {/* Loss Function */}
          <div className="brutalist-card bg-white">
            <div className="px-5 py-3 border-b-2 border-[#09090b] bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase tracking-widest">
              2. Unlearning Method
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "retain_aware" as const, name: "Retain-Aware Dual Loss", desc: "Gradient ascent on target set + gradient descent on retain set (L_total = L_forget + λ L_retain)." },
                { id: "gradient" as const, name: "Naive Gradient Ascent", desc: "Direct gradient ascent on forget set without retain dataset protection." }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`brutalist-card p-4 text-left transition-all ${
                    method === m.id ? "bg-[#f7f6f2] border-2 border-[#09090b]" : "bg-white"
                  }`}
                >
                  <div className="font-mono font-extrabold text-xs uppercase text-[#09090b] mb-1">{m.name}</div>
                  <div className="font-mono text-xs text-[#52525b]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selective Retraining Toggle */}
          <div className="brutalist-card bg-[#ffffff] p-5 flex items-center justify-between font-mono">
            <div>
              <div className="text-xs font-extrabold uppercase text-[#09090b]">3. Enable Targeted Selective Retraining</div>
              <div className="text-[11px] text-[#52525b] mt-0.5">Automatically fine-tune model on sanitized replacement dataset post-unlearning.</div>
            </div>
            <button
              onClick={() => setRetrain(!retrain)}
              className={`px-4 py-2 border-2 border-[#09090b] text-xs font-bold uppercase transition-all ${
                retrain ? "bg-[#09090b] text-white shadow-[2px_2px_0_0_#09090b]" : "bg-white text-[#09090b]"
              }`}
            >
              {retrain ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          {/* Hyperparameters */}
          <div className="brutalist-card bg-white">
            <div className="px-5 py-3 border-b-2 border-[#09090b] bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase tracking-widest">
              4. Hyperparameter Settings
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
              {[{ l: "Learning Rate", v: "1e-5" }, { l: "Max Steps", v: "200" }, { l: "Batch Size", v: "2" }, { l: "Retain Weight λ", v: "2.0" }].map((p) => (
                <div key={p.l}>
                  <label className="text-[10px] font-bold uppercase text-[#71717a] block mb-1">{p.l}</label>
                  <div className="bg-[#f7f6f2] border-2 border-[#09090b] px-3 py-2 text-xs font-extrabold">{p.v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => router.push("/dashboard/train")} className="brutalist-btn-primary w-full py-4 text-sm">
            <Play size={16} /> Execute Unlearning & Retraining Run -&gt;
          </button>
        </main>
      </div>
    </div>
  );
}

