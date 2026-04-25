import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FieldCreateInput, FieldDefinition } from '@kuidy/shared';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { fieldApi } from '@/data/api';
import { FieldFormDialog } from '@/components/FieldFormDialog';
import { FieldTypeIcon, fieldTypeLabel } from '@/dynamic/FieldTypeIcon';
import { ApiError } from '@/lib/api';

interface FieldDesignerDrawerProps {
  moduleId: string;
  fields: FieldDefinition[];
  trigger: ReactNode;
}

export function FieldDesignerDrawer({ moduleId, fields, trigger }: FieldDesignerDrawerProps) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fields', moduleId] });

  const createMut = useMutation({
    mutationFn: (input: FieldCreateInput) => fieldApi.create(moduleId, input),
    onSuccess: () => {
      toast.success('Campo creado');
      invalidate();
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear campo'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Omit<FieldCreateInput, 'slug' | 'type'>> }) =>
      fieldApi.update(vars.id, vars.patch),
    onSuccess: () => {
      toast.success('Campo actualizado');
      invalidate();
      setFormOpen(false);
      setEditingField(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fieldApi.delete(id),
    onSuccess: () => {
      toast.success('Campo eliminado');
      invalidate();
    },
  });

  const swapPositions = async (a: FieldDefinition, b: FieldDefinition) => {
    try {
      await Promise.all([
        fieldApi.update(a.id, { position: b.position }),
        fieldApi.update(b.id, { position: a.position }),
      ]);
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al reordenar');
    }
  };

  const handleSubmit = (values: FieldCreateInput) => {
    if (editingField) {
      updateMut.mutate({
        id: editingField.id,
        patch: { name: values.name, required: values.required, config: values.config },
      });
    } else {
      createMut.mutate(values);
    }
  };

  return (
    <>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Campos del módulo</SheetTitle>
            <SheetDescription>Define qué información captura cada registro.</SheetDescription>
          </SheetHeader>

          <div className="-mx-6 mt-4 flex-1 overflow-y-auto px-6">
            {fields.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin campos aún. Agrega el primero.
              </p>
            ) : (
              <ul className="space-y-1">
                {fields.map((f, idx) => {
                  const prev = fields[idx - 1];
                  const next = fields[idx + 1];
                  return (
                    <li
                      key={f.id}
                      className="group flex items-center gap-2 rounded-md border bg-card p-2 text-sm"
                    >
                      <FieldTypeIcon type={f.type} className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{f.name}</span>
                          {f.required && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-destructive">
                              Req
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          /{f.slug} · {fieldTypeLabel(f.type)}
                        </div>
                      </div>
                      <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!prev}
                          onClick={() => prev && swapPositions(f, prev)}
                          aria-label="Mover arriba"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!next}
                          onClick={() => next && swapPositions(f, next)}
                          aria-label="Mover abajo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingField(f);
                            setFormOpen(true);
                          }}
                          aria-label="Editar campo"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`¿Eliminar el campo "${f.name}"? Los datos en registros existentes no se borran.`)) {
                              deleteMut.mutate(f.id);
                            }
                          }}
                          aria-label="Eliminar campo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="-mx-6 mt-4 border-t px-6 pt-4">
            <Button
              className="w-full"
              onClick={() => {
                setEditingField(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Agregar campo
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <FieldFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingField(null);
        }}
        field={editingField}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}
