import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FieldCreateInput, FieldDefinition, RecordRow } from '@kuidy/shared';
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FieldFormDialog } from '@/components/FieldFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fieldApi, moduleApi, recordApi } from '@/data/api';
import { DynamicForm } from '@/dynamic/DynamicForm';
import { DynamicList } from '@/dynamic/DynamicList';
import { FieldTypeIcon, fieldTypeLabel } from '@/dynamic/FieldTypeIcon';
import { ApiError } from '@/lib/api';

export function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const qc = useQueryClient();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);

  const moduleQ = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => moduleApi.get(moduleId!),
    enabled: !!moduleId,
  });
  const fieldsQ = useQuery({
    queryKey: ['fields', moduleId],
    queryFn: () => fieldApi.list(moduleId!),
    enabled: !!moduleId,
  });
  const recordsQ = useQuery({
    queryKey: ['records', moduleId],
    queryFn: () => recordApi.list(moduleId!),
    enabled: !!moduleId,
  });

  const invalidateFields = () => qc.invalidateQueries({ queryKey: ['fields', moduleId] });

  const createField = useMutation({
    mutationFn: (input: FieldCreateInput) => fieldApi.create(moduleId!, input),
    onSuccess: () => {
      toast.success('Campo creado');
      invalidateFields();
      setFieldDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear campo'),
  });

  const updateField = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Omit<FieldCreateInput, 'slug' | 'type'>> }) =>
      fieldApi.update(vars.id, vars.patch),
    onSuccess: () => {
      toast.success('Campo actualizado');
      invalidateFields();
      setFieldDialogOpen(false);
      setEditingField(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al actualizar campo'),
  });

  const deleteField = useMutation({
    mutationFn: (id: string) => fieldApi.delete(id),
    onSuccess: () => {
      toast.success('Campo eliminado');
      invalidateFields();
    },
  });

  const createRecord = useMutation({
    mutationFn: (data: Record<string, unknown>) => recordApi.create(moduleId!, data),
    onSuccess: () => {
      toast.success('Registro creado');
      qc.invalidateQueries({ queryKey: ['records', moduleId] });
      setRecordDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear registro'),
  });

  const updateRecord = useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) => recordApi.update(vars.id, vars.data),
    onSuccess: () => {
      toast.success('Registro actualizado');
      qc.invalidateQueries({ queryKey: ['records', moduleId] });
      setEditingRecord(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al actualizar'),
  });

  const deleteRecord = useMutation({
    mutationFn: (id: string) => recordApi.delete(id),
    onSuccess: () => {
      toast.success('Registro eliminado');
      qc.invalidateQueries({ queryKey: ['records', moduleId] });
      setEditingRecord(null);
    },
  });

  if (!moduleId) return null;

  const fields = fieldsQ.data?.fields ?? [];
  const records = recordsQ.data?.records ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{moduleQ.data?.module.name ?? '…'}</h1>
          <p className="text-xs text-muted-foreground">
            /{moduleQ.data?.module.slug} · {records.length} {records.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        <Button
          size="sm"
          disabled={fields.length === 0}
          onClick={() => {
            setEditingRecord(null);
            setRecordDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo registro
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" /> Campos del módulo
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingField(null);
                setFieldDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Agregar campo
            </Button>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin campos. Agrega uno para empezar a capturar registros.
              </p>
            ) : (
              <ul className="divide-y">
                {fields.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 py-2 text-sm">
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingField(f);
                        setFieldDialogOpen(true);
                      }}
                      aria-label="Editar campo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`¿Eliminar el campo "${f.name}"? Los datos en registros existentes no se borran.`)) {
                          deleteField.mutate(f.id);
                        }
                      }}
                      aria-label="Eliminar campo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registros ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Define al menos un campo para poder capturar registros.</p>
            ) : (
              <DynamicList fields={fields} records={records} onRowClick={(r) => setEditingRecord(r)} />
            )}
          </CardContent>
        </Card>
      </div>

      <FieldFormDialog
        open={fieldDialogOpen}
        onOpenChange={(o) => {
          setFieldDialogOpen(o);
          if (!o) setEditingField(null);
        }}
        field={editingField}
        submitting={createField.isPending || updateField.isPending}
        onSubmit={(values) => {
          if (editingField) {
            updateField.mutate({
              id: editingField.id,
              patch: { name: values.name, required: values.required, config: values.config },
            });
          } else {
            createField.mutate(values);
          }
        }}
      />

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo registro</DialogTitle>
          </DialogHeader>
          <DynamicForm
            fields={fields}
            submitting={createRecord.isPending}
            onSubmit={(v) => createRecord.mutate(v)}
            onCancel={() => setRecordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(o) => !o && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <>
              <DynamicForm
                fields={fields}
                initialValues={editingRecord.data as Record<string, unknown>}
                submitting={updateRecord.isPending}
                submitLabel="Guardar cambios"
                onSubmit={(v) => updateRecord.mutate({ id: editingRecord.id, data: v })}
                onCancel={() => setEditingRecord(null)}
              />
              <div className="border-t pt-3 mt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Eliminar este registro?')) deleteRecord.mutate(editingRecord.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar registro
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
