'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { jobs, type UnlearningJob } from '@/lib/api';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<UnlearningJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = () => {
      jobs.get(jobId)
        .then(setJob)
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchJob();

    // Poll for updates if job is running
    const interval = setInterval(() => {
      if (job?.status === 'running' || job?.status === 'pending') {
        fetchJob();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  if (loading) return <div className="text-gray-500">Loading job...</div>;
  if (!job) return <div className="text-gray-500">Job not found.</div>;

  const progress = job.total_steps > 0 ? (job.current_step / job.total_steps) * 100 : 0;
  const isRunning = job.status === 'running' || job.status === 'pending';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Unlearning Job</h1>
          <p className="text-gray-400 text-sm mt-1">
            {job.method} · Target: {job.target_capability}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium">
            Step {job.current_step} / {job.total_steps}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              job.status === 'completed' ? 'bg-green-600' :
              job.status === 'failed' ? 'bg-red-600' : 'bg-indigo-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{progress.toFixed(1)}% complete</span>
          <span>
            {job.status === 'completed' ? 'Done' :
             job.status === 'failed' ? 'Failed' :
             `~${Math.ceil((job.total_steps - job.current_step) * 0.5)}s remaining`}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Loss" value={job.loss?.toFixed(4) || '—'} icon="📉" />
        <MetricCard label="Forget Metric" value={job.forget_metric?.toFixed(4) || '—'} icon="🎯" />
        <MetricCard label="Retain Metric" value={job.retain_metric?.toFixed(4) || '—'} icon="🛡️" />
        <MetricCard label="GPU Utilization" value={job.gpu_utilization ? `${job.gpu_utilization.toFixed(0)}%` : '—'} icon="⚡" />
      </div>

      {/* Training Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Training Log</h2>
        <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
          {job.training_log?.steps?.length > 0 ? (
            job.training_log.steps.slice(-30).map((step: any, i: number) => (
              <div key={i} className="flex gap-4 text-gray-400">
                <span className="text-gray-600 w-16">Step {step.step}</span>
                <span className="text-yellow-400">
                  forget={step.forget_loss?.toFixed(4) || step.loss?.toFixed(4)}
                </span>
                {step.retain_loss !== undefined && (
                  <span className="text-green-400">retain={step.retain_loss?.toFixed(4)}</span>
                )}
                <span className="text-gray-500">lr={step.lr?.toExponential(2)}</span>
                <span className="text-gray-600">{(step.progress * 100).toFixed(0)}%</span>
              </div>
            ))
          ) : (
            <div className="text-gray-600">
              {isRunning ? 'Waiting for training data...' : 'No log data available.'}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isRunning && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => jobs.cancel(jobId)}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-700 rounded-lg text-sm transition-colors"
          >
            Cancel Job
          </button>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="mt-6">
          <a
            href={`/evaluations`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors inline-block"
          >
            View Results →
          </a>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-lg font-bold mt-1">{value}</div>
        </div>
        <div className="text-xl">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-yellow-900 text-yellow-300 animate-pulse',
    completed: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    pending: 'bg-blue-900 text-blue-300',
    cancelled: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}
