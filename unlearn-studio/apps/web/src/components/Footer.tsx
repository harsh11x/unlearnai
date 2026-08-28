"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#060a12] border-t border-white/[0.04]">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 py-16">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-highlight to-amber-600 flex items-center justify-center">
                <span className="font-mono font-bold text-sm text-[#0a0f1a]">N</span>
              </div>
              <span className="font-sans font-bold text-lg text-ink tracking-tight">
                Null<span className="text-highlight">Mind</span>
              </span>
            </Link>
            <p className="text-sm text-ink-subtle leading-relaxed max-w-sm">
              An open-source platform for evidence-based LLM capability
              reduction. Forget targeted knowledge without retraining full model
              parameters.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/harsh11x/unlearnai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink-muted bg-white/[0.03] border border-border-strong rounded-lg hover:bg-white/[0.06] hover:text-ink transition-all"
              >
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-5">
              Navigate
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#research"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Research
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-5">
              Platform
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-ink-subtle hover:text-ink transition-colors"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-5">
              Compliance
            </h3>
            <ul className="space-y-3 text-sm text-ink-subtle">
              <li>GDPR Right to Erasure</li>
              <li>CCPA Model Erasure</li>
              <li>Reproducible Audits</li>
              <li>Immutable Checkpoints</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-subtle">
          <div className="flex items-center gap-4">
            <span>Built with PyTorch · HuggingFace · FastAPI · Next.js</span>
          </div>
          <span>© 2026 NullMind. Open-source research platform.</span>
        </div>
      </div>
    </footer>
  );
}
