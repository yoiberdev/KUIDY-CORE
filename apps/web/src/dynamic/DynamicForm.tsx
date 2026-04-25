import { zodResolver } from '@hookform/resolvers/zod';
import { buildRecordSchema, type FieldDefinition } from '@kuidy/shared';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FieldRenderer } from '@/dynamic/FieldComponents';

interface DynamicFormProps {
  fields: FieldDefinition[];
  initialValues?: Record<string, unknown>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
}

function defaultsFor(fields: FieldDefinition[], initial?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (initial && f.slug in initial) {
      out[f.slug] = initial[f.slug];
      continue;
    }
    switch (f.type) {
      case 'bool':
        out[f.slug] = false;
        break;
      default:
        out[f.slug] = null;
    }
  }
  return out;
}

export function DynamicForm({ fields, initialValues, submitting, submitLabel, onSubmit, onCancel }: DynamicFormProps) {
  const isEdit = initialValues !== undefined;
  const schema = useMemo(() => buildRecordSchema(fields, isEdit ? 'update' : 'create'), [fields, isEdit]);
  const defaults = useMemo(() => defaultsFor(fields, initialValues), [fields, initialValues]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          // Strip nulls so backend strict validation doesn't choke on optional fields set to null
          // (zod schema for optional+nullable accepts null, but the backend's create schema rejects unknown
          // keys; we just pass through what zod parsed)
          onSubmit(values);
        })}
        className="space-y-4"
      >
        {fields.map((f) => (
          <FormField
            key={f.id}
            control={form.control}
            name={f.slug}
            render={({ field: rhf }) => (
              <FormItem>
                <FormLabel>
                  {f.name}
                  {f.required && <span className="text-destructive"> *</span>}
                </FormLabel>
                <FormControl>
                  <FieldRenderer field={f} rhf={rhf} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : (submitLabel ?? 'Guardar')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
