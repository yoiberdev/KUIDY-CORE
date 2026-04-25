import { z } from 'zod';
import type { Field } from '../db/schema.js';

interface SelectOption {
  value: string;
  label: string;
}

function fieldValidator(field: Field): z.ZodTypeAny {
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
      const opts = ((field.config as { options?: SelectOption[] })?.options ?? []).map((o) => o.value);
      if (opts.length === 0) return z.string();
      return z.enum(opts as [string, ...string[]]);
    }
    default:
      return z.unknown();
  }
}

/**
 * Build a zod schema for a record's `data` payload from a module's fields.
 * - mode 'create': required fields must be present; optional fields nullable.
 * - mode 'update': all fields optional (partial patch).
 */
export function buildRecordSchema(fields: Field[], mode: 'create' | 'update'): z.ZodObject<z.ZodRawShape> {
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
