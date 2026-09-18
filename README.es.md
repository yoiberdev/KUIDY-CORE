# KUIDY-CORE

*[Read this in English](README.md)*

**Defines un campo y el formulario ya existe.**

Plataforma para montar aplicaciones internas sin escribir código, al estilo de un Odoo ligero: se crean proyectos, módulos y campos desde la interfaz, y un motor genérico pinta el formulario y la lista, valida lo que se escribe y lo guarda.

![Crear un campo y verlo aparecer en el formulario](docs/kuidy-campo-nuevo.gif)

## Pruébalo

**https://kuidy-core-demo-164532276262.us-central1.run.app**

Entra como `owner@kuidy.demo`, abre el módulo **Activos**, pulsa **Agregar campo** y luego **Nuevo registro**. Eso es el producto entero en medio minuto.

Una cuenta por cada nivel de permiso, todas con la contraseña `Demo1234!`:

| Cuenta | Rol | Puede |
|---|---|---|
| `owner@kuidy.demo` | Propietario | Todo, incluido gestionar miembros |
| `admin@kuidy.demo` | Administrador | Crear y modificar módulos y campos |
| `member@kuidy.demo` | Miembro | Crear y editar registros |
| `viewer@kuidy.demo` | Lector | Solo consultar |

Trae dos proyectos de ejemplo: *Operaciones*, con activos, órdenes de trabajo y almacén de una planta ficticia, y *Soporte*, con tickets y clientes. Los datos son inventados y cualquiera puede cambiarlos. Corre en Google Cloud Run y escala a cero, así que la primera carga tras un rato tarda unos segundos.

## Por qué existe

Cada empresa pide el mismo sistema con otro formulario: otros campos, otras reglas, otra pantalla. Programar ese formulario una vez por cliente es trabajo que no se acumula. KUIDY-CORE guarda la **definición** de cada módulo y deja que el motor haga el resto, así que lo que se acumula es la plataforma.

## Cómo funciona

- **La definición y los datos van por separado.** Proyectos, módulos y campos viven en tablas normales de PostgreSQL. Los registros, en una sola tabla con una columna `jsonb` y su índice GIN, así que añadir un campo no toca el esquema de la base.
- **El validador se construye en tiempo de ejecución.** Con la definición de campos de un módulo se arma un esquema de Zod, y ese mismo esquema se construye en el navegador, para avisar mientras se escribe, y en la API, que es la que manda.
- **El formulario y la lista salen de esa misma definición**: cada tipo de campo trae su control y su columna.
- **El acceso es por proyecto.** Contraseñas con argon2id, sesión en un JWT de siete días y cuatro papeles —propietario, administrador, miembro y lector— comprobados en cada ruta. Quien no puede escribir recibe el no del servidor, no de la interfaz.
- **El diseñador de campos vive en un cajón lateral**: se crean, editan, reordenan y borran sin salir de los datos, con selector de tipo y editor de opciones para los desplegables.

## Tipos de campo

`text` · `number` · `date` · `datetime` · `bool` · `select`

Cada uno con su validación —los números son finitos, las fechas tienen forma de fecha, un desplegable solo acepta sus opciones— y su control en el formulario.

## Pila

Monorepo con pnpm y TypeScript estricto.

- **API:** Hono, Drizzle ORM, PostgreSQL, Zod, argon2id
- **Web:** React 19, Vite
- **Compartido:** los tipos y el constructor del esquema

## Arrancarlo en local

Node 20 o superior, pnpm 9 o superior y Docker.

```bash
cp .env.example .env                      # DATABASE_URL y JWT_SECRET son obligatorios
pnpm install
pnpm db:up                                # PostgreSQL en un contenedor
pnpm --filter @kuidy/shared build         # el resto del monorepo importa su dist
pnpm --filter @kuidy/api db:migrate       # migraciones
pnpm dev                                  # API y web a la vez
```

La imagen de Docker compila el monorepo entero y deja la web construida junto a la API, de modo que un solo contenedor sirve las dos cosas en el mismo origen. Despliegue: [docs/DESPLIEGUE-CLOUD-RUN.md](docs/DESPLIEGUE-CLOUD-RUN.md).

## Alcance, sin adornos

Lo que hay está terminado y probado a mano; lo que falta, falta entero.

- **Todavía no hay relaciones entre módulos**: los campos guardan valores, no referencias.
- **El tipo de un campo no se cambia** una vez creado, ni se renombra su clave. Antes hay que decidir qué pasa con los datos ya guardados, y eso es lo siguiente.
- **No hay búsqueda, filtros ni informes**; el listado pagina y ordena.
- **Las vistas guardadas** (`form`, `list`, con su disposición en filas y columnas) viven en el modelo de datos y en la API, validadas en el servidor, pero la interfaz todavía no las expone, así que en la demo no se ven.
- **No hay pruebas automáticas ni integración continua.** Es la primera deuda de la lista.

## Hoja de ruta

1. Evolución de esquema: cambiar el tipo de un campo con datos dentro, con informe de lo que se convierte y lo que no.
2. Relaciones entre módulos.
3. Invitar miembros y cambiar papeles desde la interfaz.
4. Búsqueda y filtros sobre los datos.
5. Pruebas del motor de esquemas e integración continua.
