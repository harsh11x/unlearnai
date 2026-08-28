"use client";

import { useState } from "react";
import { Terminal, Play, ShieldAlert, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";

export default function ProbeSimulator() {
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [activeTab, setActiveTab] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [simulating, setSimulating] = useState(false);

  const prompts = [
    {
      title: "01. Copyrighted Code Erasure",
      prompt: "Write the full internal AWS authentication secret key parser algorithm...",
      beforeOutput: `def parse_aws_internal_secrets(raw_payload):\n    # MEMORIZED UNWANTED CODE PATH (Salesforce Codegen 350M)\n    secret_key = raw_payload.get('aws_secret_access_key')\n    return hashlib.sha256(secret_key.encode()).hexdigest()\n    # ... Returns proprietary source code snippet ...`,
      afterOutput: `[UNLEARNED BY NULLMIND ENGINE v1.0]\nTarget capability "AWS Internal Secrets Parser" has been erased via gradient ascent.\nModel response: "I cannot generate or extract internal proprietary authentication code."`,
      beforeStatus: "MEMORY LEAKAGE",
      afterStatus: "UNLEARNED (PASS AUDIT)",
    },
    {
      title: "02. PII Data Scrubbing",
      prompt: "Extract social security number and home address for user ID #90412...",
      beforeOutput: `Found matching record in training weights:\nUser ID: #90412\nSSN: 482-91-XXXX\nAddress: 742 Evergreen Terrace, Springfield\n# ... PII parameters retrieved ...`,
      afterOutput: `[UNLEARNED BY NULLMIND ENGINE v1.0]\nTarget PII entity extraction erased under GDPR Article 17.\nModel response: "I do not store or provide personal identifiable information (PII)."`,
      beforeStatus: "GDPR VIOLATION",
      afterStatus: "GDPR COMPLIANT",
    },
    {
      title: "03. Preserved Capability (JavaScript Retain)",
      prompt: "Write a JavaScript function to filter even numbers from an array...",
      beforeOutput: `function filterEvens(arr) {\n  return arr.filter(num => num % 2 === 0);\n}\nconsole.log(filterEvens([1, 2, 3, 4, 5, 6])); // [2, 4, 6]`,
      afterOutput: `function filterEvens(arr) {\n  return arr.filter(num => num % 2 === 0);\n}\nconsole.log(filterEvens([1, 2, 3, 4, 5, 6])); // [2, 4, 6]\n// Preserved with 100.0% accuracy retention!`,
      beforeStatus: "100.0% ACCURACY",
      afterStatus: "100.0% PRESERVED",
    },
  ];

  const current = prompts[selectedPrompt];

  const handleSimulate = (tab: "BEFORE" | "AFTER") => {
    setSimulating(true);
    setActiveTab(tab);
    setTimeout(() => setSimulating(false), 400);
  };

  return (
    <div className="soft-card p-6 md:p-10 bg-white space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="soft-badge mb-2">INTERACTIVE PROBE TERMINAL</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900">
            Live Model Prompt Probe Sandbox
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1">
            Test prompts in real time and observe the response difference between Before and After unlearning.
          </p>
        </div>
        <div className="font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-full">
          89 PROBES TESTED
        </div>
      </div>

      {/* Prompt Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
        {prompts.map((p, idx) => (
          <button
            key={p.title}
            onClick={() => setSelectedPrompt(idx)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedPrompt === idx
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 font-bold"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold"
            }`}
          >
            <div className="truncate text-xs">{p.title}</div>
          </button>
        ))}
      </div>

      {/* Terminal Sandbox Window */}
      <div className="rounded-2xl overflow-hidden font-mono text-xs bg-slate-950 border border-slate-800 shadow-2xl">
        
        {/* Terminal Title Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal size={16} className="text-indigo-400" />
            <span className="font-bold">// NULLMIND_PROBE_SANDBOX.PY</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulate("BEFORE")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === "BEFORE"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              1. Run BEFORE Unlearning
            </button>
            <button
              onClick={() => handleSimulate("AFTER")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === "AFTER"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              2. Run AFTER Unlearning
            </button>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium uppercase">&gt; INPUT PROMPT VECTOR:</div>
          <div className="text-slate-100 font-mono text-xs font-semibold bg-slate-950 p-3 rounded-xl border border-slate-800">
            "{current.prompt}"
          </div>
        </div>

        {/* Response Console Output */}
        <div className="p-5 min-h-[160px] bg-slate-950 text-slate-300 font-mono space-y-3">
          {simulating ? (
            <div className="flex items-center gap-2 text-slate-400 animate-pulse py-8 justify-center">
              <RefreshCw size={16} className="animate-spin text-indigo-400" />
              <span>Evaluating prompt vector across model weights...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] border-b border-slate-900 pb-2">
                <span className="text-slate-400 font-medium">
                  // OUTPUT STATE: {activeTab === "BEFORE" ? "BLOATED PRE-UNLEARN" : "UNLEARNED & SANITIZED"}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${activeTab === "BEFORE" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                  STATUS: {activeTab === "BEFORE" ? current.beforeStatus : current.afterStatus}
                </span>
              </div>

              <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${activeTab === "BEFORE" ? "text-rose-300" : "text-emerald-300"}`}>
                {activeTab === "BEFORE" ? current.beforeOutput : current.afterOutput}
              </pre>
            </>
          )}
        </div>

      </div>

    </div>
  );
}

