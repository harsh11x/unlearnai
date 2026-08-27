'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { evaluations, models, type EvaluationRun, type ModelDetail } from '@/lib/api';

const CAPABILITY_CATEGORIES = [
  { id: 'python', name: 'Python', icon: '🐍', color: 'text-yellow-400' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨', color: 'text-yellow-300' },
  { id: 'typescript', name: 'TypeScript', icon: '🟦', color: 'text-blue-400' },
  { id: 'cpp', name: 'C++', icon: '⚡', color: 'text-purple-400' },
  { id: 'general_programming', name: 'General Programming', icon: '💻', color: 'text-green-400' },
  { id: 'algorithms', name: 'Algorithms', icon: '🧮', color: 'text-red-400' },
];

const PYTHON_SUBCATEGORIES = [
  'Syntax', 'Variables', 'Functions', 'Classes', 'Exceptions',
  'Iterators', 'Generators', 'Decorators', 'Context Managers',
  'Async Programming', 'Standard Library', 'File Handling',
  'Data Structures', 'Type Hints', 'Testing', 'Debugging',
  'Algorithms', 'Common APIs', 'Python Idioms', 'Code Generation',
];

export default function ExplorerPage() {
  const params = useParams();
  const modelId = params.id as string;
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [evalRun, setEvalRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('python');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (modelId) {
      Promise.all([
        models.get(modelId),
        evaluations.list(modelId).then(evals => {
          const baseline = evals.find(e => e.eval_type === 'baseline');
          if (baseline) return evaluations.get(baseline.id);
          return null;
        }),
      ])
        .then(([m, e]) => {
          setModel(m);
          setEvalRun(e);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [modelId]);

  const runEvaluation = async () => {
    if (!model) return;
    setRunning(true);
    try {
      const latestVersion = model.versions[model.versions.length - 1];
      const evalResult = await evaluations.create({
        model_id: model.id,
        model_version_id: latestVersion.id,
        eval_type: 'baseline',
      });
      // In production, poll for completion
      setEvalRun(evalResult);
    } catch (err) {
      console.error('Failed to start evaluation:', err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading explorer...</div>;
  if (!model) return <div className="text-gray-500">Model not found.</div>;

  const capScores = evalRun?.capability_scores || [];
  const pythonScore = capScores.find(c => c.capability === 'python');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <a href={`/models/${modelId}`} className="hover:text-white">← {model.name}</a>
            <span>/</span>
            <span>Capability Explorer</span>
          </div>
          <h1 className="text-2xl font-bold">Capability Explorer</h1>
          <p className="text-gray-400 text-sm mt-1">
            Controlled probing experiments to measure observed capabilities.
            Scores represent probe evidence, not direct knowledge inspection.
          </p>
        </div>
        <button
          onClick={runEvaluation}
          disabled={running}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {running ? 'Running...' : 'Run Evaluation'}
        </button>
      </div>

      {/* Capability Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {CAPABILITY_CATEGORIES.map(cat => {
          const score = capScores.find(c =>
            c.capability.toLowerCase().includes(cat.id.toLowerCase())
          );
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gray-800 border-indigo-600'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className={`text-sm font-medium ${cat.color}`}>{cat.name}</div>
              <div className="text-2xl font-bold mt-1">
                {score ? `${score.score.toFixed(0)}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {score ? `${score.matched_count}/${score.probe_count} probes` : 'Not evaluated'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed View */}
      {selectedCategory === 'python' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Python Subcategory Breakdown</h2>
          <p className="text-sm text-gray-400 mb-4">
            Evidence-based scores for specific Python capability areas.
            Each category uses multiple probes including paraphrased variants.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PYTHON_SUBCATEGORIES.map(sub => (
              <div key={sub} className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-300">{sub}</div>
                <div className="text-xs text-gray-500 mt-1">Multiple probes</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Visualization */}
      {evalRun && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Probe Scores</h2>
          <div className="space-y-3">
            {capScores.map(cap => (
              <div key={cap.capability} className="flex items-center gap-4">
                <div className="w-40 text-sm text-gray-300">{cap.capability}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${cap.score}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium">
                  {cap.score.toFixed(0)}%
                </div>
                <div className="w-20 text-right text-xs text-gray-500">
                  {cap.matched_count}/{cap.probe_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!evalRun && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="font-semibold text-lg mb-2">No Evaluation Data</h2>
          <p className="text-gray-400 text-sm mb-4">
            Run an evaluation to measure this model&apos;s observed capabilities
            across programming languages and domains.
          </p>
          <button
            onClick={runEvaluation}
            disabled={running}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {running ? 'Running Evaluation...' : 'Run Baseline Evaluation'}
          </button>
        </div>
      )}
    </div>
  );
}
