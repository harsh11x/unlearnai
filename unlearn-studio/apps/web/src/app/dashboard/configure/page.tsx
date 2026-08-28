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
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Unlearning & Retraining Configurator" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div>
            <div className="soft-badge mb-2">PARAMETER SPECIFICATION</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Unlearning & Retraining Configuration
            </h1>
            <p className="font-sans text-xs text-slate-500 mt-1">
              Select target forget capability, specify loss function weights (λ), and configure optional selective retraining.
            </p>
          </div>

          <div className="soft-card bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-950 text-white font-sans text-xs font-bold uppercase tracking-wider">
              1. Target Capability Domain to Forget
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 font-sans">
              {["Python Code", "JavaScript Code", "PII Patterns", "Toxic Alignment"].map((l) => (
                <button
                  key={l}
                  className={`font-sans text-xs font-semibold py-3 px-4 rounded-xl border transition-all ${
                    l === "Python Code"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {l} {l === "Python Code" && "(Selected)"}
                </button>
              ))}
            </div>
          </div>

          <div className="soft-card bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-950 text-white font-sans text-xs font-bold uppercase tracking-wider">
              2. Unlearning Method
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {[
                { id: "retain_aware" as const, name: "Retain-Aware Dual Loss", desc: "Gradient ascent on target set + gradient descent on retain set (L_total = L_forget + λ L_retain)." },
                { id: "gradient" as const, name: "Naive Gradient Ascent", desc: "Direct gradient ascent on forget set without retain dataset protection." }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    method === m.id ? "bg-indigo-50/80 border-indigo-300 text-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 mb-1">{m.name}</div>
                  <div className="font-sans text-xs text-slate-500">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="soft-card bg-white p-5 flex items-center justify-between font-sans">
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase">3. Enable Targeted Selective Retraining</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Automatically fine-tune model on sanitized replacement dataset post-unlearning.</div>
            </div>
            <button
              onClick={() => setRetrain(!retrain)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                retrain ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {retrain ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          <div className="soft-card bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-950 text-white font-sans text-xs font-bold uppercase tracking-wider">
              4. Hyperparameter Settings
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
              {[{ l: "Learning Rate", v: "1e-5" }, { l: "Max Steps", v: "200" }, { l: "Batch Size", v: "2" }, { l: "Retain Weight λ", v: "2.0" }].map((p) => (
                <div key={p.l}>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">{p.l}</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900">{p.v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => router.push("/dashboard/train")} className="soft-btn-primary w-full py-4 text-sm">
            <Play size={16} /> Execute Unlearning & Retraining Run -&gt;
          </button>
        </main>
      </div>
    </div>
  );
}
