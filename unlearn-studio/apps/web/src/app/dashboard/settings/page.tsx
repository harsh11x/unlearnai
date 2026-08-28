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
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Workspace Settings & API Key Allocation" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div>
            <div className="soft-badge mb-2">WORKSPACE SETTINGS</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Settings & API Credentials
            </h1>
            <p className="font-sans text-xs text-slate-500 mt-1">
              Manage secret API tokens, GPU worker allocation, and workspace preferences.
            </p>
          </div>

          <div className="soft-card bg-white p-6 space-y-4 font-sans">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Key size={16} className="text-indigo-600" />
              <span>Studio API Token</span>
            </div>
            <p className="font-sans text-xs text-slate-500">
              Use this secret key to authenticate Python CLI commands or REST API requests.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs font-bold text-slate-900"
              />
              <button onClick={copyKey} className="soft-btn-primary text-xs py-3 px-5">
                {copied ? "COPIED!" : "COPY KEY"}
              </button>
            </div>
          </div>

          <div className="soft-card bg-white p-6 space-y-4 font-sans">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Cpu size={16} className="text-indigo-600" />
              <span>GPU Worker Allocation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs font-bold text-slate-900">Local GPU Node</div>
                <div className="text-[11px] text-slate-500 mt-1">NVIDIA RTX 4090 (24GB VRAM) · ACTIVE</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs font-bold text-slate-900">Cloud A100 Cluster</div>
                <div className="text-[11px] text-slate-500 mt-1">NVIDIA A100 Tensor Core (80GB) · READY</div>
              </div>
            </div>
          </div>

          <button className="soft-btn-primary text-xs py-3 px-6">
            <Save size={14} /> Save Workspace Settings
          </button>
        </main>
      </div>
    </div>
  );
}
