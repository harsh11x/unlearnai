export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 bg-accent flex items-center justify-center">
                <span className="text-accent-inv text-[10px] font-bold font-display">U</span>
              </div>
              <span className="font-display font-bold text-base tracking-tight text-text">
                text-remap<span className="text-text-subtle font-normal">studios</span>
              </span>
            </div>
            <p className="body-sm max-w-sm">
              Making AI models smaller, faster, and smarter by unlearning
              unnecessary knowledge — without losing accuracy.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://github.com/harsh11x/unlearnai" className="text-text-subtle hover:text-text transition-colors no-underline text-sm" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="mailto:hello@remapstudios.ai" className="text-text-subtle hover:text-text transition-colors no-underline text-sm">
                Contact
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Product</h4>
            <ul className="space-y-2 list-none">
              <li><a href="/#how-it-works" className="body-sm no-underline hover:text-text transition-colors">How it works</a></li>
              <li><a href="/#sandbox" className="body-sm no-underline hover:text-text transition-colors">Sandbox</a></li>
              <li><a href="/#calculator" className="body-sm no-underline hover:text-text transition-colors">Compute Calculator</a></li>
              <li><a href="/pricing" className="body-sm no-underline hover:text-text transition-colors">Pricing</a></li>
              <li><a href="/#cta" className="body-sm no-underline hover:text-text transition-colors">Early Access</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Resources</h4>
            <ul className="space-y-2 list-none">
              <li><a href="/docs" className="body-sm no-underline hover:text-text transition-colors">Documentation</a></li>
              <li><a href="/docs#api" className="body-sm no-underline hover:text-text transition-colors">API Reference</a></li>
              <li><a href="/docs#installation" className="body-sm no-underline hover:text-text transition-colors">Installation Guide</a></li>
              <li><a href="https://github.com/harsh11x/unlearnai" className="body-sm no-underline hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Company</h4>
            <ul className="space-y-2 list-none">
              <li><a href="/about" className="body-sm no-underline hover:text-text transition-colors">About</a></li>
              <li><a href="/about#research" className="body-sm no-underline hover:text-text transition-colors">Research</a></li>
              <li><a href="mailto:hello@remapstudios.ai" className="body-sm no-underline hover:text-text transition-colors">Contact</a></li>
              <li><a href="mailto:enterprise@remapstudios.ai" className="body-sm no-underline hover:text-text transition-colors">Enterprise</a></li>
              <li><a href="/pricing" className="body-sm no-underline hover:text-text transition-colors">Pricing</a></li>
            </ul>
          </div>
        </div>

        <hr className="divider my-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="body-sm">&copy; 2026 Remap Studios. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="body-sm no-underline hover:text-text transition-colors">Privacy Policy</a>
            <a href="#" className="body-sm no-underline hover:text-text transition-colors">Terms of Service</a>
            <a href="#" className="body-sm no-underline hover:text-text transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
