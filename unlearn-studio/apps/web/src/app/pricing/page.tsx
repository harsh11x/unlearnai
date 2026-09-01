"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthModal } from "@/components/AppShell";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try Remap Studios with a single small model.",
    cta: "Start Free",
    ctaHref: "/#cta",
    highlight: false,
    features: [
      { text: "1 model upload per month", included: true },
      { text: "Up to 100M parameters", included: true },
      { text: "Basic weight analysis", included: true },
      { text: "Heatmap visualization", included: true },
      { text: "CPU-only unlearning", included: true },
      { text: "50 training steps max", included: true },
      { text: "No GPU acceleration", included: false },
      { text: "No model export", included: false },
      { text: "Desktop app only", included: true },
      { text: "Community support only", included: true },
    ],
  },
  {
    name: "Basic",
    price: "$20",
    period: "/month",
    description: "For individual researchers and hobbyists.",
    cta: "Get Basic",
    ctaHref: "/#cta",
    highlight: false,
    features: [
      { text: "5 model uploads per month", included: true },
      { text: "Up to 1B parameters", included: true },
      { text: "Full weight analysis & statistics", included: true },
      { text: "Interactive heatmap", included: true },
      { text: "CPU + GPU unlearning", included: true },
      { text: "500 training steps", included: true },
      { text: "Model export (.safetensors)", included: true },
      { text: "Evaluation probes", included: true },
      { text: "Desktop app only", included: true },
      { text: "Email support", included: true },
    ],
  },
  {
    name: "Pro",
    price: "$59",
    period: "/month",
    description: "For ML engineers and serious practitioners.",
    cta: "Get Pro",
    ctaHref: "/#cta",
    highlight: true,
    features: [
      { text: "Unlimited model uploads", included: true },
      { text: "Up to 10B parameters", included: true },
      { text: "Full weight analysis & gradients", included: true },
      { text: "Advanced heatmap + tensor inspection", included: true },
      { text: "GPU-accelerated unlearning", included: true },
      { text: "2,000 training steps", included: true },
      { text: "Model export (all formats)", included: true },
      { text: "Full evaluation suite (89 probes)", included: true },
      { text: "Desktop app + CLI tools", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For teams and production workflows.",
    cta: "Get Business",
    ctaHref: "/#cta",
    highlight: false,
    features: [
      { text: "Unlimited everything", included: true },
      { text: "Up to 70B parameters", included: true },
      { text: "Full weight analysis + custom metrics", included: true },
      { text: "Multi-GPU parallel unlearning", included: true },
      { text: "10,000 training steps", included: true },
      { text: "Batch model processing", included: true },
      { text: "Model versioning & lineage", included: true },
      { text: "Full evaluation + custom probes", included: true },
      { text: "Desktop app + priority support", included: true },
      { text: "Dedicated support + SLA", included: true },
    ],
  },
];

export default function PricingPage() {
  const { openAuth } = useAuthModal();

  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="section-label mb-4 inline-block">Pricing</span>
            <h1 className="heading-xl mt-6">Simple, transparent pricing</h1>
            <p className="body-lg mt-4">
              Start free. Upgrade when you need more power, larger models, or team features.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px sm:gap-0 border border-border bg-border">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`p-5 sm:p-8 ${
                  tier.highlight ? "bg-accent text-accent-inv relative" : "bg-bg"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-highlight" />
                )}

                <div className="mb-6">
                  <span
                    className={`mono text-xs uppercase tracking-wider ${
                      tier.highlight ? "opacity-60" : "text-text-subtle"
                    }`}
                  >
                    {tier.name}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-display text-4xl font-bold tracking-tight">
                      {tier.price}
                    </span>
                    <span
                      className={`text-sm ${
                        tier.highlight ? "opacity-50" : "text-text-subtle"
                      }`}
                    >
                      {tier.period}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-2 ${
                      tier.highlight ? "opacity-70" : "text-text-muted"
                    }`}
                  >
                    {tier.description}
                  </p>
                </div>

                <button
                  onClick={() => openAuth("signup")}
                  className={`block text-center py-3 px-6 no-underline font-display font-semibold text-sm mb-8 w-full cursor-pointer border-none ${
                    tier.highlight
                      ? "bg-bg text-text hover:opacity-90"
                      : tier.name === "Free"
                      ? "border border-border text-text hover:bg-surface"
                      : "bg-accent text-accent-inv hover:opacity-85"
                  }`}
                >
                  {tier.cta}
                </button>

                <ul className="space-y-3 list-none">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 text-xs ${
                          feature.included
                            ? tier.highlight
                              ? "text-highlight"
                              : "text-text"
                            : "text-border-strong"
                        }`}
                      >
                        {feature.included ? "✓" : "—"}
                      </span>
                      <span
                        className={`text-sm ${
                          feature.included
                            ? tier.highlight
                              ? "opacity-80"
                              : "text-text-muted"
                            : "text-text-subtle line-through"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="mt-10 sm:mt-12 border border-border p-6 sm:p-10 text-center">
            <h2 className="heading-md">Need more than Business?</h2>
            <p className="body-lg mt-3 max-w-xl mx-auto">
              For models over 70B parameters, custom deployments, on-premise solutions,
              or volume licensing — let&apos;s talk.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <a href="mailto:enterprise@remapstudios.ai" className="btn-primary no-underline">
                Contact Enterprise Sales
              </a>
              <a href="/docs" className="btn-outline no-underline">
                Read the Documentation
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-6 sm:mt-8">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                <span className="body-sm">SOC 2 compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                <span className="body-sm">On-premise deployment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                <span className="body-sm">Custom SLA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                <span className="body-sm">Dedicated support engineer</span>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-14 sm:mt-20 max-w-3xl mx-auto">
            <h2 className="heading-lg text-center mb-12">Frequently asked questions</h2>

            {[
              {
                q: "Can I switch plans at any time?",
                a: "Yes. Upgrade or downgrade anytime. When upgrading, you're charged a prorated amount. When downgrading, the change takes effect at your next billing cycle.",
              },
              {
                q: "What happens when I hit my training step limit?",
                a: "Unlearning will pause at the step limit. You can export the partially-unlearned model, or upgrade your plan for more steps.",
              },
              {
                q: "Do you offer annual billing discounts?",
                a: "Yes — save 20% with annual billing on Basic, Pro, and Business plans.",
              },
              {
                q: "What models are supported?",
                a: "Any HuggingFace-compatible causal language model in .safetensors, .pt, .gguf, or .ipynb format. We support models up to your plan's parameter limit.",
              },
              {
                q: "Is my data private?",
                a: "Yes. All processing happens locally on your machine via the desktop app. We never see your model weights or training data.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-b border-border py-6">
                <h3 className="font-display font-semibold text-base text-text mb-2">
                  {faq.q}
                </h3>
                <p className="body-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
