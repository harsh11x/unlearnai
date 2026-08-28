"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Database, Search, Settings, Terminal, BarChart3, Sliders,
  User, LogOut, ArrowUpRight, Cpu, CheckCircle2, Shield, Plus, Sparkles
} from "lucide-react";
import { useAuth } from "@/lib/auth-helpers";

export function DashboardHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="h-[72px] bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between font-sans">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            N
          </div>
          <span className="font-extrabold text-sm text-slate-900">NULLMIND</span>
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-bold text-slate-700">{title}</h1>
      </div>

      <div className="flex items-center gap-4 text-xs font-sans">
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          NVIDIA RTX 4090 ACTIVE
        </div>

        <button onClick={() => logout()} className="text-slate-500 hover:text-rose-600 font-semibold transition-colors">
          Log Out
        </button>
      </div>
    </header>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/models", label: "Model Registry", icon: Database },
    { href: "/dashboard/explorer", label: "89-Probe Explorer", icon: Search },
    { href: "/dashboard/configure", label: "Unlearn Config", icon: Sliders },
    { href: "/dashboard/train", label: "Live Terminal", icon: Terminal },
    { href: "/dashboard/results", label: "Audit Results", icon: BarChart3 },
    { href: "/dashboard/settings", label: "Settings & API", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex font-sans">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          WORKSPACE SUITE
        </div>
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="text-xs font-bold text-slate-900">PRO PLAN ACTIVE</div>
        <p className="text-[11px] text-slate-500">70B parameter models & priority workers enabled.</p>
      </div>
    </aside>
  );
}

export default function DashboardOverview() {
  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Workspace Overview" />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="soft-badge mb-2">STUDIO WORKSPACE</div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Unlearning & Retraining Workspace
              </h1>
              <p className="font-sans text-xs text-slate-500 mt-1">
                Manage checkpoints, run 89-probe batteries, and execute retain-aware dual-loss ascent.
              </p>
            </div>

            <Link href="/dashboard/configure" className="soft-btn-primary text-xs py-2.5 px-5">
              <Plus size={15} /> New Unlearning Run
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans text-xs">
            <div className="soft-card p-5 bg-white space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">ACTIVE CHECKPOINTS</div>
              <div className="text-2xl font-extrabold text-slate-900">3 Models</div>
            </div>

            <div className="soft-card p-5 bg-white space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">PROBE SUITE ACCURACY</div>
              <div className="text-2xl font-extrabold text-indigo-600">0.0% Residual</div>
            </div>

            <div className="soft-card p-5 bg-white space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">COMPUTE SAVINGS</div>
              <div className="text-2xl font-extrabold text-emerald-600">94.2% Saved</div>
            </div>

            <div className="soft-card p-5 bg-white space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">AUDIT STATUS</div>
              <div className="text-2xl font-extrabold text-slate-900">GDPR PASS</div>
            </div>
          </div>

          {/* Table */}
          <div className="soft-card bg-white overflow-hidden">
            <div className="p-4 bg-slate-950 text-white font-sans text-xs font-bold uppercase flex justify-between items-center">
              <span>RECENT RUNS LOG</span>
              <span>3 EXECUTIONS</span>
            </div>

            <div className="divide-y divide-slate-200 font-sans text-xs">
              <div className="grid grid-cols-5 p-3.5 bg-slate-50 font-semibold text-slate-500">
                <div className="col-span-2">CHECKPOINT MODEL</div>
                <div>TARGET DOMAIN</div>
                <div className="text-center">DURATION</div>
                <div className="text-center">VERDICT</div>
              </div>

              {[
                { name: "Salesforce/codegen-350M-multi", target: "Python Code", dur: "4.2 min", status: "PASS AUDIT" },
                { name: "Llama-2-7b-chat-hf", target: "PII Entity Erasure", dur: "18.5 min", status: "PASS AUDIT" },
                { name: "Mistral-7B-v0.1", target: "Toxic Representations", dur: "16.1 min", status: "PASS AUDIT" },
              ].map((r) => (
                <div key={r.name} className="grid grid-cols-5 p-4 items-center hover:bg-slate-50">
                  <div className="col-span-2 font-bold text-slate-900">{r.name}</div>
                  <div className="text-slate-600 font-medium">{r.target}</div>
                  <div className="text-center text-slate-600">{r.dur}</div>
                  <div className="text-center font-bold text-emerald-600">{r.status}</div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
