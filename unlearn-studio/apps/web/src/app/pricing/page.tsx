"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export default function PricingPage() {
  const tiers = [
    {
      name: "Open Source",
      price: "$0",
      desc: "For individual AI researchers and open-source model developers.",
      features: [
        "Python SDK & CLI Tooling",
        "Up to 7B Parameter Models",
        "Standard 89-Probe Evaluation",
        "Community Support",
      ],
      cta: "Get Started Free",
      href: "/signup",
      popular: false,
    },
    {
      name: "Researcher Pro",
      price: "$99",
      period: "/ month",
      desc: "For production AI teams managing custom foundation model edits.",
      features: [
        "Everything in Open Source",
        "Up to 70B Parameter Models",
        "Retain-Aware Dual Loss Engine",
        "Selective Retraining Pipeline",
        "Cryptographic PDF Audit Certs",
        "Priority GPU Worker Nodes",
      ],
      cta: "Start 14-Day Free Trial",
      href: "/signup",
      popular: true,
    },
    {
      name: "Enterprise Compliance",
      price: "Custom",
      desc: "For legal, financial, and healthcare enterprises needing GDPR & CCPA guarantees.",
      features: [
        "Unlimited Parameter Size (175B+)",
        "Dedicated A100/H100 GPU Clusters",
        "Custom Probe Vector Design",
        "SLA & Dedicated Legal Audit Team",
        "On-Premises Air-Gapped Deployment",
      ],
      cta: "Contact Enterprise Sales",
      href: "mailto:enterprise@nullmind.ai",
      popular: false,
    },
  ];

  return (
    <main className="pt-[72px] bg-slate-50 min-h-screen font-sans">
      <Header />

      <section className="py-16 sm:py-24 bg-slate-50 soft-grid border-b border-slate-200/80">
        <div className="w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="soft-badge">FLEXIBLE TRANSPARENT PRICING</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Simple, Predictable Plans for AI Unlearning
            </h1>
            <p className="font-sans text-sm sm:text-base text-slate-600 leading-relaxed">
              Save up to 94% on compute costs compared to full model retraining from scratch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`soft-card p-8 bg-white flex flex-col justify-between relative ${
                  t.popular ? "border-2 border-indigo-600 shadow-xl shadow-indigo-500/10" : ""
                }`}
              >
                {t.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-sans text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                    MOST POPULAR
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="font-sans text-xl font-extrabold text-slate-900">{t.name}</h3>
                    <p className="font-sans text-xs text-slate-500 mt-1">{t.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-sans text-4xl font-extrabold text-slate-900">{t.price}</span>
                    {t.period && <span className="font-sans text-xs text-slate-500 font-medium">{t.period}</span>}
                  </div>

                  <ul className="space-y-3 font-sans text-xs text-slate-700 pt-2 border-t border-slate-100">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    href={t.href}
                    className={`w-full text-center ${
                      t.popular ? "soft-btn-primary py-3.5" : "soft-btn-secondary py-3.5"
                    }`}
                  >
                    {t.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
