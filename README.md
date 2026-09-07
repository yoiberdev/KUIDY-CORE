# KUIDY-CORE

Plataforma para construir aplicaciones internas sin escribir código, al estilo
de un Odoo ligero. El usuario define proyectos, módulos y campos desde la
interfaz, y un motor genérico se encarga de renderizar los formularios y las
listas y de validar los registros.

## Demo en vivo

**https://kuidy-core-demo-164532276262.us-central1.run.app**

Alojada en Google Cloud Run (región us-central1, escala a cero) con la base de
datos en Neon. Hay una cuenta por cada nivel de permiso, todas con la
contraseña `Demo1234!`:

| Usuario | Rol | Puede |
|---|---|---|
| `owner@kuidy.demo` | Propietario | Todo, incluido gestionar miembros |
| `admin@kuidy.demo` | Administrador | Crear y modificar módulos y campos |
| `member@kuidy.demo` | Miembro | Crear y editar registros |
| `viewer@kuidy.demo` | Lector | Solo consultar |

Trae un proyecto de ejemplo, "Operaciones", con módulos de activos, órdenes de
trabajo y almacén de una planta ficticia. Los datos son inventados y cualquiera
puede modificarlos. La primera carga tras un rato tarda unos segundos porque el
servicio arranca en frío.

Para ver de qué va la plataforma, entra como propietario y crea un campo nuevo
en cualquier módulo: el formulario y la lista se adaptan solos.

## Stack

Monorepo con pnpm y TypeScript estricto.

- **API:** Hono, Drizzle ORM, PostgreSQL, zod, argon2id
- **Web:** React 19, Vite
- **Compartido:** el motor de esquemas, usado igual en cliente y servidor

## Lo interesante

- **Motor de esquemas en tiempo de ejecución.** A partir de los metadatos de
  los campos se construye un validador zod que se usa idéntico en el navegador
  y en el servidor, así que nunca se desincronizan.
- **Diseño de datos.** Los metadatos viven en tablas reales, mientras que todos
  los registros van a una sola tabla con una columna JSONB indexada con GIN.
- **Autorización por membresía** con jerarquía de roles, aplicada en cada ruta,
  con el aislamiento entre usuarios verificado.

## Desarrollo

```bash
pnpm install
pnpm -r typecheck
pnpm build
```

## Despliegue

Ver [docs/DESPLIEGUE-CLOUD-RUN.md](docs/DESPLIEGUE-CLOUD-RUN.md).
