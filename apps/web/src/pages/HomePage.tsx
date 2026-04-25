import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function HomePage() {
  const { user, logout } = useAuth();
  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KUIDY-CORE</h1>
          <p className="text-muted-foreground">Hola, {user?.name ?? user?.email}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bienvenido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Próximo paso: lista de proyectos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
