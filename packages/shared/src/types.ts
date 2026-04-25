export const FIELD_TYPES = ['text', 'number', 'date', 'datetime', 'bool', 'select'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  options?: SelectOption[];
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  [k: string]: unknown;
}

export interface FieldDefinition {
  id: string;
  moduleId: string;
  slug: string;
  name: string;
  type: FieldType;
  required: boolean;
  config: FieldConfig;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleSummary {
  id: string;
  projectId: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  role?: Role;
}

export interface RecordRow {
  id: string;
  projectId: string;
  moduleId: string;
  data: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}
