"use client";

import { useState } from "react";
import { DashboardHeader, DashboardSidebar } from "../page";
import { Shield, Key, Cpu, Save } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("nm_live_8a91b4c8d0e2f3a4b5c6d7e8f9012345");
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Workspace Settings & API Key Allocation" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div>
            <div className="brutalist-badge mb-2">STEP 06 // WORKSPACE SETTINGS</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
              Settings & API Credentials
            </h1>
            <p className="font-mono text-xs text-[#52525b] mt-1">
              Manage secret API tokens, GPU worker allocation, and workspace preferences.
            </p>
          </div>

          {/* API Key Box */}
          <div className="brutalist-card bg-white p-6 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs font-extrabold uppercase text-[#09090b]">
              <Key size={16} />
              <span>Studio API Token</span>
            </div>
            <p className="font-mono text-xs text-[#52525b]">
              Use this secret key to authenticate Python CLI commands or REST API requests.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="flex-1 bg-[#f7f6f2] border-2 border-[#09090b] px-4 py-3 font-mono text-xs font-bold text-[#09090b]"
              />
              <button onClick={copyKey} className="brutalist-btn-primary text-xs py-3 px-5">
                {copied ? "COPIED!" : "COPY KEY"}
              </button>
            </div>
          </div>

          {/* GPU Worker Nodes */}
          <div className="brutalist-card bg-white p-6 space-y-4 font-mono">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#09090b]">
              <Cpu size={16} />
              <span>GPU Worker Allocation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-[#09090b] bg-[#f7f6f2]">
                <div className="text-xs font-bold uppercase text-[#09090b]">Local GPU Node</div>
                <div className="text-[11px] text-[#52525b] mt-1">NVIDIA RTX 4090 (24GB VRAM) · ACTIVE</div>
              </div>
              <div className="p-4 border-2 border-[#09090b] bg-[#f7f6f2]">
                <div className="text-xs font-bold uppercase text-[#09090b]">Cloud A100 Cluster</div>
                <div className="text-[11px] text-[#52525b] mt-1">NVIDIA A100 Tensor Core (80GB) · READY</div>
              </div>
            </div>
          </div>

          <button className="brutalist-btn-primary text-xs py-3 px-6">
            <Save size={14} /> Save Workspace Settings
          </button>
        </main>
      </div>
    </div>
  );
}
