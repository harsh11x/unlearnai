"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DeepMindNeuralCanvas from "@/components/visual/DeepMindNeuralCanvas";
import ModelBeforeAfterSlider from "@/components/visual/ModelBeforeAfterSlider";
import NeuralNodeErasureSandbox from "@/components/visual/NeuralNodeErasureSandbox";
import ComputeReductionCalculator from "@/components/visual/ComputeReductionCalculator";
import LivePromptProbeSandbox from "@/components/visual/LivePromptProbeSandbox";
import { ArrowDown, AlertTriangle } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-white min-h-screen font-sans selection:bg-black selection:text-white">
      <Header />

      <main className="pt-[80px]">
        
        {/* HERO SECTION - Stark High Contrast */}
        <section className="relative overflow-hidden border-b-8 border-black halftone-bg">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16 pt-24 pb-32">
            
            <div className="max-w-[1000px] space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-1.5 font-mono font-black text-xs uppercase border-2 border-black shadow-[4px_4px_0_0_#d1d5db]">
                <AlertTriangle size={16} /> FORGET THE BLOAT
              </div>
              
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-black leading-[0.9] tracking-tighter uppercase">
                SURGICAL <br className="hidden sm:block" />
                MODEL <br className="hidden sm:block" />
                <span className="bg-black text-white px-4 inline-block mt-2 -ml-2 pb-2">UNLEARNING</span>
              </h1>
              
              <p className="text-xl sm:text-2xl font-bold text-gray-800 max-w-2xl leading-snug border-l-8 border-black pl-6 py-2">
                Erase copyrighted code, PII, and unsafe data from your LLM without the $100K retrain. 
                Keep the skills. Drop the liability.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button className="comic-btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                  START ERASING NOW
                </button>
                <button className="comic-btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                  READ THE PAPER
                </button>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-6 sm:left-10 lg:left-16 animate-bounce">
              <ArrowDown size={32} strokeWidth={3} className="text-black" />
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-20 right-10 opacity-10 pointer-events-none select-none hidden lg:block font-mono font-black text-[300px] leading-none">
              {"{ }"}
            </div>
          </div>
        </section>

        {/* SECTION 1: Deep Mind Canvas */}
        <section id="deep-mind" className="py-24 border-b-8 border-black bg-white stripes-bg">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="mb-12 max-w-3xl">
              <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter uppercase">
                THE DEEP MIND
              </h2>
              <p className="font-bold text-xl mt-4 text-gray-700 bg-white p-2 inline-block border-2 border-black">
                Visualize how we locate and erase target weights via gradient ascent.
              </p>
            </div>
            
            <DeepMindNeuralCanvas />
          </div>
        </section>

        {/* SECTION 2: Before & After */}
        <section id="transformation" className="py-24 border-b-8 border-black bg-gray-100">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="mb-12 max-w-3xl">
              <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter uppercase">
                BLOAT VS. SURGICAL
              </h2>
              <p className="font-bold text-xl mt-4 text-gray-700 bg-white p-2 inline-block border-2 border-black">
                Slide to compare a bloated, risky model vs a shrunk, compliant model.
              </p>
            </div>
            
            <ModelBeforeAfterSlider />
          </div>
        </section>

        {/* SECTION 3: Node Erasure Sandbox */}
        <section id="node-sandbox" className="py-24 border-b-8 border-black bg-white halftone-bg">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="mb-12 max-w-3xl bg-white p-4 border-4 border-black inline-block shadow-[8px_8px_0_0_#000]">
              <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter uppercase">
                ERASURE SANDBOX
              </h2>
              <p className="font-bold text-xl mt-4 text-gray-700 border-t-2 border-black pt-2">
                Click nodes to erase specific knowledge domains and watch the compute footprint drop.
              </p>
            </div>
            
            <NeuralNodeErasureSandbox />
          </div>
        </section>

        {/* SECTION 4: Live Probe */}
        <section id="probe-sandbox" className="py-24 border-b-8 border-black bg-black text-white halftone-bg-dense">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="mb-12 max-w-3xl bg-black p-4 border-4 border-white inline-block shadow-[8px_8px_0_0_#fff]">
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase">
                PROBE THE MODEL
              </h2>
              <p className="font-bold text-xl mt-4 text-gray-300 border-t-2 border-white pt-2">
                Try extracting erased data. The model retains coding skills but loses target knowledge.
              </p>
            </div>
            
            <LivePromptProbeSandbox />
          </div>
        </section>

        {/* SECTION 5: Calculator */}
        <section id="calculator" className="py-24 bg-white stripes-bg">
          <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="mb-12 max-w-3xl">
              <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter uppercase">
                YOUR SAVINGS
              </h2>
              <p className="font-bold text-xl mt-4 text-gray-700 bg-white p-2 inline-block border-2 border-black">
                Calculate the compute saved by unlearning instead of full retraining.
              </p>
            </div>
            
            <ComputeReductionCalculator />
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
