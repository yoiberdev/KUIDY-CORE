import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecordRow } from '@kuidy/shared';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FieldDesignerDrawer } from '@/components/FieldDesignerDrawer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fieldApi, moduleApi, recordApi } from '@/data/api';
import { DynamicForm } from '@/dynamic/DynamicForm';
import { DynamicList } from '@/dynamic/DynamicList';
import { ApiError } from '@/lib/api';

export function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const qc = useQueryClient();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);

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
  const noFields = fields.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{moduleQ.data?.module.name ?? '…'}</h1>
          <p className="text-xs text-muted-foreground">
            /{moduleQ.data?.module.slug} · {records.length} {records.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FieldDesignerDrawer
            moduleId={moduleId}
            fields={fields}
            trigger={
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4" /> Configurar
              </Button>
            }
          />
          <Button
            size="sm"
            disabled={noFields}
            onClick={() => {
              setEditingRecord(null);
              setRecordDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo registro
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {noFields ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Settings2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Define los campos del módulo</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Antes de capturar registros, agrega los campos que los componen. Click en "Configurar" arriba a la derecha.
            </p>
          </div>
        ) : (
          <DynamicList fields={fields} records={records} onRowClick={(r) => setEditingRecord(r)} />
        )}
      </div>

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
