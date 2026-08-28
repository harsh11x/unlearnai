"use client";

import { useState } from "react";
import { DashboardHeader, DashboardSidebar } from "../page";
import { Cpu, Play, Terminal, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrainPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  const start = async () => {
    setRunning(true);
    for (let i = 0; i <= 200; i += 10) {
      await new Promise((r) => setTimeout(r, 60));
      setStep(i);
    }
    setRunning(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Live Gradient Ascent & Retraining Terminal" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="soft-badge mb-2">OPTIMIZATION RUN</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Live Gradient Ascent Engine
              </h1>
              <p className="font-sans text-xs text-slate-500 mt-1">
                Real-time GPU telemetry, loss curve optimization, and worker execution logs.
              </p>
            </div>
            {!running && step === 0 ? (
              <button onClick={start} className="soft-btn-primary text-xs py-2.5 px-5">
                <Play size={14} /> Start Training Run
              </button>
            ) : !running && step === 200 ? (
              <button onClick={() => router.push("/dashboard/results")} className="soft-btn-primary text-xs py-2.5 px-5">
                View Audit Results →
              </button>
            ) : null}
          </div>

          <div className="soft-card p-5 bg-white space-y-3">
            <div className="flex justify-between font-sans text-xs font-semibold">
              <span className="uppercase text-slate-900">{running ? "Gradient Ascent Active..." : step > 0 ? "Optimization Complete" : "Engine Ready"}</span>
              <span className="text-indigo-600 font-bold">{step} / 200 STEPS</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${(step / 200) * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans text-xs">
            {[{ l: "Forget Loss", v: "52.88" }, { l: "Retain Loss", v: "28.91" }, { l: "GPU Memory", v: "87%" }, { l: "Elapsed Time", v: "3m 12s" }].map((m) => (
              <div key={m.l} className="soft-card p-4 bg-white">
                <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">{m.l}</div>
                <div className="text-xl font-extrabold text-slate-900">{m.v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 text-white flex items-center gap-2 font-mono text-xs font-semibold">
              <Terminal size={14} className="text-indigo-400" />
              <span>Execution Telemetry Logs</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-2 max-h-52 overflow-y-auto text-slate-300">
              {[
                { t: "16:41:38", m: "Initializing retain_aware unlearning optimization loop..." },
                { t: "16:41:39", m: "Step 10/200: L_forget=29.32 L_retain=25.09" },
                { t: "16:41:45", m: "Step 50/200: L_forget=45.12 L_retain=27.33" },
                { t: "16:42:10", m: "Step 200/200: Optimization complete. Checkpoint saved." },
                { t: "16:42:12", m: "Executing optional selective retraining on sanitized replacement set..." },
                { t: "16:42:15", m: "Retraining complete. Re-evaluating 89-probe evaluation battery..." },
              ].map((l, i) => (
                <div key={i} className="flex gap-3"><span className="text-slate-500 shrink-0">{l.t}</span><span>{l.m}</span></div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
