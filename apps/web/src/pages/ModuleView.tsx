import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fieldCreateInput, FIELD_TYPES, type FieldCreateInput, type RecordRow } from '@kuidy/shared';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fieldApi, moduleApi, recordApi } from '@/data/api';
import { DynamicForm } from '@/dynamic/DynamicForm';
import { DynamicList } from '@/dynamic/DynamicList';
import { ApiError } from '@/lib/api';
import { slugify } from '@/lib/slug';

export function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const qc = useQueryClient();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);

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

  const fieldForm = useForm<FieldCreateInput>({
    resolver: zodResolver(fieldCreateInput),
    defaultValues: { slug: '', name: '', type: 'text', required: false, config: {} },
  });

  const fieldNameValue = fieldForm.watch('name');
  const fieldSlugTouched = fieldForm.formState.dirtyFields.slug;
  useEffect(() => {
    if (!fieldSlugTouched && fieldNameValue) fieldForm.setValue('slug', slugify(fieldNameValue));
  }, [fieldNameValue, fieldSlugTouched, fieldForm]);

  const createField = useMutation({
    mutationFn: (input: FieldCreateInput) => fieldApi.create(moduleId!, input),
    onSuccess: () => {
      toast.success('Campo creado');
      qc.invalidateQueries({ queryKey: ['fields', moduleId] });
      setFieldDialogOpen(false);
      fieldForm.reset({ slug: '', name: '', type: 'text', required: false, config: {} });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear campo'),
  });

  const deleteField = useMutation({
    mutationFn: (id: string) => fieldApi.delete(id),
    onSuccess: () => {
      toast.success('Campo eliminado');
      qc.invalidateQueries({ queryKey: ['fields', moduleId] });
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
            <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" /> Agregar campo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar campo</DialogTitle>
                  <DialogDescription>Define un nuevo campo para este módulo.</DialogDescription>
                </DialogHeader>
                <Form {...fieldForm}>
                  <form onSubmit={fieldForm.handleSubmit((v) => createField.mutate(v))} className="space-y-4">
                    <FormField
                      control={fieldForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl><Input placeholder="Nombre del cliente" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fieldForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug</FormLabel>
                          <FormControl><Input placeholder="nombre" {...field} /></FormControl>
                          <FormDescription>Llave en JSON. Minúsculas, dígitos, guiones.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fieldForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fieldForm.control}
                      name="required"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={!!field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                          </FormControl>
                          <FormLabel className="!mt-0">Requerido</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createField.isPending}>
                      {createField.isPending ? 'Creando…' : 'Crear campo'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin campos. Agrega uno para empezar a capturar registros.
              </p>
            ) : (
              <ul className="divide-y">
                {fields.map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="ml-2 text-muted-foreground">/{f.slug} · {f.type}{f.required && ' · requerido'}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`¿Eliminar el campo "${f.name}"? Los datos en registros existentes no se borran.`)) {
                          deleteField.mutate(f.id);
                        }
                      }}
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
