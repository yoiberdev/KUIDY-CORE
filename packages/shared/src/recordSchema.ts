import { z } from 'zod';
import type { FieldDefinition, SelectOption } from './types.js';

function fieldValidator(field: FieldDefinition): z.ZodTypeAny {
  switch (field.type) {
    case 'text':
      return z.string().max(10000);
    case 'number':
      return z.number().finite();
    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
    case 'datetime':
      return z.string().datetime();
    case 'bool':
      return z.boolean();
    case 'select': {
      const opts = (field.config?.options as SelectOption[] | undefined ?? []).map((o) => o.value);
      if (opts.length === 0) return z.string();
      return z.enum(opts as [string, ...string[]]);
    }
    default:
      return z.unknown();
  }
}

/**
 * Build a zod schema for a record's `data` payload from a module's field definitions.
 * Used by both the API (server-side validation) and the web (client-side react-hook-form).
 */
export function buildRecordSchema(
  fields: FieldDefinition[],
  mode: 'create' | 'update',
): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const f of fields) {
    let v = fieldValidator(f);
    if (mode === 'update') {
      v = v.optional();
    } else if (!f.required) {
      v = v.nullable().optional();
    }
    shape[f.slug] = v;
  }
  return z.object(shape).strict();
}
