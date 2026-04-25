import { zodResolver } from '@hookform/resolvers/zod';
import {
  fieldCreateInput,
  FIELD_TYPES,
  type FieldCreateInput,
  type FieldDefinition,
  type FieldType,
  type SelectOption,
} from '@kuidy/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FieldTypeIcon, fieldTypeLabel } from '@/dynamic/FieldTypeIcon';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';

interface FieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog opens in edit mode (slug + type are locked). */
  field?: FieldDefinition | null;
  submitting?: boolean;
  onSubmit: (values: FieldCreateInput) => void;
}

interface FieldFormValues {
  slug: string;
  name: string;
  type: FieldType;
  required: boolean;
  options: SelectOption[];
}

const emptyDefaults: FieldFormValues = {
  slug: '',
  name: '',
  type: 'text',
  required: false,
  options: [],
};

export function FieldFormDialog({ open, onOpenChange, field, submitting, onSubmit }: FieldFormDialogProps) {
  const isEdit = !!field;

  const form = useForm<FieldFormValues>({
    defaultValues: emptyDefaults,
    resolver: zodResolver(
      fieldCreateInput.transform((v) => v).pipe(fieldCreateInput),
    ),
  });

  useEffect(() => {
    if (!open) return;
    if (field) {
      form.reset({
        slug: field.slug,
        name: field.name,
        type: field.type,
        required: field.required,
        options: (field.config.options as SelectOption[] | undefined) ?? [],
      });
    } else {
      form.reset(emptyDefaults);
    }
  }, [open, field, form]);

  const nameValue = form.watch('name');
  const slugTouched = form.formState.dirtyFields.slug;
  useEffect(() => {
    if (!isEdit && !slugTouched && nameValue) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, slugTouched, isEdit, form]);

  const typeValue = form.watch('type');

  const optionsArray = useFieldArray({ control: form.control, name: 'options' });

  const handleSubmit = form.handleSubmit((values) => {
    const payload: FieldCreateInput = {
      slug: values.slug,
      name: values.name,
      type: values.type,
      required: values.required,
      config: values.type === 'select' ? { options: values.options } : {},
    };
    onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar campo' : 'Agregar campo'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'El slug y el tipo no se pueden cambiar (afectan datos ya capturados).'
              : 'Define el campo. Tipo y slug se fijan al crear.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field: rhf }) => (
                <FormItem>
                  <FormLabel>Nombre visible</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" autoFocus {...rhf} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field: rhf }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="nombre" disabled={isEdit} {...rhf} />
                  </FormControl>
                  <FormDescription>Llave en JSON. Minúsculas, dígitos, guiones.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field: rhf }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {FIELD_TYPES.map((t) => {
                        const selected = rhf.value === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={isEdit}
                            onClick={() => rhf.onChange(t)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors',
                              selected
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                              isEdit && !selected && 'opacity-40',
                            )}
                          >
                            <FieldTypeIcon type={t} className="h-5 w-5" />
                            <span>{fieldTypeLabel(t)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required"
              render={({ field: rhf }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Requerido</FormLabel>
                    <FormDescription>El registro no se puede guardar sin este campo.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={rhf.value} onCheckedChange={rhf.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {typeValue === 'select' && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Opciones</div>
                    <div className="text-xs text-muted-foreground">
                      Cada opción es un par <code>value</code> / <code>label</code>.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => optionsArray.append({ value: '', label: '' })}
                  >
                    <Plus className="h-4 w-4" /> Agregar opción
                  </Button>
                </div>
                {optionsArray.fields.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Sin opciones aún. Agrega al menos una.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {optionsArray.fields.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Input
                          placeholder="value (ej. alta)"
                          {...form.register(`options.${idx}.value` as const, {
                            onChange: (e) => {
                              const labelDirty = form.getFieldState(`options.${idx}.label` as const).isDirty;
                              if (!labelDirty) form.setValue(`options.${idx}.label` as const, e.target.value);
                            },
                          })}
                        />
                        <Input
                          placeholder="label visible"
                          {...form.register(`options.${idx}.label` as const)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => optionsArray.remove(idx)}
                          aria-label="Eliminar opción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear campo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
