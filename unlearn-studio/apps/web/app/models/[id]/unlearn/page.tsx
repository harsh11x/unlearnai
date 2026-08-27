'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { models, jobs, type ModelDetail } from '@/lib/api';

const STEPS = [
  'Select Target',
  'Choose Forget Dataset',
  'Choose Retain Dataset',
  'Choose Method',
  'Configure',
  'Review',
  'Start Unlearning',
];

const UNLEARNING_METHODS = [
  {
    id: 'gradient_forgetting',
    name: 'Gradient Forgetting Baseline',
    description: 'Maximizes loss on target examples. Simple baseline without retention preservation. May cause collateral damage.',
    pros: ['Simple', 'Fast', 'Good baseline'],
    cons: ['No retention mechanism', 'May cause collateral damage'],
  },
  {
    id: 'retain_aware',
    name: 'Retain-Aware Unlearning',
    description: 'Combines forgetting objective with preservation objective. Uses weighted loss: total = -forget_weight * forget_loss + retain_weight * retain_loss',
    pros: ['Balances forgetting and retention', 'Less collateral damage'],
    cons: ['Requires tuning weights', 'Not theoretically guaranteed'],
  },
];

export default function UnlearnPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.id as string;
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState('retain_aware');
  const [config, setConfig] = useState({
    learning_rate: 5e-5,
    num_steps: 200,
    batch_size: 4,
    forget_loss_weight: 1.0,
    retain_loss_weight: 1.0,
    seed: 42,
  });
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (modelId) {
      models.get(modelId).then(setModel).catch(console.error);
    }
  }, [modelId]);

  const launchUnlearning = async () => {
    if (!model) return;
    setLaunching(true);
    try {
      const latestVersion = model.versions[model.versions.length - 1];
      const job = await jobs.create({
        model_id: model.id,
        source_version_id: latestVersion.id,
        target_capability: 'python',
        method: selectedMethod,
        config: { ...config, version_number: model.versions.length + 1 },
      });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      console.error('Failed to launch unlearning:', err);
    } finally {
      setLaunching(false);
    }
  };

  if (!model) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <a href={`/models/${modelId}`} className="hover:text-white">← {model.name}</a>
        <span>/</span>
        <span>Unlearning Workspace</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Unlearning Workspace</h1>
      <p className="text-gray-400 text-sm mb-8">
        Configure and run selective unlearning on this model.
      </p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                i === currentStep
                  ? 'bg-indigo-600 text-white'
                  : i < currentStep
                  ? 'bg-gray-800 text-green-400'
                  : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                {i < currentStep ? '✓' : i + 1}
              </span>
              {step}
            </button>
            {i < STEPS.length - 1 && <span className="text-gray-700">→</span>}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        {currentStep === 0 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 1: Select Target</h2>
            <p className="text-gray-400 text-sm mb-4">
              Choose which capability to reduce through unlearning.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-indigo-900/30 border border-indigo-600 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🐍</div>
                <div className="font-medium text-indigo-300">Python</div>
                <div className="text-xs text-gray-500 mt-1">Selected</div>
              </div>
              {['JavaScript', 'TypeScript', 'C++'].map(lang => (
                <div key={lang} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center opacity-50">
                  <div className="font-medium text-gray-400">{lang}</div>
                  <div className="text-xs text-gray-600 mt-1">Coming soon</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 2: Choose Forget Dataset</h2>
            <p className="text-gray-400 text-sm mb-4">
              The forget dataset contains prompts representing knowledge to be reduced.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Python Forget Suite</div>
                  <div className="text-sm text-gray-400 mt-1">
                    20 training examples covering Python syntax, functions, classes, data structures,
                    file handling, standard library, error handling, decorators, generators, algorithms,
                    async programming, and testing.
                  </div>
                </div>
                <div className="text-green-400 text-sm font-medium">Selected</div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 3: Choose Retain Dataset</h2>
            <p className="text-gray-400 text-sm mb-4">
              The retain dataset contains prompts for capabilities that should be preserved.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Programming Retain Suite</div>
                  <div className="text-sm text-gray-400 mt-1">
                    JavaScript, TypeScript, C++, general programming reasoning,
                    and algorithm design prompts.
                  </div>
                </div>
                <div className="text-green-400 text-sm font-medium">Selected</div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 4: Choose Method</h2>
            <p className="text-gray-400 text-sm mb-4">
              Select the unlearning algorithm to apply.
            </p>
            <div className="space-y-3">
              {UNLEARNING_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full text-left bg-gray-800 rounded-lg p-4 border transition-all ${
                    selectedMethod === method.id
                      ? 'border-indigo-600 bg-indigo-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{method.name}</div>
                    {selectedMethod === method.id && (
                      <div className="text-indigo-400 text-sm">Selected</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{method.description}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-400">+ {method.pros.join(', ')}</span>
                    <span className="text-red-400">− {method.cons.join(', ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 5: Configure</h2>
            <p className="text-gray-400 text-sm mb-4">
              Configure unlearning hyperparameters.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <ConfigInput
                label="Learning Rate"
                value={config.learning_rate}
                onChange={v => setConfig({ ...config, learning_rate: v })}
                step={1e-6}
              />
              <ConfigInput
                label="Number of Steps"
                value={config.num_steps}
                onChange={v => setConfig({ ...config, num_steps: v })}
                step={10}
                isInt
              />
              <ConfigInput
                label="Batch Size"
                value={config.batch_size}
                onChange={v => setConfig({ ...config, batch_size: v })}
                step={1}
                isInt
              />
              <ConfigInput
                label="Forget Loss Weight"
                value={config.forget_loss_weight}
                onChange={v => setConfig({ ...config, forget_loss_weight: v })}
                step={0.1}
              />
              <ConfigInput
                label="Retain Loss Weight"
                value={config.retain_loss_weight}
                onChange={v => setConfig({ ...config, retain_loss_weight: v })}
                step={0.1}
              />
              <ConfigInput
                label="Random Seed"
                value={config.seed}
                onChange={v => setConfig({ ...config, seed: v })}
                step={1}
                isInt
              />
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 6: Review</h2>
            <p className="text-gray-400 text-sm mb-4">
              Review your configuration before starting.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Target</span>
                <span className="text-sm font-medium">Python</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Method</span>
                <span className="text-sm font-medium">
                  {UNLEARNING_METHODS.find(m => m.id === selectedMethod)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Steps</span>
                <span className="text-sm font-medium">{config.num_steps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Learning Rate</span>
                <span className="text-sm font-medium">{config.learning_rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Batch Size</span>
                <span className="text-sm font-medium">{config.batch_size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Forget/Retain Weight</span>
                <span className="text-sm font-medium">
                  {config.forget_loss_weight} / {config.retain_loss_weight}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Seed</span>
                <span className="text-sm font-medium">{config.seed}</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Step 7: Start Unlearning</h2>
            <p className="text-gray-400 text-sm mb-4">
              Ready to begin. This will create a new model version.
            </p>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-300">
                ⚠️ The original model will not be modified. A new version will be created.
              </p>
            </div>
            <button
              onClick={launchUnlearning}
              disabled={launching}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {launching ? 'Launching...' : '🚀 Start Unlearning'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === STEPS.length - 1}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function ConfigInput({ label, value, onChange, step, isInt }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  isInt?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(isInt ? parseInt(e.target.value) : parseFloat(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
      />
    </div>
  );
}
