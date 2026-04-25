import type { FieldDefinition } from '@kuidy/shared';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldRendererProps {
  field: FieldDefinition;
  rhf: ControllerRenderProps<FieldValues, string>;
}

export function FieldRenderer({ field, rhf }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          placeholder={field.config.placeholder}
          value={(rhf.value as string | null | undefined) ?? ''}
          onChange={(e) => rhf.onChange(e.target.value === '' ? null : e.target.value)}
          onBlur={rhf.onBlur}
          name={rhf.name}
          ref={rhf.ref}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          placeholder={field.config.placeholder}
          value={rhf.value === undefined || rhf.value === null ? '' : String(rhf.value)}
          onChange={(e) => rhf.onChange(e.target.value === '' ? null : Number(e.target.value))}
          onBlur={rhf.onBlur}
          name={rhf.name}
          ref={rhf.ref}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={(rhf.value as string | null | undefined) ?? ''}
          onChange={(e) => rhf.onChange(e.target.value === '' ? null : e.target.value)}
          onBlur={rhf.onBlur}
          name={rhf.name}
          ref={rhf.ref}
        />
      );

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={(() => {
            const v = rhf.value as string | null | undefined;
            if (!v) return '';
            // strip seconds and timezone for datetime-local input
            return v.slice(0, 16);
          })()}
          onChange={(e) => {
            const v = e.target.value;
            rhf.onChange(v === '' ? null : new Date(v).toISOString());
          }}
          onBlur={rhf.onBlur}
          name={rhf.name}
          ref={rhf.ref}
        />
      );

    case 'bool':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!rhf.value}
            onCheckedChange={(c) => rhf.onChange(c === true)}
            name={rhf.name}
          />
          <span className="text-sm text-muted-foreground">{field.config.helpText ?? 'Activo'}</span>
        </div>
      );

    case 'select': {
      const opts = field.config.options ?? [];
      return (
        <Select
          value={(rhf.value as string | null | undefined) ?? ''}
          onValueChange={(v) => rhf.onChange(v === '' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.config.placeholder ?? 'Selecciona…'} />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    default:
      return <Input value="" disabled placeholder={`Tipo no soportado: ${field.type}`} />;
  }
}

export function formatFieldValue(field: FieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (field.type) {
    case 'bool':
      return value ? 'Sí' : 'No';
    case 'datetime':
      return new Date(String(value)).toLocaleString();
    case 'date':
      return String(value);
    case 'select': {
      const opt = (field.config.options ?? []).find((o) => o.value === value);
      return opt ? opt.label : String(value);
    }
    case 'number':
      return String(value);
    case 'text':
    default:
      return String(value);
  }
}
