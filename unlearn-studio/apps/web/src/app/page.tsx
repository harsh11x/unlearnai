import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NeuralNetworkCanvas from "@/components/NeuralNetworkCanvas";
import NodeErasureSandbox from "@/components/NodeErasureSandbox";
import ComputeCalculator from "@/components/ComputeCalculator";
import HowItWorks from "@/components/HowItWorks";
import BeforeAfterComparison from "@/components/visual/BeforeAfterComparison";
import AnimatedStats from "@/components/visual/AnimatedStats";
import ArchitectureExplorer from "@/components/visual/ArchitectureExplorer";
import ROICalculator from "@/components/visual/ROICalculator";
import SupportedModels from "@/components/visual/SupportedModels";
import InteractiveWalkthrough from "@/components/visual/InteractiveWalkthrough";

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
              Remap Studios surgically removes unnecessary neurons, shrinks the architecture,
              and retrains a leaner model in a fraction of the compute.
            </p>

            <div className="flex flex-wrap gap-4 mt-8 animate-fade-up stagger-3">
              <a href="/downloads" className="btn-primary no-underline">
                ↓ Download Desktop App
              </a>
              <a href="/#sandbox" className="btn-outline no-underline">
                Try the Sandbox
              </a>
              <a href="/#architecture" className="btn-outline no-underline">
                Explore Architecture
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANIMATED STATS ─── */}
      <section className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimatedStats />
        </div>
      </section>

      {/* ─── BEFORE / AFTER COMPARISON ─── */}
      <section className="py-20 px-6" id="compare">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Interactive Comparison</span>
          <h2 className="heading-lg mt-4 mb-3">See the difference unlearning makes</h2>
          <p className="body-lg max-w-2xl mb-10">
            Select a model, drag the slider, and watch the metrics update in real time.
            Every number reflects real benchmarks from our test suite.
          </p>
          <BeforeAfterComparison />
        </div>
      </section>

      {/* ─── ARCHITECTURE EXPLORER ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="architecture">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Interactive</span>
          <h2 className="heading-lg mt-4 mb-3">Explore how a neural network works</h2>
          <p className="body-lg max-w-2xl mb-10">
            Click any layer in the diagram to see what it does, how many parameters it has,
            and whether it&apos;s a primary target for unlearning.
          </p>
          <ArchitectureExplorer />
        </div>
      </section>

      {/* ─── VISUALIZATION: NEURAL NETWORK BEFORE/AFTER ─── */}
      <section className="py-20 px-6" id="visualization">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Interactive Visualization</span>
          <h2 className="heading-lg mt-4 mb-3">See the network. Then shrink it.</h2>
          <p className="body-lg max-w-2xl mb-10">
            Hover over nodes to inspect them. Toggle between the original bloated network
            and the unlearned, optimized version.
          </p>
          <NeuralNetworkCanvas />
        </div>
      </section>

      {/* ─── INTERACTIVE WALKTHROUGH ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="walkthrough">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Step by Step</span>
          <h2 className="heading-lg mt-4 mb-3">How unlearning works — from start to finish</h2>
          <p className="body-lg max-w-2xl mb-10">
            Click through each stage to understand the complete pipeline.
            Every step has real metrics from production runs.
          </p>
          <InteractiveWalkthrough />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-6" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="section-label mb-4 inline-block">Process</span>
            <h2 className="heading-lg mt-4">The unlearning pipeline</h2>
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

      {/* ─── SUPPORTED MODELS ─── */}
      <section className="py-20 px-6" id="models">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Models</span>
          <h2 className="heading-lg mt-4 mb-3">Works with the models you already use</h2>
          <p className="body-lg max-w-2xl mb-10">
            Verified benchmarks across popular open-source models.
            Any HuggingFace-compatible causal LM is supported.
          </p>
          <SupportedModels />
        </div>
      </section>

      {/* ─── ROI CALCULATOR ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border" id="roi">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Calculator</span>
          <h2 className="heading-lg mt-4 mb-3">Calculate your ROI</h2>
          <p className="body-lg max-w-2xl mb-10">
            Input your model size, training frequency, and GPU costs.
            See exactly how much you&apos;ll save annually.
          </p>
          <ROICalculator />
        </div>
      </section>

      {/* ─── COMPUTE CALCULATOR ─── */}
      <section className="py-20 px-6" id="calculator">
        <div className="max-w-7xl mx-auto">
          <span className="section-label mb-4 inline-block">Detailed Calculator</span>
          <h2 className="heading-lg mt-4 mb-3">Estimate compute savings</h2>
          <p className="body-lg max-w-2xl mb-10">
            Fine-grained calculator for compute units, training steps, and cost per cycle.
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
            Remap Studios is in early access. Download the desktop app or join
            the waitlist for API access.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a href="/downloads" className="btn-primary no-underline">
              ↓ Download Desktop App
            </a>
            <a href="/pricing" className="btn-outline no-underline">
              View Pricing
            </a>
            <a href="mailto:hello@remapstudios.ai" className="btn-outline no-underline">
              Contact Sales
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
