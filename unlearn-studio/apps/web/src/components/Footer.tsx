export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-2">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-text flex items-center justify-center rounded-sm">
                  <span className="text-bg text-sm font-bold font-display">R</span>
                </div>
                <span className="font-display font-bold text-2xl tracking-tight text-text">
                  remap<span className="text-text-subtle font-normal">studios</span>
                </span>
              </div>
              <h3 className="font-display font-black text-4xl sm:text-5xl tracking-tighter text-text leading-none">
                REMAP<br />STUDIOS
              </h3>
            </div>
            <p className="body-sm max-w-sm mb-4">
              Making AI models smaller, faster, and smarter by unlearning
              unnecessary knowledge — without losing accuracy.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/harsh11x/unlearnai" className="text-text-subtle hover:text-text transition-colors no-underline text-sm py-1" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="mailto:hello@remapstudios.ai" className="text-text-subtle hover:text-text transition-colors no-underline text-sm py-1">
                Contact
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Product</h4>
            <ul className="space-y-1 list-none">
              <li><a href="/#how-it-works" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">How it works</a></li>
              <li><a href="/#sandbox" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Sandbox</a></li>
              <li><a href="/#calculator" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Compute Calculator</a></li>
              <li><a href="/pricing" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Pricing</a></li>
              <li><a href="/#cta" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Early Access</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Resources</h4>
            <ul className="space-y-1 list-none">
              <li><a href="/docs" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Documentation</a></li>
              <li><a href="/docs#api" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">API Reference</a></li>
              <li><a href="/docs#installation" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Installation Guide</a></li>
              <li><a href="https://github.com/harsh11x/unlearnai" className="body-sm no-underline hover:text-text transition-colors inline-block py-1" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-3 text-text">Company</h4>
            <ul className="space-y-1 list-none">
              <li><a href="/about" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">About</a></li>
              <li><a href="/about#research" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Research</a></li>
              <li><a href="mailto:hello@remapstudios.ai" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Contact</a></li>
              <li><a href="mailto:enterprise@remapstudios.ai" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Enterprise</a></li>
              <li><a href="/pricing" className="body-sm no-underline hover:text-text transition-colors inline-block py-1">Pricing</a></li>
            </ul>
          </div>
        </div>

        <hr className="divider my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="body-sm">&copy; 2026 Remap Studios. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a href="#" className="body-sm no-underline hover:text-text transition-colors py-1">Privacy Policy</a>
            <a href="#" className="body-sm no-underline hover:text-text transition-colors py-1">Terms of Service</a>
            <a href="#" className="body-sm no-underline hover:text-text transition-colors py-1">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
