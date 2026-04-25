import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { projectApi } from '@/data/api';

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, logout } = useAuth();

  const projectQ = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId!),
    enabled: !!projectId,
  });

  if (!projectId) return null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" aria-label="Volver a proyectos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{projectQ.data?.project.name ?? '…'}</div>
          <div className="truncate text-xs text-muted-foreground">
            /{projectQ.data?.project.slug} · {projectQ.data?.project.role}
          </div>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name ?? user?.email}</span>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <Button variant="ghost" size="sm" onClick={logout}>
          Salir
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <ModuleSidebar projectId={projectId} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
