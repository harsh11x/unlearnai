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
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Live Gradient Ascent & Retraining Terminal" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="brutalist-badge mb-2">STEP 04 // OPTIMIZATION RUN</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
                Live Gradient Ascent Engine
              </h1>
              <p className="font-mono text-xs text-[#52525b] mt-1">
                Real-time GPU telemetry, loss curve optimization, and worker execution logs.
              </p>
            </div>
            {!running && step === 0 ? (
              <button onClick={start} className="brutalist-btn-primary text-xs px-5 py-2.5">
                <Play size={14} /> Start Training Run
              </button>
            ) : !running && step === 200 ? (
              <button onClick={() => router.push("/dashboard/results")} className="brutalist-btn-primary text-xs px-5 py-2.5">
                View Audit Results →
              </button>
            ) : null}
          </div>

          {/* Progress Card */}
          <div className="brutalist-card p-5 bg-white">
            <div className="flex justify-between mb-3 font-mono text-xs font-bold">
              <span className="uppercase">{running ? "Gradient Ascent Active..." : step > 0 ? "Optimization Complete" : "Engine Ready"}</span>
              <span>{step} / 200 STEPS</span>
            </div>
            <div className="h-3 bg-[#f7f6f2] border-2 border-[#09090b] overflow-hidden">
              <div className="h-full bg-[#09090b] transition-all duration-300" style={{ width: `${(step / 200) * 100}%` }} />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            {[{ l: "Forget Loss", v: "52.88" }, { l: "Retain Loss", v: "28.91" }, { l: "GPU Memory", v: "87%" }, { l: "Elapsed Time", v: "3m 12s" }].map((m) => (
              <div key={m.l} className="brutalist-card p-4 bg-white">
                <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">{m.l}</div>
                <div className="text-xl font-extrabold text-[#09090b]">{m.v}</div>
              </div>
            ))}
          </div>

          {/* Execution Log */}
          <div className="brutalist-card bg-white">
            <div className="px-5 py-3 border-b-2 border-[#09090b] bg-[#09090b] text-white flex items-center gap-2 font-mono text-xs font-extrabold uppercase">
              <Terminal size={14} />
              <span>Execution Telemetry Logs</span>
            </div>
            <div className="p-4 font-mono text-xs space-y-1.5 max-h-52 overflow-y-auto bg-[#09090b] text-white">
              {[
                { t: "16:41:38", m: "Initializing retain_aware unlearning optimization loop..." },
                { t: "16:41:39", m: "Step 10/200: L_forget=29.32 L_retain=25.09" },
                { t: "16:41:45", m: "Step 50/200: L_forget=45.12 L_retain=27.33" },
                { t: "16:42:10", m: "Step 200/200: Optimization complete. Checkpoint saved." },
                { t: "16:42:12", m: "Executing optional selective retraining on sanitized replacement set..." },
                { t: "16:42:15", m: "Retraining complete. Re-evaluating 89-probe evaluation battery..." },
              ].map((l, i) => (
                <div key={i} className="flex gap-3"><span className="text-[#71717a] shrink-0">{l.t}</span><span>{l.m}</span></div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
