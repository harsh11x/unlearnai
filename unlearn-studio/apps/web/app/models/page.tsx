'use client';

import { useEffect, useState, useRef } from 'react';
import { models, type ModelSummary } from '@/lib/api';

export default function ModelsPage() {
  const [modelList, setModelList] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    models.list()
      .then(setModelList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await models.upload(file);
      setUploadResult(result);
      // Refresh list
      const updated = await models.list();
      setModelList(updated);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Models</h1>
          <p className="text-gray-400 text-sm mt-1">
            Upload and manage open-weight language models.
          </p>
        </div>
        <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium cursor-pointer transition-colors">
          {uploading ? 'Uploading...' : 'Upload Model'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".safetensors,.bin,.pt,.pth"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Upload Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Upload Success */}
      {uploadResult && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-green-300 mb-2">Model Uploaded Successfully</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Architecture:</span>{' '}
              <span>{uploadResult.metadata?.architecture}</span>
            </div>
            <div>
              <span className="text-gray-500">Parameters:</span>{' '}
              <span>{uploadResult.metadata?.parameter_count_formatted}</span>
            </div>
            <div>
              <span className="text-gray-500">Format:</span>{' '}
              <span>{uploadResult.metadata?.model_format}</span>
            </div>
            <div>
              <span className="text-gray-500">VRAM:</span>{' '}
              <span>{uploadResult.metadata?.estimated_vram_gb} GB</span>
            </div>
          </div>
        </div>
      )}

      {/* Model List */}
      {loading ? (
        <div className="text-gray-500">Loading models...</div>
      ) : modelList.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="font-semibold text-lg mb-2">No Models</h2>
          <p className="text-gray-400 text-sm mb-4">
            Upload a supported open-weight model to get started.
          </p>
          <p className="text-xs text-gray-600">
            Supported formats: .safetensors, .bin (HuggingFace)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelList.map(m => (
            <a
              key={m.id}
              href={`/models/${m.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{m.name}</h3>
                <StatusBadge status={m.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Architecture</div>
                <div>{m.architecture || '—'}</div>
                <div className="text-gray-500">Parameters</div>
                <div>{m.parameter_count_formatted || '—'}</div>
                <div className="text-gray-500">Est. VRAM</div>
                <div>{m.estimated_vram_gb ? `${m.estimated_vram_gb} GB` : '—'}</div>
              </div>
              <div className="text-xs text-gray-600 mt-3">
                {m.created_at?.slice(0, 10)}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: 'bg-green-900 text-green-300',
    uploading: 'bg-blue-900 text-blue-300',
    validating: 'bg-blue-900 text-blue-300',
    error: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}
