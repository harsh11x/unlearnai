'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { models, type ModelDetail } from '@/lib/api';

export default function ModelDetailPage() {
  const params = useParams();
  const modelId = params.id as string;
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelId) {
      models.get(modelId)
        .then(setModel)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [modelId]);

  if (loading) return <div className="text-gray-500">Loading model...</div>;
  if (!model) return <div className="text-gray-500">Model not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{model.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Version: {model.versions?.[0]?.version_tag || 'v1'} · {model.status}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/models/${modelId}/explorer`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            Capability Explorer
          </a>
          <a
            href={`/models/${modelId}/unlearn`}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            Unlearn
          </a>
        </div>
      </div>

      {/* Model Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <InfoCard label="Architecture" value={model.architecture} />
        <InfoCard label="Parameters" value={model.parameter_count_formatted} />
        <InfoCard label="Format" value={model.model_format} />
        <InfoCard label="Data Type" value={model.dtype} />
        <InfoCard label="Tokenizer" value={model.tokenizer_type} />
        <InfoCard label="Vocab Size" value={model.vocab_size.toLocaleString()} />
        <InfoCard label="Model Size" value={model.model_size_formatted} />
        <InfoCard label="Est. VRAM" value={`${model.estimated_vram_gb} GB`} />
        <InfoCard
          label="Compatibility"
          value={model.is_compatible ? '✅ Compatible' : '❌ Incompatible'}
        />
      </div>

      {/* Model Hash */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-3">Model Hash (SHA-256)</h2>
        <code className="text-sm text-gray-400 break-all">{model.model_hash}</code>
      </div>

      {/* Model Lineage / Versions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">Model Versions</h2>
        {model.versions.length === 0 ? (
          <p className="text-gray-500 text-sm">No versions recorded.</p>
        ) : (
          <div className="space-y-3">
            {model.versions.map(v => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">{v.version_tag}</div>
                  <div className="text-xs text-gray-500">
                    Version {v.version_number} · {v.created_at?.slice(0, 10)}
                  </div>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Lineage Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Model Lineage</h2>
        <div className="flex items-center gap-4">
          {model.versions.map((v, i) => (
            <div key={v.id} className="flex items-center gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-center">
                <div className="text-sm font-medium">{v.version_tag}</div>
                <div className="text-xs text-gray-500">v{v.version_number}</div>
              </div>
              {i < model.versions.length - 1 && (
                <div className="text-gray-600">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-900 text-green-300',
    pending: 'bg-yellow-900 text-yellow-300',
    error: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}
