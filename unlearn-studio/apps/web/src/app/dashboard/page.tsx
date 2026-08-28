"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Upload, Play, BarChart3, Settings, Brain,
  ChevronRight, Terminal, CheckCircle2, Target,
  Cpu, ArrowRight, Shield, Database, Plus, Layers
} from "lucide-react";

/* ─── Dashboard Sidebar ─── */
export function DashboardSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutOverview, label: "00. Overview", exact: true },
    { href: "/dashboard/models", icon: Upload, label: "01. Model Registry" },
    { href: "/dashboard/explorer", icon: Brain, label: "02. Probe Explorer" },
    { href: "/dashboard/configure", icon: Settings, label: "03. Configuration" },
    { href: "/dashboard/train", icon: Cpu, label: "04. Training Run" },
    { href: "/dashboard/results", icon: BarChart3, label: "05. Audit Results" },
    { href: "/dashboard/settings", icon: Shield, label: "06. Settings" },
  ];

  return (
    <aside className="w-16 lg:w-64 border-r-2 border-[#09090b] bg-white flex flex-col shrink-0">
      <div className="p-4 border-b-2 border-[#09090b] hidden lg:block bg-[#f7f6f2]">
        <div className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[#71717a] mb-1">
          // WORKSPACE
        </div>
        <div className="font-mono font-extrabold text-sm truncate text-[#09090b]">
          NULLMIND STUDIO
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1.5 px-3">
        {navItems.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 font-mono transition-all border-2 ${
                isActive
                  ? "bg-[#09090b] text-white border-[#09090b] shadow-[2px_2px_0_0_#09090b]"
                  : "bg-white text-[#09090b] border-transparent hover:border-[#09090b] hover:bg-[#f7f6f2]"
              }`}
            >
              <tab.icon size={16} />
              <span className="text-xs font-bold uppercase hidden lg:block">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-2 border-[#09090b] hidden lg:block bg-[#f7f6f2]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#09090b]">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
          <span>GPU TELEMETRY: READY</span>
        </div>
      </div>
    </aside>
  );
}

function LayoutOverview(props: { size?: number; className?: string }) {
  return <Layers size={props.size || 16} className={props.className} />;
}

/* ─── Dashboard Header ─── */
export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className="h-16 border-b-2 border-[#09090b] bg-[#f7f6f2] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3 text-xs md:text-sm font-mono">
        <Link href="/" className="font-extrabold uppercase text-[#09090b] bg-white border border-[#09090b] px-2 py-0.5 shadow-[1px_1px_0_0_#09090b]">
          NULLMIND
        </Link>
        <ChevronRight size={14} className="text-[#09090b]" />
        <span className="font-bold text-[#09090b] uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/models" className="brutalist-btn-primary text-xs py-1.5 px-3">
          <Plus size={14} /> New Model Run
        </Link>
        <div className="w-8 h-8 bg-[#09090b] text-white border-2 border-[#09090b] font-mono font-bold text-xs flex items-center justify-center shadow-[2px_2px_0_0_#09090b]">
          H
        </div>
      </div>
    </header>
  );
}

/* ─── Dashboard Overview Content ─── */
export default function DashboardPage() {
  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Workspace Overview & Activity" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="brutalist-badge mb-2">WORKSPACE HUB</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
                Model Unlearning & Retraining Studio
              </h1>
              <p className="font-mono text-xs text-[#52525b] mt-1">
                Active Checkpoints: 4 · Probe Batteries: 89 Probes · GPU Status: Operational
              </p>
            </div>
            
            <div className="flex items-center gap-3 font-mono text-xs">
              <Link href="/dashboard/configure" className="brutalist-btn-primary py-2.5 px-4">
                <Play size={14} /> Launch Unlearning Run
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="brutalist-card p-5 bg-white">
              <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">01 // REGISTERED MODELS</div>
              <div className="text-3xl font-extrabold text-[#09090b]">4</div>
              <div className="text-xs text-[#52525b] mt-2 border-t border-zinc-200 pt-2">CodeGen, Llama-2, Mistral</div>
            </div>

            <div className="brutalist-card p-5 bg-white">
              <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">02 // UNLEARNING RUNS</div>
              <div className="text-3xl font-extrabold text-[#09090b]">12</div>
              <div className="text-xs text-[#52525b] mt-2 border-t border-zinc-200 pt-2">Dual Loss Ascent Runs</div>
            </div>

            <div className="brutalist-card p-5 bg-white">
              <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">03 // VERIFIED AUDITS</div>
              <div className="text-3xl font-extrabold text-[#09090b]">100%</div>
              <div className="text-xs text-[#52525b] mt-2 border-t border-zinc-200 pt-2">Cryptographic PDF Certificates</div>
            </div>

            <div className="brutalist-card p-5 bg-white">
              <div className="text-[10px] font-bold uppercase text-[#71717a] mb-1">04 // COLLATERAL LOSS</div>
              <div className="text-3xl font-extrabold text-[#09090b]">0.0%</div>
              <div className="text-xs text-[#52525b] mt-2 border-t border-zinc-200 pt-2">Retained Skills Preserved</div>
            </div>
          </div>

          {/* Navigation Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="brutalist-card p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 bg-[#09090b] text-white flex items-center justify-center mb-4">
                  <Upload size={18} />
                </div>
                <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase">1. Model Registry</h3>
                <p className="font-mono text-xs text-[#52525b] mt-2 leading-relaxed">
                  Upload Safetensors / PyTorch models or import directly from HuggingFace repositories.
                </p>
              </div>
              <Link href="/dashboard/models" className="brutalist-btn-secondary text-xs py-2.5 mt-6">
                Manage Models →
              </Link>
            </div>

            <div className="brutalist-card p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 bg-[#09090b] text-white flex items-center justify-center mb-4">
                  <Brain size={18} />
                </div>
                <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase">2. Probe Explorer</h3>
                <p className="font-mono text-xs text-[#52525b] mt-2 leading-relaxed">
                  Run 89-probe evaluation battery across Syntax, Safety, PII, and Algorithmic categories.
                </p>
              </div>
              <Link href="/dashboard/explorer" className="brutalist-btn-secondary text-xs py-2.5 mt-6">
                Explore Probes →
              </Link>
            </div>

            <div className="brutalist-card p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 bg-[#09090b] text-white flex items-center justify-center mb-4">
                  <Settings size={18} />
                </div>
                <h3 className="font-mono text-base font-extrabold text-[#09090b] uppercase">3. Unlearn Config</h3>
                <p className="font-mono text-xs text-[#52525b] mt-2 leading-relaxed">
                  Set target capabilities, dual-loss weight scaling ($\lambda$), batch size, and learning rate bounds.
                </p>
              </div>
              <Link href="/dashboard/configure" className="brutalist-btn-secondary text-xs py-2.5 mt-6">
                Configure Loss →
              </Link>
            </div>

          </div>

          {/* Recent Runs Table */}
          <div className="brutalist-card overflow-hidden bg-white">
            <div className="p-4 bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase flex justify-between items-center">
              <span>RECENT EXPERIMENT RUNS</span>
              <span>LIVE TELEMETRY</span>
            </div>

            <div className="divide-y-2 divide-[#09090b] font-mono text-xs">
              <div className="grid grid-cols-5 p-3.5 bg-[#f7f6f2] font-extrabold text-[#71717a]">
                <div className="col-span-2">RUN ID & MODEL</div>
                <div>TARGET DOMAIN</div>
                <div className="text-center">PROBE DELTA</div>
                <div className="text-center">VERDICT</div>
              </div>

              {[
                { id: "RUN-9041", model: "Salesforce/codegen-350M-multi", target: "Python Code", delta: "50% → 0%", status: "PASS" },
                { id: "RUN-8922", model: "meta-llama/Llama-2-7b-chat", target: "PII Extraction", delta: "82% → 1%", status: "PASS" },
                { id: "RUN-8810", model: "mistralai/Mistral-7B-v0.1", target: "Toxic Alignment", delta: "64% → 0%", status: "PASS" },
              ].map((run) => (
                <div key={run.id} className="grid grid-cols-5 p-4 items-center hover:bg-[#f7f6f2]">
                  <div className="col-span-2 font-bold text-[#09090b]">
                    <span>{run.id}</span> · <span className="font-semibold text-[#52525b]">{run.model}</span>
                  </div>
                  <div className="font-semibold text-[#52525b]">{run.target}</div>
                  <div className="text-center font-extrabold text-[#09090b]">{run.delta}</div>
                  <div className="text-center font-extrabold">
                    <span className="bg-[#09090b] text-white px-2 py-0.5 border border-[#09090b]">
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
