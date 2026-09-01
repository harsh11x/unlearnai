import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OPEN_ROLES = [
  {
    title: "ML Research Engineer",
    team: "Research",
    location: "Remote / San Francisco",
    type: "Full-time",
    description:
      "Work on machine unlearning algorithms, neural network pruning, and knowledge distillation. You'll develop and optimize the core unlearning engine.",
    requirements: [
      "Strong background in ML/DL (publications a plus)",
      "Experience with PyTorch and model training at scale",
      "Familiarity with transformer architectures",
      "Passion for efficient AI",
    ],
  },
  {
    title: "Full-Stack Engineer",
    team: "Product",
    location: "Remote",
    type: "Full-time",
    description:
      "Build and ship the Remap Studios desktop app and web platform. Work across Electron, React, and Python to create a world-class developer tool.",
    requirements: [
      "3+ years full-stack experience",
      "React/TypeScript proficiency",
      "Experience with Electron or desktop apps",
      "Eye for detail and UX",
    ],
  },
  {
    title: "Founding Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description:
      "Shape the visual identity and UX of Remap Studios. From the IDE interface to marketing site — you'll own the entire design language.",
    requirements: [
      "Strong portfolio of product design work",
      "Experience with design systems",
      "Familiarity with developer tools / IDEs",
      "Ability to ship fast and iterate",
    ],
  },
  {
    title: "DevRel / Developer Advocate",
    team: "Community",
    location: "Remote",
    type: "Full-time",
    description:
      "Be the voice of Remap Studios in the ML community. Create tutorials, give talks, and help developers get the most out of machine unlearning.",
    requirements: [
      "Experience in developer relations or technical writing",
      "Background in ML/AI (even self-taught)",
      "Great communicator — writing and speaking",
      "Active in the ML community",
    ],
  },
  {
    title: "Backend Engineer (Python)",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Build and scale the Python backend that powers model loading, unlearning pipelines, and the desktop app. Optimize for performance and reliability.",
    requirements: [
      "Strong Python skills, async/concurrency",
      "Experience with PyTorch internals or model serving",
      "Familiarity with Electron IPC or desktop app architecture",
      "Performance optimization mindset",
    ],
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="section-label mb-4 inline-block">Careers</span>
            <h1 className="heading-xl mt-6">
              Build the future of efficient AI.
            </h1>
            <p className="body-lg mt-6">
              Remap Studios is on a mission to make AI models smaller, faster,
              and smarter. We&apos;re a small, focused team working on hard
              problems at the intersection of ML research and developer tools.
            </p>
            <p className="body-lg mt-4">
              We&apos;re hiring across engineering, research, design, and
              developer relations. If you care about efficient AI and want to
              build tools that developers love — we want to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Why Remap Studios */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="heading-lg mb-10">Why Remap Studios?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border">
            {[
              {
                title: "Impact",
                text: "Work on technology that directly reduces the cost and environmental footprint of AI. Every model you help optimize saves real compute.",
              },
              {
                title: "Research Culture",
                text: "We publish our research and share benchmarks. Your work reaches the broader ML community, not just internal dashboards.",
              },
              {
                title: "Small Team, Big Vision",
                text: "No bureaucracy. Ship fast, iterate, own your work end-to-end. We value autonomy and craft.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`p-8 ${
                  i < 2
                    ? "border-b md:border-b-0 md:border-r"
                    : ""
                } border-border`}
              >
                <h3 className="font-display font-bold text-lg mb-3">
                  {item.title}
                </h3>
                <p className="body-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="heading-lg mb-3">Open Positions</h2>
          <p className="body-lg mb-10 max-w-2xl">
            We&apos;re looking for exceptional people to join us. If you don&apos;t
            see a role that fits, reach out anyway — we&apos;re always open to
            great talent.
          </p>

          <div className="space-y-0 border border-border divide-y divide-border">
            {OPEN_ROLES.map((role) => (
              <details
                key={role.title}
                className="group bg-surface/50 hover:bg-surface transition-colors"
              >
                <summary className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer list-none">
                  <div>
                    <h3 className="font-display font-bold text-base text-text">
                      {role.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="mono text-[10px] text-text-subtle border border-border px-2 py-0.5">
                        {role.team}
                      </span>
                      <span className="mono text-[10px] text-text-subtle border border-border px-2 py-0.5">
                        {role.location}
                      </span>
                      <span className="mono text-[10px] text-text-subtle border border-border px-2 py-0.5">
                        {role.type}
                      </span>
                    </div>
                  </div>
                  <span className="mt-3 sm:mt-0 text-sm text-text-muted group-open:hidden">
                    Expand →
                  </span>
                  <span className="mt-3 sm:mt-0 text-sm text-text-muted hidden group-open:inline">
                    ← Collapse
                  </span>
                </summary>

                <div className="px-6 pb-6 pt-0">
                  <p className="body-sm mb-4">{role.description}</p>

                  <h4 className="font-display font-semibold text-sm mb-2 text-text">
                    Requirements
                  </h4>
                  <ul className="list-disc pl-5 mb-6 space-y-1">
                    {role.requirements.map((req, i) => (
                      <li key={i} className="body-sm text-text-muted">
                        {req}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={`mailto:careers@remapstudios.ai?subject=Application: ${role.title}`}
                    className="btn-primary no-underline inline-flex items-center"
                  >
                    Apply for {role.title} →
                  </a>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="heading-lg">Don&apos;t see your role?</h2>
          <p className="body-lg mt-4 max-w-xl mx-auto">
            We&apos;re always interested in hearing from talented people. Send us
            your resume and tell us what you&apos;d like to work on.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a
              href="mailto:careers@remapstudios.ai"
              className="btn-primary no-underline"
            >
              Send Your Resume
            </a>
            <a href="/about" className="btn-outline no-underline">
              Learn About Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
