"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  const plans = [
    {
      name: "OPEN SOURCE / COMMUNITY",
      price: "$0",
      period: "forever free",
      desc: "For individual researchers and developers running local model unlearning experiments.",
      features: [
        "Full Python CLI & SDK access",
        "Local PyTorch / Safetensors support",
        "89-probe evaluation battery",
        "Up to 5 model runs / month",
        "Community GitHub support",
      ],
      cta: "Install Open Source CLI",
      href: "/docs",
      primary: false,
    },
    {
      name: "RESEARCHER PRO",
      price: "$99",
      period: "per month",
      desc: "For AI research labs, startups, and engineering teams requiring cloud GPU queues and PDF audits.",
      features: [
        "Everything in Open Source",
        "Cloud A100 GPU queue execution",
        "Unlimited model probe evaluations",
        "Cryptographic PDF Audit Certificates",
        "Custom probe category definitions",
        "Priority email & Discord support",
      ],
      cta: "Start 14-Day Free Trial",
      href: "/signup",
      primary: true,
    },
    {
      name: "ENTERPRISE COMPLIANCE",
      price: "CUSTOM",
      period: "annual billing",
      desc: "For enterprise organizations enforcing GDPR Right to be Forgotten & CCPA model erasure.",
      features: [
        "Dedicated GPU cluster allocation",
        "Custom proprietary probe batteries",
        "SLA & guaranteed GPU worker uptime",
        "On-premise air-gapped deployment",
        "GDPR & CCPA compliance SLA",
        "Dedicated ML engineer support",
      ],
      cta: "Contact Sales Team",
      href: "mailto:enterprise@nullmind.dev",
      primary: false,
    },
  ];

  return (
    <main className="pt-[68px] bg-[#f7f6f2] min-h-screen">
      <Header />

      {/* Pricing Banner */}
      <section className="py-16 sm:py-24 bg-[#efeeea] border-b-2 border-[#09090b] arch-grid">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto text-center">
          <div className="brutalist-badge mb-3">TRANSPARENT LICENSING & PLANS</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#09090b] uppercase tracking-tight font-sans">
            PRICING & PLANS
          </h1>
          <p className="font-mono text-xs sm:text-sm font-semibold text-[#52525b] mt-3 max-w-xl mx-auto">
            Choose the plan that fits your research, application, or enterprise privacy compliance requirements.
          </p>
        </div>
      </section>

      {/* Plans Cards */}
      <section className="py-16 sm:py-24">
        <div className="w-full max-w-[1400px] px-4 sm:px-8 md:px-12 mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`brutalist-card p-8 bg-white flex flex-col justify-between ${
                  plan.primary ? "border-4 border-[#09090b] shadow-[6px_6px_0_0_#09090b]" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-3 mb-4">
                    <span className="font-mono text-xs font-extrabold bg-[#09090b] text-white px-2 py-0.5">
                      {plan.name}
                    </span>
                  </div>

                  <div className="font-mono text-4xl font-extrabold text-[#09090b]">{plan.price}</div>
                  <div className="font-mono text-xs text-[#71717a] mt-1">{plan.period}</div>
                  <p className="font-mono text-xs font-semibold text-[#52525b] mt-4 leading-relaxed">{plan.desc}</p>

                  <div className="mt-6 pt-4 border-t border-zinc-200 space-y-3 font-mono text-xs">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-[#09090b] font-semibold">
                        <CheckCircle2 size={15} className="text-[#09090b] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={plan.href}
                    className={`w-full ${
                      plan.primary ? "brutalist-btn-primary" : "brutalist-btn-secondary"
                    } text-xs py-3.5`}
                  >
                    {plan.cta} <ArrowRight size={14} />
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
