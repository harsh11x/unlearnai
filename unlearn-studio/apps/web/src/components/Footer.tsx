export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 bg-accent flex items-center justify-center">
                <span className="text-accent-inv text-[10px] font-bold font-display">U</span>
              </div>
              <span className="font-display font-bold text-base tracking-tight text-text">
                unlearn<span className="text-text-subtle font-normal">studio</span>
              </span>
            </div>
            <p className="body-sm max-w-sm">
              Making AI models smaller, faster, and smarter by unlearning
              unnecessary knowledge — without losing accuracy.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Product</h4>
            <ul className="space-y-2 list-none">
              <li><a href="#how-it-works" className="body-sm no-underline hover:text-text transition-colors">How it works</a></li>
              <li><a href="#sandbox" className="body-sm no-underline hover:text-text transition-colors">Sandbox</a></li>
              <li><a href="#calculator" className="body-sm no-underline hover:text-text transition-colors">Compute Calculator</a></li>
              <li><a href="#cta" className="body-sm no-underline hover:text-text transition-colors">Early Access</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Research</h4>
            <ul className="space-y-2 list-none">
              <li><span className="body-sm">Machine Unlearning</span></li>
              <li><span className="body-sm">Model Pruning</span></li>
              <li><span className="body-sm">Knowledge Distillation</span></li>
              <li><span className="body-sm">Neural Architecture</span></li>
            </ul>
          </div>
        </div>

        <hr className="divider my-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="body-sm">&copy; 2026 Unlearn Studio. All rights reserved.</p>
          <p className="body-sm">Built for the future of efficient AI.</p>
        </div>
      </div>
    </footer>
  );
}
