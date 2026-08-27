import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Unlearn Studio',
  description: 'AI Model Unlearning Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">US</span>
              </div>
              <span className="text-lg font-semibold">Unlearn Studio</span>
            </a>
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
                Dashboard
              </a>
              <a href="/models" className="text-gray-400 hover:text-white transition-colors text-sm">
                Models
              </a>
              <a href="/jobs" className="text-gray-400 hover:text-white transition-colors text-sm">
                Jobs
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
