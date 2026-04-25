import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moduleCreateInput, type ModuleCreateInput, type ModuleSummary } from '@kuidy/shared';
import { Box, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { moduleApi } from '@/data/api';
import { ApiError } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';

interface ModuleSidebarProps {
  projectId: string;
}

export function ModuleSidebar({ projectId }: ModuleSidebarProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['modules', projectId],
    queryFn: () => moduleApi.list(projectId),
  });

  const form = useForm<ModuleCreateInput>({
    resolver: zodResolver(moduleCreateInput),
    defaultValues: { slug: '', name: '' },
  });

  const nameValue = form.watch('name');
  const slugTouched = form.formState.dirtyFields.slug;
  useEffect(() => {
    if (!slugTouched && nameValue) form.setValue('slug', slugify(nameValue));
  }, [nameValue, slugTouched, form]);

  const createMut = useMutation({
    mutationFn: (input: ModuleCreateInput) => moduleApi.create(projectId, input),
    onSuccess: () => {
      toast.success('Módulo creado');
      qc.invalidateQueries({ queryKey: ['modules', projectId] });
      setOpen(false);
      form.reset({ slug: '', name: '' });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear'),
  });

  const modules: ModuleSummary[] = data?.modules ?? [];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-muted/30">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Módulos
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {isLoading ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">Cargando…</p>
        ) : modules.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">Sin módulos aún.</p>
        ) : (
          modules.map((m) => (
            <NavLink
              key={m.id}
              to={`/p/${projectId}/m/${m.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Box className="h-4 w-4" />
              <span className="truncate">{m.name}</span>
            </NavLink>
          ))
        )}
      </nav>
      <div className="p-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Plus className="h-4 w-4" /> Nuevo módulo
            </Button>
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
                      <FormControl>
                        <Input placeholder="Clientes" autoFocus {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="clientes" {...field} />
                      </FormControl>
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
    </aside>
  );
}
