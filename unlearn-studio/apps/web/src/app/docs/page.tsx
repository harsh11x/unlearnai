import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <span className="section-label mb-4 inline-block">Documentation</span>
          <h1 className="heading-xl mt-6">Docs</h1>
          <p className="body-lg mt-4 max-w-2xl">
            Everything you need to get started with Remap Studios — from installation to advanced usage.
          </p>

          {/* ─── INSTALLATION ─── */}
          <div className="mt-16" id="installation">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Installation</h2>

            <h3 className="heading-md mb-3 mt-8">Desktop App</h3>
            <p className="body-sm mb-4">
              Download the latest release for your platform from the{" "}
              <a href="/downloads" className="text-text hover:text-text-muted underline">Downloads page</a>.
              The desktop app bundles everything you need — no separate Python installation required for basic usage.
            </p>

            <div className="bg-surface border border-border p-5 mb-6">
              <pre className="mono text-xs text-text-muted leading-relaxed overflow-x-auto">{`# macOS — drag Remap Studios to Applications
# Windows — run the installer or use portable .exe
# Linux — chmod +x the AppImage and run it`}</pre>
            </div>

            <h3 className="heading-md mb-3 mt-8">Dependencies</h3>
            <p className="body-sm mb-4">
              Remap Studios requires Python 3.9+ and PyTorch 2.1+. Install core dependencies:
            </p>
            <div className="bg-surface border border-border p-5 mb-6">
              <pre className="mono text-xs text-text-muted leading-relaxed overflow-x-auto">{`# CPU only
pip install torch safetensors psutil numpy

# NVIDIA GPU (CUDA 12.1)
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install safetensors psutil numpy

# Apple Silicon GPU (MPS)
pip install torch safetensors psutil numpy`}</pre>
            </div>
          </div>

          {/* ─── QUICK START ─── */}
          <div className="mt-16" id="quickstart">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Quick Start</h2>
            <p className="body-sm mb-4">
              Get from zero to your first unlearned model in under 5 minutes.
            </p>

            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Open a Model",
                  text: "Launch Remap Studios and click Open File (⌘O). Select a .safetensors, .pt, .gguf, or model directory. The app will parse tensors, compute statistics, and build the layer graph.",
                },
                {
                  step: "2",
                  title: "Explore the Architecture",
                  text: "Switch to the Visualization tab to see your model as an interactive neural network graph. Hover over nodes to inspect layers. Use Weight Explorer to see individual tensor statistics.",
                },
                {
                  step: "3",
                  title: "Configure Unlearning",
                  text: "Go to the Unlearn tab. Select a target capability (what you want the model to forget), choose a method (Retain-Aware is recommended), and set your training steps and learning rate.",
                },
                {
                  step: "4",
                  title: "Run & Monitor",
                  text: "Click Start Unlearning. Watch the real-time loss curves, weight changes, and node erasure progress. The unlearning canvas shows forget loss, retain loss, and total loss simultaneously.",
                },
                {
                  step: "5",
                  title: "Export the Result",
                  text: "Once complete, export via File → Export (⌘E). Choose from Safetensors, PyTorch, GGUF, or ONNX format. The exported model has fewer parameters and faster inference.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 bg-accent text-accent-inv flex items-center justify-center font-display font-bold text-sm flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-text mb-1">
                      {item.title}
                    </h3>
                    <p className="body-sm">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SYSTEM REQUIREMENTS ─── */}
          <div className="mt-16" id="requirements">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">System Requirements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border border-border p-5">
                <h3 className="font-display font-semibold text-sm mb-3 text-text">Minimum</h3>
                <ul className="space-y-2 list-none">
                  {["macOS 12+, Windows 10+, or Ubuntu 20.04+", "4 GB RAM", "Python 3.9+", "500 MB disk space (plus model files)", "Any modern CPU"].map((r) => (
                    <li key={r} className="flex items-start gap-2 body-sm text-text-muted">
                      <span className="text-highlight mt-0.5">✓</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-border p-5 bg-surface">
                <h3 className="font-display font-semibold text-sm mb-3 text-text">Recommended</h3>
                <ul className="space-y-2 list-none">
                  {["8+ GB RAM", "NVIDIA GPU with CUDA 12+ or Apple M1/M2/M3", "SSD for fast model loading", "Python 3.11+ with PyTorch 2.2+"].map((r) => (
                    <li key={r} className="flex items-start gap-2 body-sm text-text-muted">
                      <span className="text-highlight mt-0.5">✓</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ─── MACHINE UNLEARNING ─── */}
          <div className="mt-16" id="unlearning">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Machine Unlearning</h2>
            <p className="body-sm mb-4">
              Machine unlearning is the process of making a trained model forget specific knowledge
              without retraining from scratch. Traditional approaches require full retraining, which
              costs the same compute as the original training run. Unlearning achieves the same result
              in a fraction of the time and compute.
            </p>
            <p className="body-sm mb-4">
              <strong>Why it matters:</strong> Large language models learn patterns, facts, biases, and
              redundant representations during training. Much of this is unnecessary for your specific
              use case. Unlearning lets you surgically remove what you don&apos;t need while preserving
              what you do.
            </p>
            <p className="body-sm mb-4">
              <strong>Applications:</strong>
            </p>
            <ul className="space-y-2 list-none mb-4">
              {[
                "Remove memorized training data (privacy compliance)",
                "Eliminate biased or harmful knowledge",
                "Reduce model size without retraining",
                "Specialize a general model for a specific domain",
                "Remove redundant parameters to cut inference costs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 body-sm text-text-muted">
                  <span className="text-highlight mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── MODEL ARCHITECTURE ─── */}
          <div className="mt-16" id="architecture">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Model Architecture</h2>
            <p className="body-sm mb-4">
              A neural network is organized into layers, each containing tensors (multi-dimensional
              arrays of numbers). Understanding this structure is key to effective unlearning.
            </p>
            <div className="space-y-4">
              {[
                { title: "Embedding Layers", desc: "Convert input tokens into dense vectors. Usually fixed after training — not a target for unlearning." },
                { title: "Attention Layers", desc: "The core of transformer models. Compute relevance scores between tokens. Most knowledge is stored here." },
                { title: "Feed-Forward Layers", desc: "Two linear transformations with activation. Contain the bulk of parameters — primary target for pruning." },
                { title: "Output Layer", desc: "Projects hidden states back to vocabulary space. Usually not modified during unlearning." },
              ].map((layer) => (
                <div key={layer.title} className="border-l-2 border-border pl-4">
                  <h3 className="font-display font-semibold text-sm text-text">{layer.title}</h3>
                  <p className="body-sm mt-1">{layer.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── UNLEARNING METHODS ─── */}
          <div className="mt-16" id="methods">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Unlearning Methods</h2>
            <p className="body-sm mb-6">
              Remap Studios supports three unlearning methods, each with different tradeoffs.
            </p>
            <div className="space-y-0 border border-border divide-y divide-border">
              {[
                {
                  name: "Retain-Aware Unlearning",
                  recommended: true,
                  desc: "The default and recommended method. It simultaneously forgets the target capability while actively preserving unrelated knowledge. Uses a dual-objective loss function.",
                  pros: ["Highest accuracy retention", "Minimal collateral damage", "Works on all model sizes"],
                  cons: ["Slightly slower than basic methods"],
                  when: "Use this for almost everything — it's the best balance of forgetting quality and knowledge preservation.",
                },
                {
                  name: "Gradient Forgetting",
                  recommended: false,
                  desc: "A baseline method that maximizes loss on the target capability by reversing gradient direction. Simple but may cause collateral damage to unrelated knowledge.",
                  pros: ["Fastest method", "Simple implementation"],
                  cons: ["May degrade unrelated capabilities", "Less precise targeting"],
                  when: "Quick experiments or when speed matters more than precision.",
                },
                {
                  name: "Knowledge Distillation",
                  recommended: false,
                  desc: "Uses a teacher-student framework where the student model learns to replicate the teacher's behavior on retain data while ignoring forget data.",
                  pros: ["Good for large models", "Can produce smaller student models"],
                  cons: ["Requires more compute", "Needs careful tuning"],
                  when: "When you also want to compress the model size, not just unlearn.",
                },
              ].map((method) => (
                <div key={method.name} className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-semibold text-base text-text">{method.name}</h3>
                    {method.recommended && (
                      <span className="mono text-[9px] font-bold tracking-widest uppercase text-highlight border border-highlight/30 px-2 py-0.5">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="body-sm mb-3">{method.desc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="mono text-[10px] text-text-subtle uppercase tracking-wider block mb-1">Pros</span>
                      {method.pros.map((p) => (
                        <p key={p} className="text-text-muted flex items-start gap-1"><span className="text-highlight">+</span> {p}</p>
                      ))}
                    </div>
                    <div>
                      <span className="mono text-[10px] text-text-subtle uppercase tracking-wider block mb-1">Cons</span>
                      {method.cons.map((c) => (
                        <p key={c} className="text-text-muted flex items-start gap-1"><span className="text-[#ef4444]">−</span> {c}</p>
                      ))}
                    </div>
                    <div>
                      <span className="mono text-[10px] text-text-subtle uppercase tracking-wider block mb-1">When to Use</span>
                      <p className="text-text-muted">{method.when}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── LOADING MODELS ─── */}
          <div className="mt-16" id="loading">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Loading Models</h2>
            <p className="body-sm mb-4">
              Remap Studios supports multiple model formats. You can load individual files or entire model directories.
            </p>
            <div className="border border-border overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left p-3 font-display font-semibold text-text">Format</th>
                    <th className="text-left p-3 font-display font-semibold text-text">Extension</th>
                    <th className="text-left p-3 font-display font-semibold text-text">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Safetensors", ".safetensors", "Preferred format. Fast loading, memory-mapped."],
                    ["PyTorch", ".pt / .pth", "Standard PyTorch checkpoint format."],
                    ["GGUF", ".gguf", "Quantized format for inference. Read-only (convert for unlearning)."],
                    ["ONNX", ".onnx", "Cross-framework format. Read-only analysis supported."],
                    ["Jupyter Notebook", ".ipynb", "Parses notebook cells for model code detection."],
                    ["HuggingFace Dir", "(directory)", "Loads config.json + weight files from a model directory."],
                  ].map(([fmt, ext, notes]) => (
                    <tr key={fmt}>
                      <td className="p-3 text-text-muted font-medium">{fmt}</td>
                      <td className="p-3"><code className="mono text-xs bg-surface px-1.5 py-0.5 border border-border">{ext}</code></td>
                      <td className="p-3 text-text-muted">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="body-sm">
              <strong>Tip:</strong> Use Open Folder (⌘⇧O) to load an entire HuggingFace model directory.
              The app will auto-detect the format and load all weight files.
            </p>
          </div>

          {/* ─── WEIGHT ANALYSIS ─── */}
          <div className="mt-16" id="analysis">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Weight Analysis</h2>
            <p className="body-sm mb-4">
              The Weight Explorer lets you inspect individual tensors in your model. Select a layer
              from the dropdown to see all its tensors with shapes, dtypes, and sizes.
            </p>
            <h3 className="heading-md mb-3 mt-6">Per-Tensor Statistics</h3>
            <p className="body-sm mb-4">
              Click any tensor to view detailed statistics in the Properties panel:
            </p>
            <ul className="space-y-1.5 list-none mb-4">
              {["Mean, Std, Min, Max, Median", "L2 Norm", "Zero count and percentage", "Skewness and Kurtosis (distribution shape)", "Percentiles (P1, P5, P25, P75, P95, P99)"].map((stat) => (
                <li key={stat} className="flex items-start gap-2 body-sm text-text-muted">
                  <span className="text-highlight mt-0.5">•</span>{stat}
                </li>
              ))}
            </ul>
            <h3 className="heading-md mb-3 mt-6">Heatmap Visualization</h3>
            <p className="body-sm">
              Switch to the Heatmap tab to see a 2D weight distribution visualization.
              Select a tensor from the dropdown — the heatmap renders a 128×128 downsampled
              view of the weight matrix. Brighter pixels indicate higher absolute values.
            </p>
          </div>

          {/* ─── RUNNING UNLEARNING ─── */}
          <div className="mt-16" id="running">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Running Unlearning</h2>
            <p className="body-sm mb-4">
              Navigate to the Unlearn tab and configure your unlearning run:
            </p>
            <div className="space-y-4">
              {[
                { param: "Target Capability", desc: "What you want the model to forget. Select from detected capabilities or enter a custom target.", default: "Required" },
                { param: "Method", desc: "The unlearning algorithm. Retain-Aware is recommended for most use cases.", default: "Retain-Aware Unlearning" },
                { param: "Training Steps", desc: "Number of optimization steps. More steps = more thorough forgetting, but diminishing returns past ~500.", default: "200" },
                { param: "Learning Rate", desc: "Step size for gradient updates. Too high causes instability; too low means slow convergence.", default: "1e-5" },
                { param: "Retain Weight", desc: "How much to prioritize preserving unrelated knowledge. Higher = safer but slower forgetting.", default: "2.0" },
                { param: "Batch Size", desc: "Number of samples processed per step. Larger batches are more stable but use more memory.", default: "8" },
              ].map((param) => (
                <div key={param.param} className="border-l-2 border-border pl-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm text-text">{param.param}</h3>
                    <code className="mono text-[10px] text-text-subtle bg-surface px-1.5 py-0.5 border border-border">{param.default}</code>
                  </div>
                  <p className="body-sm mt-1">{param.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── EVALUATION ─── */}
          <div className="mt-16" id="evaluation">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Evaluation</h2>
            <p className="body-sm mb-4">
              After unlearning, evaluate the result to confirm the target was forgotten
              while unrelated capabilities remain intact.
            </p>
            <ul className="space-y-2 list-none mb-4">
              {[
                "Compare weight distributions before and after using the heatmap",
                "Check forget loss convergence in the unlearning visualization",
                "Monitor retain loss to ensure no collateral damage",
                "Run evaluation probes on specific capabilities",
                "Measure parameter reduction and inference speed improvement",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 body-sm text-text-muted">
                  <span className="text-highlight mt-0.5">→</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── EXPORTING MODELS ─── */}
          <div className="mt-16" id="exporting">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Exporting Models</h2>
            <p className="body-sm mb-4">
              Export your unlearned model via File → Export (⌘E). Supported output formats:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                { fmt: "Safetensors", desc: "Preferred format. Fast loading, safe for production.", ext: ".safetensors" },
                { fmt: "PyTorch", desc: "Standard checkpoint. Compatible with all PyTorch tooling.", ext: ".pt" },
                { fmt: "GGUF", desc: "Quantized format for llama.cpp and Ollama.", ext: ".gguf" },
                { fmt: "ONNX", desc: "Cross-framework format for production deployment.", ext: ".onnx" },
              ].map((f) => (
                <div key={f.fmt} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-sm text-text">{f.fmt}</h3>
                    <code className="mono text-[10px] text-text-subtle bg-surface px-1.5 py-0.5 border border-border">{f.ext}</code>
                  </div>
                  <p className="body-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── DESKTOP APP ─── */}
          <div className="mt-16" id="ide">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Desktop App — IDE Overview</h2>
            <p className="body-sm mb-4">
              The Remap Studios desktop app is a professional IDE for model unlearning. Here&apos;s the layout:
            </p>
            <div className="space-y-3 mb-6">
              {[
                { area: "Activity Bar", desc: "Left sidebar icons — Explorer, Search, Catalog, Unlearn, Settings" },
                { area: "Model Explorer", desc: "File tree showing loaded model layers, tensors, and metadata" },
                { area: "Main Panel (Tabs)", desc: "Visualization, Weight Explorer, Heatmap, Unlearn, Models — switch between views" },
                { area: "Properties Panel", desc: "Right panel showing tensor statistics and node details" },
                { area: "AI Assistant", desc: "Bottom-right chat for asking questions about your model" },
                { area: "Terminal", desc: "Bottom panel with command input and output log" },
                { area: "Status Bar", desc: "Bottom bar showing model info, device, RAM usage, and zoom" },
              ].map((item) => (
                <div key={item.area} className="flex gap-3 items-start">
                  <span className="mono text-xs text-highlight w-32 flex-shrink-0 pt-0.5">{item.area}</span>
                  <span className="body-sm">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── KEYBOARD SHORTCUTS ─── */}
          <div className="mt-16" id="viz">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">Keyboard Shortcuts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { section: "File", shortcuts: [["⌘O", "Open File"], ["⌘⇧O", "Open Folder"], ["⌘E", "Export Model"], ["⌘,", "Settings"]] },
                { section: "View", shortcuts: [["⌘B", "Toggle Sidebar"], ["⌘⇧P", "Toggle Properties"], ["⌘`", "Toggle Terminal"], ["⌘K", "Command Palette"]] },
                { section: "Navigation", shortcuts: [["⌘1–5", "Switch Tabs"], ["⌘+", "Zoom In"], ["⌘-", "Zoom Out"], ["⌘0", "Reset Zoom"]] },
                { section: "Run", shortcuts: [["⌘⇧R", "Start Unlearning"], ["/", "Shortcuts Help"], ["Esc", "Close Modal"]] },
              ].map((group) => (
                <div key={group.section}>
                  <h3 className="font-display font-semibold text-sm text-text mb-3">{group.section}</h3>
                  <div className="space-y-1.5">
                    {group.shortcuts.map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="body-sm text-text-muted">{desc}</span>
                        <kbd className="mono text-[10px] bg-surface border border-border px-2 py-0.5 text-text-subtle">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── CHAT ASSISTANT ─── */}
          <div className="mt-16" id="chat">
            <h2 className="heading-lg mb-6 pb-3 border-b border-border">AI Chat Assistant</h2>
            <p className="body-sm mb-4">
              The AI Assistant (bottom-right panel) helps you analyze your model using natural language.
              Load a model first, then ask questions like:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "\"Tell me about the model\"",
                "\"List the layers\"",
                "\"Which method should I use?\"",
                "\"Analyze redundancy\"",
                "\"Start unlearning\"",
                "\"Export the model\"",
              ].map((q) => (
                <div key={q} className="bg-surface border border-border p-3 mono text-xs text-text-muted">
                  {q}
                </div>
              ))}
            </div>
          </div>

          {/* ─── SUPPORT ─── */}
          <div className="mt-16 border-t border-border pt-12">
            <h2 className="heading-lg mb-4">Need help?</h2>
            <p className="body-sm mb-6">
              Can&apos;t find what you&apos;re looking for? Reach out through any of these channels:
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:support@remapstudios.ai" className="btn-primary no-underline">Email Support</a>
              <a href="/careers" className="btn-outline no-underline">Join the Team</a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
