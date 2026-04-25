import type { FieldType } from '@kuidy/shared';
import {
  AlignLeft,
  Calendar,
  CalendarClock,
  CircleHelp,
  Hash,
  ListChecks,
  ToggleRight,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<FieldType, LucideIcon> = {
  text: AlignLeft,
  number: Hash,
  date: Calendar,
  datetime: CalendarClock,
  bool: ToggleRight,
  select: ListChecks,
};

const LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  datetime: 'Fecha y hora',
  bool: 'Sí / No',
  select: 'Selección',
};

export function FieldTypeIcon({ type, className }: { type: FieldType; className?: string }) {
  const Icon = ICONS[type] ?? CircleHelp;
  return <Icon className={className} />;
}

export function fieldTypeLabel(type: FieldType): string {
  return LABELS[type] ?? type;
}
