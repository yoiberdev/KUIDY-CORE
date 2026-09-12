import { z } from 'zod';
import type { FieldDefinition } from './types.js';

export const VIEW_TYPES = ['form', 'list'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const FORM_CELL_WIDTHS = [1, 2, 3, 4, 6, 12] as const;
export type FormCellWidth = (typeof FORM_CELL_WIDTHS)[number];

export const formCellSchema = z.object({
  fieldId: z.string().uuid(),
  width: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(6), z.literal(12)]),
});
export type FormCell = z.infer<typeof formCellSchema>;

export const formRowSchema = z.object({
  cells: z.array(formCellSchema).min(1).max(12),
});
export type FormRow = z.infer<typeof formRowSchema>;

export const formLayoutSchema = z.object({
  rows: z.array(formRowSchema),
});
export type FormLayout = z.infer<typeof formLayoutSchema>;

export interface ViewSummary {
  id: string;
  moduleId: string;
  type: ViewType;
  name: string;
  layout: FormLayout | Record<string, unknown>;
  isDefault: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a fallback FormLayout when none has been authored yet:
 * one cell per field, full width (12), in field's natural order.
 */
export function defaultFormLayout(fields: FieldDefinition[]): FormLayout {
  return {
    rows: fields.map((f) => ({
      cells: [{ fieldId: f.id, width: 12 as FormCellWidth }],
    })),
  };
}

/**
 * Strip any cells whose fieldId no longer matches a real field.
 * Useful when a field is deleted but the layout still references it.
 */
export function pruneLayout(layout: FormLayout, fields: FieldDefinition[]): FormLayout {
  const valid = new Set(fields.map((f) => f.id));
  return {
    rows: layout.rows
      .map((r) => ({ cells: r.cells.filter((c) => valid.has(c.fieldId)) }))
      .filter((r) => r.cells.length > 0),
  };
}

/**
 * Append fields not yet present in the layout as full-width rows at the end.
 * Useful when a new field is added but isn't placed in the layout yet.
 */
export function appendMissingFields(layout: FormLayout, fields: FieldDefinition[]): FormLayout {
  const placed = new Set<string>();
  for (const r of layout.rows) for (const c of r.cells) placed.add(c.fieldId);
  const missing = fields.filter((f) => !placed.has(f.id));
  if (missing.length === 0) return layout;
  return {
    rows: [
      ...layout.rows,
      ...missing.map((f) => ({ cells: [{ fieldId: f.id, width: 12 as FormCellWidth }] })),
    ],
  };
}
