import type { FieldDefinition, RecordRow } from '@kuidy/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFieldValue } from '@/dynamic/FieldComponents';

interface DynamicListProps {
  fields: FieldDefinition[];
  records: RecordRow[];
  onRowClick?: (record: RecordRow) => void;
}

export function DynamicList({ fields, records, onRowClick }: DynamicListProps) {
  if (records.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sin registros aún.</p>;
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((f) => (
              <TableHead key={f.id}>{f.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow
              key={r.id}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={() => onRowClick?.(r)}
            >
              {fields.map((f) => (
                <TableCell key={f.id}>{formatFieldValue(f, (r.data as Record<string, unknown>)[f.slug])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
