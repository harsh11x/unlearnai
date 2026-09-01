import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="section-label mb-4 inline-block">About</span>
            <h1 className="heading-xl mt-6">Making AI models leaner.</h1>
            <p className="body-lg mt-6">
              Remap Studios was built on a simple observation: AI models learn too much.
              They hoard redundant knowledge, overfit to noise, and carry biases they
              don&apos;t need. Every unnecessary parameter costs compute, money, and time.
            </p>
            <p className="body-lg mt-4">
              We&apos;re building the tools to fix that — to surgically remove what models
              don&apos;t need, while preserving what they do.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border">
            {[
              {
                title: "Efficiency",
                text: "Smaller models mean less compute, lower costs, and faster inference. We help you get there without retraining from scratch.",
              },
              {
                title: "Precision",
                text: "Targeted unlearning — not brute-force pruning. Remove specific capabilities while keeping everything else intact.",
              },
              {
                title: "Transparency",
                text: "Every operation is auditable. We show you exactly what changed, why, and the measurable impact on your model.",
              },
            ].map((item, i) => (
              <div key={i} className={`p-8 ${i < 2 ? "border-b md:border-b-0 md:border-r" : ""} border-border`}>
                <h3 className="font-display font-bold text-lg mb-3">{item.title}</h3>
                <p className="body-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border">
            <div className="p-8 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">35–70%</p>
              <p className="body-sm mt-1">Typical parameter reduction</p>
            </div>
            <div className="p-8 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">90%</p>
              <p className="body-sm mt-1">Less retraining compute</p>
            </div>
            <div className="p-8 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">~0</p>
              <p className="body-sm mt-1">Accuracy loss</p>
            </div>
            <div className="p-8">
              <p className="stat-number">10×</p>
              <p className="body-sm mt-1">Faster iteration cycles</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <span className="section-label mb-4 inline-block">The Problem</span>
            <h2 className="heading-lg mt-4">AI models are bloated</h2>
            <p className="body-lg mt-4">
              A typical 7B parameter language model has billions of redundant weights.
              These parameters store memorized training data, overfitted patterns, and
              unnecessary knowledge that inflates model size without improving performance
              on your specific task.
            </p>
            <p className="body-lg mt-4">
              Retraining from scratch is expensive — both in compute and engineering time.
              Most teams don&apos;t have the resources to do it, so they ship bloated models
              and pay the cost at inference time.
            </p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <span className="section-label mb-4 inline-block">Our Approach</span>
            <h2 className="heading-lg mt-4">Surgical unlearning</h2>
            <p className="body-lg mt-4">
              Instead of retraining from scratch, Remap Studios identifies and removes
              unnecessary parameters while preserving the model&apos;s core capabilities.
              Our Retain-Aware algorithm uses a dual-objective loss function that
              simultaneously forgets target knowledge and protects everything else.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="/docs" className="btn-primary no-underline">Read the Docs</a>
              <a href="/pricing" className="btn-outline no-underline">View Pricing</a>
            </div>
          </div>
        </div>
      </section>

      {/* Research */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <span className="section-label mb-4 inline-block">Research</span>
            <h2 className="heading-lg mt-4">Built on scientific rigor</h2>
            <p className="body-lg mt-4">
              Our approach is grounded in peer-reviewed research on machine unlearning,
              neural network pruning, and knowledge distillation. We publish our methods,
              share our benchmarks, and invite scrutiny.
            </p>
            <p className="body-lg mt-4">
              Key areas of research include:
            </p>
            <ul className="space-y-2 list-none mt-4">
              {[
                "Selective neuron erasure with minimal collateral damage",
                "Retain-aware gradient optimization for knowledge preservation",
                "Efficient weight analysis for identifying redundant parameters",
                "Benchmarking unlearning quality across 89 capability probes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 body-sm text-text-muted">
                  <span className="text-highlight mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 sm:py-20 px-4 sm:px-6" id="team">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Team</span>
          <h2 className="heading-lg mt-4 mb-10">Building the future of efficient AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Harsh Dev",
                role: "Founder & CEO",
                desc: "Building tools to make AI more efficient and accessible. Background in ML research and full-stack engineering.",
              },
            ].map((person) => (
              <div key={person.name} className="border border-border p-6">
                <h3 className="font-display font-bold text-base text-text">{person.name}</h3>
                <p className="mono text-[10px] text-highlight uppercase tracking-wider mt-1 mb-3">{person.role}</p>
                <p className="body-sm">{person.desc}</p>
              </div>
            ))}
            <div className="border border-border border-dashed p-6 flex flex-col items-center justify-center text-center">
              <p className="font-display font-semibold text-base text-text-muted mb-2">You?</p>
              <p className="body-sm mb-4">We&apos;re hiring across engineering, research, and design.</p>
              <a href="/careers" className="btn-outline no-underline text-sm">View Open Roles →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="heading-lg">Get in touch</h2>
          <p className="body-lg mt-4 max-w-xl mx-auto">
            Have questions, feedback, or want to partner? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="mailto:remapstudios@gmail.com" className="btn-primary no-underline">
              Contact Us
            </a>
            <a href="/careers" className="btn-outline no-underline">
              View Careers
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
