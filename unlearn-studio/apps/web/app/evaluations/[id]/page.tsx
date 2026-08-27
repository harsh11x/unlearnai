'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { evaluations, type Report } from '@/lib/api';

export default function EvaluationDetailPage() {
  const params = useParams();
  const evalId = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (evalId) {
      evaluations.reports.get(evalId)
        .then(setReport)
        .catch(() => {
          // Try fetching as evaluation run
          return evaluations.get(evalId).then(e => {
            // Convert eval run to partial report display
            return null;
          });
        })
        .finally(() => setLoading(false));
    }
  }, [evalId]);

  if (loading) return <div className="text-gray-500">Loading report...</div>;
  if (!report) return <div className="text-gray-500">Report not found.</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Evaluation Report</h1>
          <p className="text-gray-400 text-sm mt-1">
            {report.model.name} · {report.method.name} · Generated {report.generated_at?.slice(0, 10)}
          </p>
        </div>
        <VerdictBadge verdict={report.final_verdict.verdict} />
      </div>

      {/* Before / After / Delta Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Results Comparison</h2>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="text-left py-2">Capability</th>
              <th className="text-right py-2">BEFORE</th>
              <th className="text-right py-2">AFTER</th>
              <th className="text-right py-2">DELTA</th>
            </tr>
          </thead>
          <tbody>
            {/* Target */}
            <tr className="border-b border-gray-800">
              <td className="py-3">
                <span className="font-medium text-yellow-400">
                  {report.forgetting_results.target.toUpperCase()} (target)
                </span>
              </td>
              <td className="text-right py-3 font-mono">{report.forgetting_results.before}%</td>
              <td className="text-right py-3 font-mono">{report.forgetting_results.after}%</td>
              <td className="text-right py-3 font-mono text-red-400 font-bold">
                {report.forgetting_results.delta > 0 ? '+' : ''}{report.forgetting_results.delta}
              </td>
            </tr>
            {/* Retain capabilities */}
            {Object.entries(report.retention_results.capabilities).map(([name, cap]) => (
              <tr key={name} className="border-b border-gray-800/50">
                <td className="py-3 text-gray-300">{name}</td>
                <td className="text-right py-3 font-mono text-gray-400">{cap.before}%</td>
                <td className="text-right py-3 font-mono text-gray-400">{cap.after}%</td>
                <td className={`text-right py-3 font-mono ${
                  cap.delta >= -2 ? 'text-green-400' :
                  cap.delta >= -5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {cap.delta > 0 ? '+' : ''}{cap.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Forgetting"
          value={`${report.forgetting_results.forget_achievement}%`}
          color={report.forgetting_results.forget_achievement >= 30 ? 'green' : 'yellow'}
          icon="🎯"
        />
        <SummaryCard
          label="Retention"
          value={`${report.retention_results.overall_retention}%`}
          color={report.retention_results.overall_retention >= 90 ? 'green' : 'yellow'}
          icon="🛡️"
        />
        <SummaryCard
          label="Collateral Damage"
          value={report.collateral_damage.level}
          color={report.collateral_damage.level === 'LOW' ? 'green' :
                 report.collateral_damage.level === 'MEDIUM' ? 'yellow' : 'red'}
          icon="💥"
        />
        <SummaryCard
          label="Residual Knowledge"
          value={`${report.forgetting_results.residual_knowledge}%`}
          color={report.forgetting_results.residual_knowledge <= 30 ? 'green' : 'yellow'}
          icon="🧠"
        />
      </div>

      {/* Forgetting Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Forgetting</h2>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Python capability reduction</span>
            <span className="font-medium">{report.forgetting_results.forget_achievement}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
              style={{ width: `${Math.min(100, report.forgetting_results.forget_achievement)}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Percentage of target capability that was measured as reduced.
        </p>
      </div>

      {/* Retention Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Retention</h2>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Non-Python capabilities preserved</span>
            <span className="font-medium">{report.retention_results.overall_retention}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, report.retention_results.overall_retention)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Robustness */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Robustness Testing</h2>
        <p className="text-sm text-gray-400 mb-4">{report.robustness_results.summary}</p>
        <div className="space-y-2">
          {report.robustness_results.tests.map(test => (
            <div key={test.probe_type} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm font-medium capitalize">{test.probe_type} probes</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-400">
                  Before: {test.before_score}% → After: {test.after_score}%
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  test.survived_robustness ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {test.survived_robustness ? 'FORGOTTEN ✓' : 'SURVIVED ✗'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Verdict */}
      <div className={`rounded-xl p-6 mb-6 ${
        report.final_verdict.verdict === 'PASS' ? 'bg-green-900/30 border border-green-700' :
        report.final_verdict.verdict === 'PASS WITH REVIEW' ? 'bg-yellow-900/30 border border-yellow-700' :
        'bg-red-900/30 border border-red-700'
      }`}>
        <h2 className="font-semibold text-lg mb-2">Final Verdict</h2>
        <div className={`text-3xl font-bold mb-3 ${
          report.final_verdict.verdict === 'PASS' ? 'text-green-400' :
          report.final_verdict.verdict === 'PASS WITH REVIEW' ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {report.final_verdict.verdict}
        </div>
        <p className="text-sm text-gray-400">{report.final_verdict.reasoning}</p>
      </div>

      {/* Compute Cost */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-3">Compute Cost</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">Duration</div>
            <div className="font-medium">{report.compute_cost.duration_formatted}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Steps</div>
            <div className="font-medium">{report.compute_cost.total_steps}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">GPU</div>
            <div className="font-medium">Used</div>
          </div>
        </div>
      </div>

      {/* Limitations */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-3">Limitations</h2>
        <ul className="space-y-2">
          {report.limitations.map((limitation, i) => (
            <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-gray-600 mt-0.5">•</span>
              {limitation}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: {
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'red';
  icon: string;
}) {
  const colorMap = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-lg font-bold mt-1 ${colorMap[color]}`}>{value}</div>
        </div>
        <div className="text-xl">{icon}</div>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    PASS: 'bg-green-900 text-green-300 border border-green-700',
    'PASS WITH REVIEW': 'bg-yellow-900 text-yellow-300 border border-yellow-700',
    FAIL: 'bg-red-900 text-red-300 border border-red-700',
  };
  return (
    <span className={`text-sm px-4 py-2 rounded-lg font-bold ${colors[verdict] || 'bg-gray-800 text-gray-400'}`}>
      {verdict}
    </span>
  );
}
