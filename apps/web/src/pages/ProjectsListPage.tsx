import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectCreateInput, type ProjectCreateInput } from '@kuidy/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
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
import { Textarea } from '@/components/ui/textarea';
import { projectApi } from '@/data/api';
import { ApiError } from '@/lib/api';

export function ProjectsListPage() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  });

  const form = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateInput),
    defaultValues: { slug: '', name: '', description: '' },
  });

  const createMut = useMutation({
    mutationFn: (input: ProjectCreateInput) => projectApi.create(input),
    onSuccess: () => {
      toast.success('Proyecto creado');
      qc.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear');
    },
  });

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">{user?.name ?? user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nuevo proyecto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear proyecto</DialogTitle>
                <DialogDescription>Un proyecto agrupa módulos, campos y registros.</DialogDescription>
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
                          <Input placeholder="Ferretería Demo" {...field} />
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
                          <Input placeholder="ferreteria-demo" {...field} />
                        </FormControl>
                        <FormDescription>Minúsculas, dígitos y guiones. Identificador único del proyecto.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
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
          <Button variant="outline" onClick={logout}>
            Salir
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : !data || data.projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes proyectos. Crea el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.map((p) => (
            <Link key={p.id} to={`/p/${p.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <CardDescription>/{p.slug} · {p.role}</CardDescription>
                </CardHeader>
                {p.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
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
