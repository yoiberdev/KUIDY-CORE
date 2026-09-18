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

Trae dos proyectos de ejemplo: "Operaciones", con activos, órdenes de trabajo y
almacén de una planta ficticia, y "Soporte", con tickets y clientes. Los datos
son inventados y cualquiera puede modificarlos. La primera carga tras un rato
tarda unos segundos porque el servicio arranca en frío.

Para ver de qué va la plataforma, entra como propietario y abre el diseñador de
campos de cualquier módulo: añade un campo y el formulario y la lista se adaptan
solos, sin recargar ni tocar código.

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
- **Diseñador de campos en un cajón lateral.** Se crean, editan, reordenan y
  borran los campos de un módulo sin salir de sus datos, con selector de tipo y
  editor de opciones para los desplegables.
- **Navegación por módulos siempre a la vista.** Una barra lateral acompaña al
  proyecto entero y permite crear un módulo desde cualquier pantalla.
- **Vistas guardadas.** Un módulo puede tener varias vistas (`form`, `list`)
  con su propia disposición en filas y columnas, guardada en la tabla `views` y
  validada en el servidor según el tipo de vista. Por ahora vive en el modelo de
  datos y en la API; la interfaz todavía no las expone, así que en la demo no se
  ven.

## Desarrollo

```bash
pnpm install
pnpm typecheck
pnpm build
```

La imagen de Docker compila el monorepo entero y deja la web construida junto a
la API, de modo que un solo contenedor sirve las dos cosas en el mismo origen.

## Despliegue

Ver [docs/DESPLIEGUE-CLOUD-RUN.md](docs/DESPLIEGUE-CLOUD-RUN.md).
