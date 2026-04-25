import { Box } from 'lucide-react';

export function ModuleEmptyPage() {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <Box className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Selecciona un módulo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige uno de la barra lateral, o crea uno nuevo para empezar a definir campos y capturar registros.
        </p>
      </div>
    </div>
  );
}
