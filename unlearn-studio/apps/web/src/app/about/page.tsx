import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-32 pb-20 px-6">
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
      <section className="py-20 px-6 bg-surface border-y border-border">
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
      <section className="py-20 px-6">
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

      {/* Research */}
      <section className="py-20 px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <span className="section-label mb-4 inline-block">Research</span>
            <h2 className="heading-lg mt-4">Built on scientific rigor</h2>
            <p className="body-lg mt-4">
              Our approach is grounded in peer-reviewed research on machine unlearning,
              neural network pruning, and knowledge distillation. We publish our methods,
              share our benchmarks, and invite scrutiny.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="/docs" className="btn-primary no-underline">Read the Docs</a>
              <a href="/pricing" className="btn-outline no-underline">View Pricing</a>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="heading-lg">Open source at heart</h2>
          <p className="body-lg mt-4 max-w-xl mx-auto">
            The core unlearning engine is open source. We believe in building in public
            and contributing to the ML community.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="https://github.com/harsh11x/unlearnai" className="btn-outline no-underline" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
            <a href="mailto:hello@remapstudios.ai" className="btn-primary no-underline">
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
