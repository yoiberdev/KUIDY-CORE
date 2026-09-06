# Despliegue de KUIDY-CORE como demo pública en Google Cloud Run

Una sola imagen sirve el frontend (React + Vite) y la API (Hono) **en el mismo
origen** y escucha en `$PORT`. La base de datos vive **fuera** del contenedor
(PostgreSQL gestionado en Neon), porque Cloud Run no tiene disco persistente.

```
navegador ──► Cloud Run (1 contenedor)          ──► Neon (PostgreSQL)
                ├── GET /            → index.html (SPA)
                ├── GET /assets/*    → JS/CSS con hash, cache inmutable
                ├── /auth/*, /api/*  → Hono
                └── GET /health      → sonda de vida + ping a la BD
```

Rutas de API inexistentes devuelven **404 JSON**, nunca el `index.html`: si
devolviesen HTML con 200, un `fetch` mal escrito fallaría en silencio.

---

## 1. Base de datos en Neon

1. Crea un proyecto en <https://neon.tech> (región cercana a la de Cloud Run).
2. Copia la cadena de conexión del *pooler*, con este aspecto:

   ```
   postgresql://USUARIO:CONTRASENA@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```

   El `?sslmode=require` es importante: `DATABASE_SSL=auto` (por defecto) lo lee
   de la URL y activa TLS. Sin él la conexión se intentaría en claro y Neon la
   rechazaría.

No hace falta ejecutar nada a mano: el contenedor aplica las migraciones al
arrancar (`RUN_MIGRATIONS=true` viene puesto en la imagen).

## 2. Variables de entorno

| Variable | Obligatoria | Valor para la demo | Para qué sirve |
|---|---|---|---|
| `DATABASE_URL` | **sí** | cadena de Neon con `?sslmode=require` | conexión a PostgreSQL |
| `JWT_SECRET` | **sí** | 32+ caracteres aleatorios | firma de los JWT; el arranque falla si es más corto |
| `PORT` | la pone Cloud Run | `8080` | puerto de escucha (tiene prioridad sobre `API_PORT`) |
| `NODE_ENV` | no | `production` (ya en la imagen) | activa la caché de estáticos en memoria |
| `RUN_MIGRATIONS` | no | `true` (ya en la imagen) | migra antes de escuchar, bajo *advisory lock* |
| `SEED_DEMO` | para la demo | `true` | crea proyectos, módulos, campos, registros y las 4 cuentas demo |
| `DEMO_PASSWORD` | no | `Demo1234!` | contraseña de las cuentas demo |
| `DATABASE_SSL` | no | `auto` | `auto` \| `require` \| `no-verify` \| `disable` |
| `DB_POOL_MAX` | no | `5` | conexiones por instancia (ojo con el límite de Neon) |
| `CORS_ORIGINS` | no | vacío | orígenes extra; una demo en el mismo origen no necesita ninguno |
| `WEB_ROOT` | no | vacío | ruta al frontend compilado; por defecto `../public` junto a `dist/` |

Genera el secreto con:

```bash
openssl rand -base64 48
```

## 3. Desplegar

```bash
PROJECT=tu-proyecto-gcp
REGION=us-central1
SERVICE=kuidy-core-demo

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Guardar los secretos en Secret Manager (recomendado)
printf '%s' 'postgresql://...neon.tech/neondb?sslmode=require' | \
  gcloud secrets create kuidy-database-url --data-file=-
openssl rand -base64 48 | tr -d '\n' | \
  gcloud secrets create kuidy-jwt-secret --data-file=-

# Construir y desplegar desde el código fuente (usa el Dockerfile del repo)
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 3 \
  --set-env-vars NODE_ENV=production,RUN_MIGRATIONS=true,SEED_DEMO=true \
  --set-secrets DATABASE_URL=kuidy-database-url:latest,JWT_SECRET=kuidy-jwt-secret:latest
```

Alternativa construyendo la imagen a mano:

```bash
gcloud artifacts repositories create demos --repository-format=docker --location="$REGION"
IMG="$REGION-docker.pkg.dev/$PROJECT/demos/$SERVICE:$(date +%Y%m%d-%H%M)"
docker build -t "$IMG" .
docker push "$IMG"
gcloud run deploy "$SERVICE" --image "$IMG" --region "$REGION" --allow-unauthenticated ...
```

Después del primer despliegue puedes poner `SEED_DEMO=false`: el seed es
idempotente, pero dejarlo activo hace que cada arranque en frío vuelva a
comprobar los datos.

## 4. Cuentas de la demo

Se crean con `SEED_DEMO=true`. **Contraseña de todas: `Demo1234!`**

| Rol | Correo | Puede |
|---|---|---|
| owner | `owner@kuidy.demo` | todo, incluido borrar el proyecto |
| admin | `admin@kuidy.demo` | crear/editar módulos y campos |
| member | `member@kuidy.demo` | crear y editar registros |
| viewer | `viewer@kuidy.demo` | solo lectura |

Datos sembrados (todos ficticios): proyecto **Operaciones (demo)** con los
módulos Activos, Órdenes de trabajo y Productos de almacén, y proyecto
**Soporte (demo)** con Tickets y Clientes.

El seed solo rellena un módulo que esté vacío, así que lo que cree un visitante
sobrevive a los reinicios. Para volver al estado inicial, vacía la tabla
`records` en Neon y reinicia el servicio.

## 5. Comprobaciones tras desplegar

```bash
URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')

curl -s -o /dev/null -w '%{http_code}\n' "$URL/"          # 200 (index.html)
curl -s "$URL/health"                                      # {"status":"ok","db":"connected",...}
curl -s -o /dev/null -w '%{http_code}\n' "$URL/api/nope"   # 404 (JSON, no el index)
curl -s -X POST "$URL/auth/login" -H 'Content-Type: application/json' \
     -d '{"email":"owner@kuidy.demo","password":"Demo1234!"}'   # user + token
```

## 6. Notas de operación

- **Migraciones concurrentes**: el arranque toma `pg_advisory_lock` en una
  conexión propia, así que varias instancias arrancando a la vez no compiten por
  la tabla de migraciones de drizzle.
- **Conexiones**: cada instancia abre hasta `DB_POOL_MAX` (5). Con
  `--max-instances 3` son 15 conexiones; usa el endpoint *pooler* de Neon.
- **Arranque en frío**: Neon suspende el proyecto tras un rato de inactividad;
  la primera petición puede tardar unos segundos.
- **Estado**: el contenedor no escribe nada en disco. Los estáticos se cachean
  en memoria cuando `NODE_ENV=production`.
- **Esto es una demo**: `/auth/register` está abierto, así que cualquiera puede
  crearse una cuenta. Si no lo quieres, quita esa ruta o pon Cloud Run detrás de
  IAP antes de publicar el enlace.

## 7. Probarlo en local igual que en Cloud Run

```bash
docker network create kuidy-net
docker run -d --name kuidy-pg --network kuidy-net \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=kuidy postgres:17-alpine

docker build -t kuidy-core-demo .
docker run --rm --network kuidy-net -p 127.0.0.1:8080:8080 \
  -e DATABASE_URL='postgresql://postgres:test@kuidy-pg:5432/kuidy' \
  -e JWT_SECRET='una-clave-larga-solo-para-pruebas-de-32-o-mas' \
  -e SEED_DEMO=true \
  kuidy-core-demo
```

Abre <http://127.0.0.1:8080> y entra con `owner@kuidy.demo` / `Demo1234!`.
