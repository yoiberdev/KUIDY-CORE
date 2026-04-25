import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moduleCreateInput, type ModuleCreateInput } from '@kuidy/shared';
import { ArrowLeft, Plus, Box } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { moduleApi, projectApi } from '@/data/api';
import { ApiError } from '@/lib/api';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId!),
    enabled: !!projectId,
  });

  const modulesQ = useQuery({
    queryKey: ['modules', projectId],
    queryFn: () => moduleApi.list(projectId!),
    enabled: !!projectId,
  });

  const form = useForm<ModuleCreateInput>({
    resolver: zodResolver(moduleCreateInput),
    defaultValues: { slug: '', name: '', icon: '' },
  });

  const createMut = useMutation({
    mutationFn: (input: ModuleCreateInput) => moduleApi.create(projectId!, input),
    onSuccess: () => {
      toast.success('Módulo creado');
      qc.invalidateQueries({ queryKey: ['modules', projectId] });
      setOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear'),
  });

  if (!projectId) return null;

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.data?.project.name ?? '…'}</h1>
          <p className="text-sm text-muted-foreground">/{project.data?.project.slug}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus /> Nuevo módulo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear módulo</DialogTitle>
              <DialogDescription>Un módulo es una tabla con sus campos y registros.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl><Input placeholder="Clientes" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl><Input placeholder="clientes" {...field} /></FormControl>
                      <FormDescription>Identificador único dentro del proyecto.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? 'Creando…' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {modulesQ.isLoading ? (
        <p className="text-muted-foreground">Cargando módulos…</p>
      ) : !modulesQ.data || modulesQ.data.modules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Sin módulos aún. Crea el primero para empezar a definir campos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulesQ.data.modules.map((m) => (
            <Link key={m.id} to={`/p/${projectId}/m/${m.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Box className="h-5 w-5" /> {m.name}
                  </CardTitle>
                  <CardDescription>/{m.slug}</CardDescription>
                </CardHeader>
                {m.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
