/**
 * Unlearn Studio - API Client
 * Communicates with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'API request failed');
  }

  return res.json();
}

// =============================================================================
// Projects
// =============================================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  models?: ModelSummary[];
}

export const projects = {
  list: () => fetchAPI<Project[]>('/projects'),
  get: (id: string) => fetchAPI<Project & { models: ModelSummary[] }>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    fetchAPI<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
};

// =============================================================================
// Models
// =============================================================================

export interface ModelSummary {
  id: string;
  name: string;
  status: string;
  architecture: string;
  parameter_count_formatted: string;
  estimated_vram_gb: number;
  created_at: string;
}

export interface ModelDetail {
  id: string;
  name: string;
  status: string;
  architecture: string;
  parameter_count: number;
  parameter_count_formatted: string;
  tokenizer_type: string;
  vocab_size: number;
  dtype: string;
  model_format: string;
  model_hash: string;
  model_size_bytes: number;
  model_size_formatted: string;
  estimated_vram_gb: number;
  is_compatible: boolean;
  metadata: Record<string, any>;
  versions: ModelVersion[];
  created_at: string;
}

export interface ModelVersion {
  id: string;
  version_tag: string;
  version_number: number;
  status: string;
  created_at: string;
}

export const models = {
  list: (projectId?: string) =>
    fetchAPI<ModelSummary[]>(`/models/list${projectId ? `?project_id=${projectId}` : ''}`),
  get: (id: string) => fetchAPI<ModelDetail>(`/models/${id}`),
  versions: (id: string) => fetchAPI<ModelVersion[]>(`/models/${id}/versions`),
  upload: async (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('project_id', projectId);
    return fetchAPI<any>('/models/upload', { method: 'POST', body: formData });
  },
};

// =============================================================================
// Jobs
// =============================================================================

export interface UnlearningJob {
  id: string;
  model_id: string;
  method: string;
  status: string;
  progress: number;
  current_step: number;
  total_steps: number;
  loss: number;
  forget_metric: number;
  retain_metric: number;
  gpu_utilization: number;
  gpu_memory_used: number;
  target_capability: string;
  config: Record<string, any>;
  training_log: Record<string, any>;
  error: string | null;
  created_at: string;
}

export const jobs = {
  list: (modelId?: string) =>
    fetchAPI<UnlearningJob[]>(`/jobs${modelId ? `?model_id=${modelId}` : ''}`),
  get: (id: string) => fetchAPI<UnlearningJob>(`/jobs/${id}`),
  create: (data: {
    model_id: string;
    source_version_id: string;
    target_capability?: string;
    method?: string;
    config?: Record<string, any>;
  }) => fetchAPI<UnlearningJob>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) =>
    fetchAPI<any>(`/jobs/${id}/cancel`, { method: 'POST' }),
};

// =============================================================================
// Evaluations
// =============================================================================

export interface EvaluationRun {
  id: string;
  model_id: string;
  model_version_id: string;
  eval_type: string;
  status: string;
  metrics: Record<string, any>;
  overall_score: number;
  duration_seconds: number;
  capability_scores: CapabilityScore[];
  created_at: string;
}

export interface CapabilityScore {
  capability: string;
  score: number;
  probe_count: number;
  matched_count: number;
}

export interface Report {
  report_id: string;
  generated_at: string;
  model: { name: string; version_before: string; version_after: string };
  target: { capability: string; description: string };
  method: { name: string; description: string };
  forgetting_results: {
    target: string;
    before: number;
    after: number;
    delta: number;
    forget_achievement: number;
    residual_knowledge: number;
  };
  retention_results: {
    capabilities: Record<string, { before: number; after: number; delta: number }>;
    overall_retention: number;
  };
  collateral_damage: {
    level: string;
    score: number;
  };
  robustness_results: {
    tests: Array<{
      probe_type: string;
      before_score: number;
      after_score: number;
      delta: number;
      survived_robustness: boolean;
    }>;
    summary: string;
  };
  final_verdict: {
    verdict: string;
    reasoning: string;
  };
  compute_cost: {
    duration_seconds: number;
    duration_formatted: string;
    total_steps: number;
  };
  limitations: string[];
}

export const evaluations = {
  list: (modelId?: string) =>
    fetchAPI<EvaluationRun[]>(`/evaluations${modelId ? `?model_id=${modelId}` : ''}`),
  get: (id: string) => fetchAPI<EvaluationRun>(`/evaluations/${id}`),
  create: (data: {
    model_id: string;
    model_version_id: string;
    eval_type?: string;
  }) => fetchAPI<EvaluationRun>('/evaluations', { method: 'POST', body: JSON.stringify(data) }),
  reports: {
    list: () => fetchAPI<any[]>('/evaluations/reports/list'),
    get: (id: string) => fetchAPI<Report>(`/evaluations/reports/${id}`),
  },
};
