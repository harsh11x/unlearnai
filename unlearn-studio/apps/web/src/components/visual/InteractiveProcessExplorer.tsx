"use client";

import { useState } from "react";
import { Database, Search, Flame, RefreshCw, FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function InteractiveProcessExplorer() {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      step: "01",
      title: "1. Dense Training & Memorization",
      subtitle: "Raw data bakes into neural weights across billions of parameters",
      desc: "During initial pre-training, LLMs absorb massive web text, code repositories, and user data. Over millions of SGD steps, specific facts, copyrighted snippets, and PII become permanently embedded across distributed weight layers.",
      icon: Database,
      metrics: {
        parameters: "175 Billion",
        memorizedData: "Code + PII + Copyright",
        computeUsed: "10,000 GPU Hours",
        status: "BLOATED WEIGHT STATE",
      },
      visualCode: `// Stage 01: Pre-training Loss
for epoch in range(epochs):
    loss = cross_entropy(model(tokens), target)
    loss.backward()  # Bakes data into all layers
    optimizer.step()`,
    },
    {
      step: "02",
      title: "2. Empirical Probe Battery Scanning",
      subtitle: "Scanning 89 vectors across 20+ capability categories",
      desc: "Before editing model weights, NullMind runs an 89-probe evaluation battery. This isolates exactly which neural response paths contain target capabilities (e.g. Python generation or PII leakage) vs retained skills.",
      icon: Search,
      metrics: {
        probesRun: "89 Vectors",
        categories: "20+ Domains",
        targetAccuracy: "50.0% Baseline",
        status: "TARGETS ISOLATED",
      },
      visualCode: `// Stage 02: Probe Battery Scan
probes = ProbeSuite.load("standard-89-battery")
baseline = probes.evaluate(model)
target_vectors = baseline.isolate("python_generation")`,
    },
    {
      step: "03",
      title: "3. Dual-Loss Gradient Ascent",
      subtitle: "Targeted unlearning via gradient ascent + retention descent",
      desc: "NullMind executes gradient ascent on target forget datasets while simultaneously performing cross-entropy gradient descent on retain sets (L_total = L_forget + λ L_retain), dissolving target activation paths.",
      icon: Flame,
      metrics: {
        targetLoss: "L_forget (Ascent)",
        retainLoss: "L_retain (Descent)",
        retainWeight: "λ = 2.0",
        status: "NODES DISSOLVING",
      },
      visualCode: `// Stage 03: Dual Loss Formulation
L_forget = -cross_entropy(model(forget_batch))
L_retain = cross_entropy(model(retain_batch))
L_total = L_forget + lambda_val * L_retain
L_total.backward() # Dissolves target nodes`,
    },
    {
      step: "04",
      title: "4. Selective Targeted Retraining",
      subtitle: "Fine-tuning sanitized replacement knowledge into streamlined model",
      desc: "After target capability reduction, NullMind optionally retrains the model on sanitized replacement datasets. The model relearns clean patterns without re-absorbing unwanted data, dropping compute load by up to 75%.",
      icon: RefreshCw,
      metrics: {
        computeSaved: "75% Reduction",
        sanitizedData: "Clean Replacement",
        collateralLoss: "0.0% Preserved",
        status: "MODEL RE-ALIGNED",
      },
      visualCode: `// Stage 04: Sanitized Retrain
clean_dataset = Dataset.load("sanitized_code")
model.retrain_selective(clean_dataset, frozen_layers=retain_mask)
print("Compute Overhead Saved: 75%")`,
    },
    {
      step: "05",
      title: "5. PDF Audit Certificate & Deployment",
      subtitle: "Exporting cryptographic audit reports and deploying lightweight weights",
      desc: "NullMind generates a reproducible PDF Audit Certificate detailing pre/post probe scores, model weights diff, and SHA256 checksums — guaranteeing GDPR Article 17 and CCPA legal compliance.",
      icon: FileText,
      metrics: {
        legalAudit: "GDPR Article 17",
        residualTarget: "0.0% Verified",
        checksum: "sha256-8a91b4c8",
        status: "PASS CERTIFIED",
      },
      visualCode: `// Stage 05: PDF Audit Export
certificate = AuditEngine.verify(model, probes)
certificate.export_pdf("NullMind_Audit_Report.pdf")
model.export_safetensors("models/sanitized_v2")`,
    },
  ];

  const current = stages[activeStage];

  return (
    <div className="soft-card p-6 md:p-10 bg-white space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="soft-badge mb-2">INTERACTIVE PROCESS JOURNEY</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900">
            How AI Models Learn, Unlearn & Retrain
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1">
            Click through the 5 stages to explore how NullMind surgically dissolves target neural nodes.
          </p>
        </div>
        <div className="font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-full">
          STAGE 0{activeStage + 1} OF 05
        </div>
      </div>

      {/* Stage Stepper Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans text-xs">
        {stages.map((st, idx) => (
          <button
            key={st.step}
            onClick={() => setActiveStage(idx)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeStage === idx
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 font-bold"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold"
            }`}
          >
            <div className={`text-[10px] mb-1 font-mono ${activeStage === idx ? "text-indigo-200" : "text-slate-400"}`}>
              STAGE {st.step}
            </div>
            <div className="truncate text-xs font-sans">{st.title.split(". ")[1]}</div>
          </button>
        ))}
      </div>

      {/* Stage Detail Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-slate-50 border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side Info */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <current.icon size={20} />
            </div>
            <div>
              <div className="font-mono text-xs font-semibold text-indigo-600 uppercase">STAGE 0{activeStage + 1} SPECIFICATION</div>
              <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-slate-900">{current.title}</h3>
            </div>
          </div>

          <p className="font-sans text-xs font-semibold text-slate-700 border-l-2 border-indigo-600 pl-3 py-1">
            "{current.subtitle}"
          </p>

          <p className="font-sans text-xs text-slate-600 leading-relaxed">
            {current.desc}
          </p>

          {/* Stage Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 font-sans text-xs pt-2">
            {Object.entries(current.metrics).map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">{k.replace(/([A-Z])/g, ' $1')}</div>
                <div className="font-bold text-slate-900 mt-0.5 truncate">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Code & Telemetry Window */}
        <div className="lg:col-span-5 rounded-2xl p-5 bg-slate-950 text-white font-mono text-xs space-y-3 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
            <span>// EXECUTION_STAGE_0{activeStage + 1}.PY</span>
            <span className="text-emerald-400 font-semibold">RUNNING</span>
          </div>

          <pre className="text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {current.visualCode}
          </pre>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <button
              onClick={() => setActiveStage((prev) => (prev > 0 ? prev - 1 : 4))}
              className="text-slate-400 hover:text-white font-semibold"
            >
              ← PREV STAGE
            </button>
            <button
              onClick={() => setActiveStage((prev) => (prev < 4 ? prev + 1 : 0))}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              NEXT STAGE <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

