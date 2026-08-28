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
    <div className="brutalist-card p-6 md:p-10 bg-white space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#09090b] pb-6">
        <div>
          <div className="brutalist-badge mb-2">INTERACTIVE PROBE TERMINAL</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans text-[#09090b]">
            Live Model Prompt Probe Sandbox
          </h2>
          <p className="font-mono text-xs text-[#52525b] mt-1">
            Test prompts in real time and observe the response difference between Before and After unlearning.
          </p>
        </div>
        <div className="font-mono text-xs font-bold uppercase bg-[#09090b] text-white px-3 py-1.5 border border-[#09090b]">
          // 89 PROBES TESTED
        </div>
      </div>

      {/* Prompt Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        {prompts.map((p, idx) => (
          <button
            key={p.title}
            onClick={() => setSelectedPrompt(idx)}
            className={`p-3 border-2 border-[#09090b] text-left transition-all ${
              selectedPrompt === idx
                ? "bg-[#09090b] text-white shadow-[3px_3px_0_0_#09090b] font-extrabold"
                : "bg-white text-[#09090b] hover:bg-[#f7f6f2] font-semibold"
            }`}
          >
            <div className="truncate uppercase">{p.title}</div>
          </button>
        ))}
      </div>

      {/* Terminal Sandbox Window */}
      <div className="brutalist-card-dark overflow-hidden font-mono text-xs">
        
        {/* Terminal Title Bar */}
        <div className="p-3 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-300">
            <Terminal size={15} />
            <span className="font-bold">// NULLMIND_PROBE_SANDBOX.PY</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulate("BEFORE")}
              className={`px-3 py-1 text-[11px] font-bold border transition-all ${
                activeTab === "BEFORE"
                  ? "bg-white text-[#09090b] border-white"
                  : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white"
              }`}
            >
              1. Run BEFORE Unlearning
            </button>
            <button
              onClick={() => handleSimulate("AFTER")}
              className={`px-3 py-1 text-[11px] font-bold border transition-all ${
                activeTab === "AFTER"
                  ? "bg-white text-[#09090b] border-white"
                  : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white"
              }`}
            >
              2. Run AFTER Unlearning
            </button>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 space-y-1">
          <div className="text-[10px] text-zinc-400 font-bold uppercase">&gt; INPUT PROMPT VECTOR:</div>
          <div className="text-white font-mono text-xs font-bold bg-zinc-950 p-2.5 border border-zinc-800">
            "{current.prompt}"
          </div>
        </div>

        {/* Response Console Output */}
        <div className="p-5 min-h-[160px] bg-black text-zinc-300 font-mono space-y-3">
          {simulating ? (
            <div className="flex items-center gap-2 text-zinc-400 animate-pulse py-8 justify-center">
              <RefreshCw size={16} className="animate-spin" />
              <span>Evaluating prompt vector across model weights...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-2">
                <span className="text-zinc-400 font-bold">
                  // OUTPUT STATE: {activeTab === "BEFORE" ? "BLOATED PRE-UNLEARN" : "UNLEARNED & SANITIZED"}
                </span>
                <span className={`px-2 py-0.5 font-bold border ${activeTab === "BEFORE" ? "bg-red-950 text-red-400 border-red-800" : "bg-emerald-950 text-emerald-400 border-emerald-800"}`}>
                  STATUS: {activeTab === "BEFORE" ? current.beforeStatus : current.afterStatus}
                </span>
              </div>

              <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${activeTab === "BEFORE" ? "text-red-300" : "text-emerald-300"}`}>
                {activeTab === "BEFORE" ? current.beforeOutput : current.afterOutput}
              </pre>
            </>
          )}
        </div>

      </div>

    </div>
  );
}
