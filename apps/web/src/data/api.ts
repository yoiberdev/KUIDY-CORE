import type {
  FieldCreateInput,
  FieldDefinition,
  ModuleCreateInput,
  ModuleSummary,
  ProjectCreateInput,
  ProjectSummary,
  RecordRow,
} from '@kuidy/shared';
import { api } from '@/lib/api';

export const projectApi = {
  list: () => api<{ projects: ProjectSummary[] }>('/api/projects'),
  get: (id: string) => api<{ project: ProjectSummary }>(`/api/projects/${id}`),
  create: (input: ProjectCreateInput) =>
    api<{ project: ProjectSummary }>('/api/projects', { method: 'POST', body: input }),
  delete: (id: string) => api<void>(`/api/projects/${id}`, { method: 'DELETE' }),
};

export const moduleApi = {
  list: (projectId: string) =>
    api<{ modules: ModuleSummary[] }>(`/api/projects/${projectId}/modules`),
  get: (id: string) => api<{ module: ModuleSummary }>(`/api/modules/${id}`),
  create: (projectId: string, input: ModuleCreateInput) =>
    api<{ module: ModuleSummary }>(`/api/projects/${projectId}/modules`, {
      method: 'POST',
      body: input,
    }),
  delete: (id: string) => api<void>(`/api/modules/${id}`, { method: 'DELETE' }),
};

export const fieldApi = {
  list: (moduleId: string) =>
    api<{ fields: FieldDefinition[] }>(`/api/modules/${moduleId}/fields`),
  create: (moduleId: string, input: FieldCreateInput) =>
    api<{ field: FieldDefinition }>(`/api/modules/${moduleId}/fields`, {
      method: 'POST',
      body: input,
    }),
  update: (id: string, patch: Partial<Omit<FieldCreateInput, 'slug' | 'type'>>) =>
    api<{ field: FieldDefinition }>(`/api/fields/${id}`, { method: 'PATCH', body: patch }),
  delete: (id: string) => api<void>(`/api/fields/${id}`, { method: 'DELETE' }),
};

export const recordApi = {
  list: (moduleId: string, params: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return api<{ records: RecordRow[]; total: number; limit: number; offset: number }>(
      `/api/modules/${moduleId}/records${suffix}`,
    );
  },
  get: (id: string) => api<{ record: RecordRow }>(`/api/records/${id}`),
  create: (moduleId: string, data: Record<string, unknown>) =>
    api<{ record: RecordRow }>(`/api/modules/${moduleId}/records`, {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api<{ record: RecordRow }>(`/api/records/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api<void>(`/api/records/${id}`, { method: 'DELETE' }),
};
