'use client';

import { useEffect, useState } from 'react';
import { models, jobs, evaluations, type ModelSummary, type UnlearningJob } from '@/lib/api';

export default function DashboardPage() {
  const [modelList, setModelList] = useState<ModelSummary[]>([]);
  const [jobList, setJobList] = useState<UnlearningJob[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, j, r] = await Promise.all([
          models.list().catch(() => []),
          jobs.list().catch(() => []),
          evaluations.reports.list().catch(() => []),
        ]);
        setModelList(m);
        setJobList(j);
        setReports(r);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const runningJobs = jobList.filter(j => j.status === 'running');
  const recentJobs = jobList.slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Models" value={modelList.length} icon="📦" color="indigo" />
        <StatCard title="Running Jobs" value={runningJobs.length} icon="⚡" color="yellow" />
        <StatCard title="Completed" value={jobList.filter(j => j.status === 'completed').length} icon="✅" color="green" />
        <StatCard title="Reports" value={reports.length} icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Models */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Recent Models</h2>
          {modelList.length === 0 ? (
            <p className="text-gray-500 text-sm">No models uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {modelList.slice(0, 5).map(m => (
                <a
                  key={m.id}
                  href={`/models/${m.id}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-gray-500">
                      {m.architecture} · {m.parameter_count_formatted}
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Recent Experiments</h2>
          {recentJobs.length === 0 ? (
            <p className="text-gray-500 text-sm">No experiments run yet.</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map(j => (
                <a
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{j.method}</div>
                    <div className="text-xs text-gray-500">
                      Target: {j.target_capability} · Step {j.current_step}/{j.total_steps}
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Recent Evaluation Reports</h2>
          {reports.length === 0 ? (
            <p className="text-gray-500 text-sm">No reports generated yet.</p>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 5).map((r: any) => (
                <a
                  key={r.id}
                  href={`/evaluations/${r.id}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {r.model?.name || 'Unknown Model'} — {r.method || 'Unknown Method'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Target: {r.target?.capability || 'N/A'} · {r.generated_at?.slice(0, 10)}
                    </div>
                  </div>
                  <VerdictBadge verdict={r.verdict || 'UNKNOWN'} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: 'bg-green-900 text-green-300',
    running: 'bg-yellow-900 text-yellow-300',
    completed: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    pending: 'bg-gray-800 text-gray-400',
    uploading: 'bg-blue-900 text-blue-300',
    validating: 'bg-blue-900 text-blue-300',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    PASS: 'bg-green-900 text-green-300',
    'PASS WITH REVIEW': 'bg-yellow-900 text-yellow-300',
    FAIL: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[verdict] || 'bg-gray-800 text-gray-400'}`}>
      {verdict}
    </span>
  );
}
