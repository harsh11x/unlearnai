export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8">
        <span className="text-white font-bold text-2xl">US</span>
      </div>

      <h1 className="text-5xl font-bold mb-4 gradient-text">
        Unlearn Studio
      </h1>

      <p className="text-xl text-gray-400 max-w-2xl mb-8">
        AI Model Unlearning Platform. Selectively reduce model capabilities
        while preserving unrelated knowledge. Evidence-based evaluation
        with controlled probing.
      </p>

      <div className="flex gap-4 mb-16">
        <a
          href="/dashboard"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
        >
          Open Dashboard
        </a>
        <a
          href="/docs"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
        >
          Documentation
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-indigo-400 text-2xl mb-3">🔍</div>
          <h3 className="font-semibold mb-2">Capability Explorer</h3>
          <p className="text-sm text-gray-400">
            Controlled probing experiments to measure observed capabilities
            across programming languages and domains.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-purple-400 text-2xl mb-3">🧪</div>
          <h3 className="font-semibold mb-2">Selective Unlearning</h3>
          <p className="text-sm text-gray-400">
            Gradient-based methods to reduce specific capabilities while
            retaining unrelated knowledge. Results measured empirically.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-green-400 text-2xl mb-3">📊</div>
          <h3 className="font-semibold mb-2">Evidence-Based Evaluation</h3>
          <p className="text-sm text-gray-400">
            Before/after comparison with robustness testing, collateral damage
            assessment, and configurable verdict thresholds.
          </p>
        </div>
      </div>

      <div className="mt-16 bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-3xl w-full">
        <h2 className="font-semibold text-lg mb-3">Scientific Disclaimer</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Unlearn Studio performs gradient-based model editing, not theoretical machine unlearning.
          Results are measured through controlled probing experiments, not direct weight inspection.
          We use language like &quot;observed capability&quot;, &quot;probe score&quot;, and &quot;capability reduction&quot;
          rather than claiming to inspect or completely remove internal model knowledge.
          The system clearly communicates uncertainty and limitations in all reports.
        </p>
      </div>
    </div>
  )
}
