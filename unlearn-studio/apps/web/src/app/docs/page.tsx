import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { name: "Installation", desc: "Install the desktop app or CLI on macOS, Windows, or Linux", href: "#installation" },
      { name: "Quick Start", desc: "Load your first model and run unlearning in 5 minutes", href: "#quickstart" },
      { name: "System Requirements", desc: "Hardware and software prerequisites", href: "#requirements" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { name: "Machine Unlearning", desc: "What it is, why it matters, and how it works", href: "#unlearning" },
      { name: "Model Architecture", desc: "Understanding layers, tensors, and neural network structure", href: "#architecture" },
      { name: "Unlearning Methods", desc: "Retain-Aware vs Gradient Forgetting — when to use each", href: "#methods" },
    ],
  },
  {
    title: "Guides",
    items: [
      { name: "Loading Models", desc: "Supported formats, directory structures, and configuration", href: "#loading" },
      { name: "Weight Analysis", desc: "Inspecting tensors, heatmaps, and statistical analysis", href: "#analysis" },
      { name: "Running Unlearning", desc: "Configuring targets, hyperparameters, and monitoring progress", href: "#running" },
      { name: "Evaluation", desc: "Probing model capabilities before and after unlearning", href: "#evaluation" },
      { name: "Exporting Models", desc: "Saving modified models in various formats", href: "#exporting" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { name: "REST API", desc: "HTTP endpoints for model management, unlearning, and evaluation", href: "#api" },
      { name: "Python SDK", desc: "Programmatic access to Remap Studios from Python", href: "#sdk" },
      { name: "Authentication", desc: "API keys, OAuth, and access control", href: "#auth" },
    ],
  },
  {
    title: "Desktop App",
    items: [
      { name: "IDE Overview", desc: "Panels, tabs, canvas, and keyboard shortcuts", href: "#ide" },
      { name: "Visualization Engine", desc: "Interactive neural network visualization", href: "#viz" },
      { name: "Chat Assistant", desc: "Using the AI assistant for model analysis", href: "#chat" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <span className="section-label mb-4 inline-block">Documentation</span>
            <h1 className="heading-xl mt-6">Docs</h1>
            <p className="body-lg mt-4">
              Everything you need to get started with Remap Studios — from installation to advanced usage.
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px sm:gap-0 border border-border bg-border mb-12 sm:mb-16">
            {[
              { title: "Quick Start Guide", desc: "Go from zero to your first unlearned model", icon: "⚡" },
              { title: "API Reference", desc: "Complete REST API documentation", icon: "🔌" },
              { title: "Desktop App Guide", desc: "IDE features, visualization, and shortcuts", icon: "🖥" },
            ].map((item, i) => (
              <a
                key={i}
                href="#"
                className="p-5 sm:p-6 bg-bg no-underline hover:bg-surface transition-colors min-h-[44px] flex flex-col justify-center"
              >
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="font-display font-semibold text-base text-text mb-1">{item.title}</h3>
                <p className="body-sm">{item.desc}</p>
              </a>
            ))}
          </div>

          {/* Documentation sections */}
          <div className="space-y-12">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="heading-md mb-4 pb-2 border-b border-border">{section.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px sm:gap-0 bg-border border border-border">
                  {section.items.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="p-4 bg-bg no-underline hover:bg-surface transition-colors group min-h-[44px]"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-semibold text-sm text-text group-hover:text-accent transition-colors">{item.name}</h3>
                        <span className="text-text-subtle text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </div>
                      <p className="body-sm mt-1">{item.desc}</p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
