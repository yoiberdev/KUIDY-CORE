import { z } from 'zod';

export const VIEW_TYPES = ['form', 'list'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const FORM_CELL_WIDTHS = [1, 2, 3, 4, 6, 12] as const;

const formCellSchema = z.object({
  fieldId: z.string().uuid(),
  width: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(6), z.literal(12)]),
});

const formRowSchema = z.object({
  cells: z.array(formCellSchema).min(1).max(12),
});

export const formLayoutSchema = z.object({
  rows: z.array(formRowSchema),
});

export type FormCell = z.infer<typeof formCellSchema>;
export type FormRow = z.infer<typeof formRowSchema>;
export type FormLayout = z.infer<typeof formLayoutSchema>;

export function validateLayoutForType(type: ViewType, layout: unknown):
  | { ok: true; layout: unknown }
  | { ok: false; issues: z.typeToFlattenedError<unknown> } {
  if (type === 'form') {
    const parsed = formLayoutSchema.safeParse(layout);
    if (!parsed.success) {
      return { ok: false, issues: parsed.error.flatten() };
    }
    return { ok: true, layout: parsed.data };
  }
  // list and others: no schema yet, accept as-is
  return { ok: true, layout: layout ?? {} };
}
