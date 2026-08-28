import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NeuralNetworkCanvas from "@/components/NeuralNetworkCanvas";
import NodeErasureSandbox from "@/components/NodeErasureSandbox";
import ComputeCalculator from "@/components/ComputeCalculator";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <span className="section-label mb-6 inline-block animate-fade-up">
              Machine Unlearning Platform
            </span>

            <h1 className="heading-xl mt-6 animate-fade-up stagger-1">
              Your AI model knows{" "}
              <span className="line-through decoration-[3px] decoration-[#ef4444]/50">
                too much
              </span>
              .
              <br />
              Delete what it doesn&apos;t need.
            </h1>

            <p className="body-lg mt-6 max-w-2xl animate-fade-up stagger-2">
              AI models hoard redundant knowledge — noise, biases, overfitted patterns.
              Unlearn Studio surgically removes unnecessary neurons, shrinks the architecture,
              and retrains a leaner model in a fraction of the compute.
            </p>

            <div className="flex flex-wrap gap-4 mt-8 animate-fade-up stagger-3">
              <a href="#sandbox" className="btn-primary no-underline">
                Try the Sandbox
              </a>
              <a href="#calculator" className="btn-outline no-underline">
                Calculate Savings
              </a>
            </div>
          </div>

          {/* Hero stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-16 border border-border animate-fade-up stagger-4">
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">35–70%</p>
              <p className="body-sm mt-1">Nodes typically removable</p>
            </div>
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">90%</p>
              <p className="body-sm mt-1">Less retraining compute</p>
            </div>
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <p className="stat-number">~0</p>
              <p className="body-sm mt-1">Accuracy loss</p>
            </div>
            <div className="p-6">
              <p className="stat-number">10×</p>
              <p className="body-sm mt-1">Faster iteration cycle</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VISUALIZATION: NEURAL NETWORK BEFORE/AFTER ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="visualization">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Interactive Visualization</span>
          <h2 className="heading-lg mt-4 mb-3">See the network. Then shrink it.</h2>
          <p className="body-lg max-w-2xl mb-10">
            Hover over nodes to inspect them. Toggle between the original bloated network
            and the unlearned, optimized version. Watch how connections and neurons disappear.
          </p>

          <NeuralNetworkCanvas />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-6" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="section-label mb-4 inline-block">Process</span>
            <h2 className="heading-lg mt-4">How Unlearning Works</h2>
            <p className="body-lg mt-4">
              Four steps from a bloated, expensive model to a lean, fast one.
              Every step is automated — you just point at your model.
            </p>
          </div>

          <HowItWorks />
        </div>
      </section>

      {/* ─── INTERACTIVE SANDBOX ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="sandbox">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Try It</span>
          <h2 className="heading-lg mt-4 mb-3">Erase Nodes Yourself</h2>
          <p className="body-lg max-w-2xl mb-10">
            This is a simplified neural network. Click hidden-layer nodes to erase them
            and watch the compute savings in real time. Use Auto-Erase for bulk removal.
          </p>

          <NodeErasureSandbox />
        </div>
      </section>

      {/* ─── BEFORE / AFTER ─── */}
      <section className="py-20 px-6" id="before-after">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Comparison</span>
          <h2 className="heading-lg mt-4 mb-10">Before vs. After</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border">
            {/* Before */}
            <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-border">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="mono text-xs text-text-muted uppercase tracking-wider">Before</span>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="mono text-xs text-text-subtle">MODEL SIZE</span>
                  <p className="font-display text-2xl font-bold mt-1">2.4 GB</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">ACTIVE PARAMETERS</span>
                  <p className="font-display text-2xl font-bold mt-1">175B</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">TRAINING COST</span>
                  <p className="font-display text-2xl font-bold mt-1">$12,400</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">TRAINING TIME</span>
                  <p className="font-display text-2xl font-bold mt-1">6 weeks</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">COMPUTE UNITS</span>
                  <p className="font-display text-2xl font-bold mt-1">10,000</p>
                </div>
              </div>

              {/* Visual: dense network */}
              <div className="mt-8 p-4 bg-bg border border-border">
                <svg viewBox="0 0 200 80" className="w-full">
                  {/* Dense chaotic connections */}
                  {Array.from({ length: 15 }).map((_, i) =>
                    Array.from({ length: 10 }).map((_, j) => (
                      <line
                        key={`${i}-${j}`}
                        x1={10 + (i % 5) * 40}
                        y1={5 + Math.floor(i / 5) * 28}
                        x2={30 + (j % 5) * 40}
                        y2={5 + Math.floor(j / 5) * 28}
                        stroke="#d4d4d4"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                    ))
                  )}
                  {Array.from({ length: 25 }).map((_, i) => (
                    <circle
                      key={i}
                      cx={10 + (i % 5) * 40 + (Math.random() - 0.5) * 10}
                      cy={5 + Math.floor(i / 5) * 28 + (Math.random() - 0.5) * 8}
                      r="3"
                      fill="#171717"
                      opacity="0.6"
                    />
                  ))}
                </svg>
              </div>
              <p className="body-sm mt-3">Bloated network with redundant connections and dead neurons</p>
            </div>

            {/* After */}
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-highlight" />
                <span className="mono text-xs text-text-muted uppercase tracking-wider">After</span>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="mono text-xs text-text-subtle">MODEL SIZE</span>
                  <p className="font-display text-2xl font-bold mt-1 text-highlight">0.8 GB</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">ACTIVE PARAMETERS</span>
                  <p className="font-display text-2xl font-bold mt-1 text-highlight">61B</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">TRAINING COST</span>
                  <p className="font-display text-2xl font-bold mt-1 text-highlight">$2,100</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">TRAINING TIME</span>
                  <p className="font-display text-2xl font-bold mt-1 text-highlight">3 days</p>
                </div>
                <div>
                  <span className="mono text-xs text-text-subtle">COMPUTE UNITS</span>
                  <p className="font-display text-2xl font-bold mt-1 text-highlight">1,500</p>
                </div>
              </div>

              {/* Visual: clean network */}
              <div className="mt-8 p-4 bg-bg border border-border">
                <svg viewBox="0 0 200 80" className="w-full">
                  {/* Clean structured connections */}
                  {[
                    [20, 40, 60, 20],
                    [20, 40, 60, 60],
                    [20, 40, 100, 40],
                    [60, 20, 100, 20],
                    [60, 20, 100, 60],
                    [60, 60, 100, 40],
                    [60, 60, 140, 40],
                    [100, 20, 140, 20],
                    [100, 40, 140, 40],
                    [100, 60, 140, 60],
                    [140, 20, 180, 40],
                    [140, 40, 180, 40],
                    [140, 60, 180, 40],
                  ].map(([x1, y1, x2, y2], i) => (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#a3a3a3"
                      strokeWidth="0.75"
                      opacity="0.6"
                    />
                  ))}
                  {[
                    [20, 40],
                    [60, 20],
                    [60, 60],
                    [100, 20],
                    [100, 40],
                    [100, 60],
                    [140, 20],
                    [140, 40],
                    [140, 60],
                    [180, 40],
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="3" fill="#171717" opacity="0.8" />
                  ))}
                </svg>
              </div>
              <p className="body-sm mt-3">Optimized network — fewer nodes, clear pathways, same accuracy</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPUTE CALCULATOR ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="calculator">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Calculator</span>
          <h2 className="heading-lg mt-4 mb-3">Estimate Your Savings</h2>
          <p className="body-lg max-w-2xl mb-10">
            Adjust the sliders to see how much compute and cost you could save
            by unlearning redundant nodes from your model.
          </p>

          <ComputeCalculator />
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6" id="cta">
        <div className="max-w-7xl mx-auto text-center">
          <span className="section-label mb-6 inline-block">Get Started</span>
          <h2 className="heading-lg mt-6 max-w-2xl mx-auto">
            Ready to make your model leaner?
          </h2>
          <p className="body-lg mt-4 max-w-xl mx-auto">
            Unlearn Studio is in early access. Join the waitlist to be first
            when we launch.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="mailto:hello@unlearnstudio.ai" className="btn-primary no-underline">
              Join Waitlist
            </a>
            <a href="#sandbox" className="btn-outline no-underline">
              Play with the Sandbox
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
              <span className="body-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
              <span className="body-sm">Self-hosted option</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
              <span className="body-sm">No data leaves your infra</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
