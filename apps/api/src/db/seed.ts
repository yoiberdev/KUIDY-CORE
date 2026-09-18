import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, sql } from 'drizzle-orm';
import { env } from '../env.js';
import { hashPassword } from '../lib/password.js';
import { db, queryClient } from './client.js';
import { fields, memberships, modules, projects, records, users } from './schema.js';

/**
 * Idempotent demo seed. Every step is "create if absent", so running it on every
 * container start converges to the same state and never duplicates rows.
 * Records are only inserted into a module that is still empty, so anything a
 * visitor creates during the demo survives a restart.
 *
 * All data below is fictional. Passwords are intentionally obvious.
 */

type Role = 'owner' | 'admin' | 'member' | 'viewer';
type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'bool' | 'select';

interface SeedField {
  slug: string;
  name: string;
  type: FieldType;
  required?: boolean;
  config?: Record<string, unknown>;
}

interface SeedModule {
  slug: string;
  name: string;
  description: string;
  icon: string;
  fields: SeedField[];
  rows: Record<string, unknown>[];
}

interface SeedProject {
  slug: string;
  name: string;
  description: string;
  modules: SeedModule[];
}

const opts = (...values: [string, string][]) => ({
  options: values.map(([value, label]) => ({ value, label })),
});

export const DEMO_USERS: { email: string; name: string; role: Role }[] = [
  { email: 'owner@kuidy.demo', name: 'Ana Torres (owner)', role: 'owner' },
  { email: 'admin@kuidy.demo', name: 'Bruno Diaz (admin)', role: 'admin' },
  { email: 'member@kuidy.demo', name: 'Carla Ruiz (member)', role: 'member' },
  { email: 'viewer@kuidy.demo', name: 'Diego Solis (viewer)', role: 'viewer' },
];

const DEMO_PROJECTS: SeedProject[] = [
  {
    slug: 'operaciones-demo',
    name: 'Operaciones (demo)',
    description: 'Planta ficticia Acme Andina: activos, ordenes de trabajo y almacen.',
    modules: [
      {
        slug: 'activos',
        name: 'Activos',
        description: 'Equipos e instalaciones bajo mantenimiento.',
        icon: 'wrench',
        fields: [
          { slug: 'codigo', name: 'Codigo', type: 'text', required: true },
          { slug: 'nombre', name: 'Nombre', type: 'text', required: true },
          {
            slug: 'ubicacion',
            name: 'Ubicacion',
            type: 'select',
            required: true,
            config: opts(['planta-1', 'Planta 1'], ['planta-2', 'Planta 2'], ['almacen', 'Almacen']),
          },
          {
            slug: 'criticidad',
            name: 'Criticidad',
            type: 'select',
            config: opts(['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']),
          },
          { slug: 'fecha-alta', name: 'Fecha de alta', type: 'date' },
          { slug: 'horas-uso', name: 'Horas de uso', type: 'number' },
          { slug: 'operativo', name: 'Operativo', type: 'bool' },
        ],
        rows: [
          { codigo: 'ACT-001', nombre: 'Compresor Atlas ficticio', ubicacion: 'planta-1', criticidad: 'alta', 'fecha-alta': '2024-03-11', 'horas-uso': 8420, operativo: true },
          { codigo: 'ACT-002', nombre: 'Cinta transportadora B2', ubicacion: 'planta-1', criticidad: 'media', 'fecha-alta': '2023-11-02', 'horas-uso': 15230, operativo: true },
          { codigo: 'ACT-003', nombre: 'Montacargas Demo 2T', ubicacion: 'almacen', criticidad: 'media', 'fecha-alta': '2025-01-20', 'horas-uso': 1180, operativo: false },
          { codigo: 'ACT-004', nombre: 'Caldera piloto (ficticia)', ubicacion: 'planta-2', criticidad: 'alta', 'fecha-alta': '2022-07-05', 'horas-uso': 23110, operativo: true },
        ],
      },
      {
        slug: 'ordenes',
        name: 'Ordenes de trabajo',
        description: 'Mantenimiento correctivo y preventivo.',
        icon: 'clipboard-list',
        fields: [
          { slug: 'folio', name: 'Folio', type: 'text', required: true },
          { slug: 'activo', name: 'Activo', type: 'text', required: true },
          { slug: 'tipo', name: 'Tipo', type: 'select', required: true, config: opts(['correctivo', 'Correctivo'], ['preventivo', 'Preventivo']) },
          { slug: 'estado', name: 'Estado', type: 'select', required: true, config: opts(['abierta', 'Abierta'], ['en-curso', 'En curso'], ['cerrada', 'Cerrada']) },
          { slug: 'prioridad', name: 'Prioridad', type: 'select', config: opts(['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']) },
          { slug: 'fecha-prevista', name: 'Fecha prevista', type: 'date' },
          { slug: 'horas-estimadas', name: 'Horas estimadas', type: 'number' },
        ],
        rows: [
          { folio: 'OT-2026-0001', activo: 'ACT-001', tipo: 'preventivo', estado: 'cerrada', prioridad: 'media', 'fecha-prevista': '2026-08-14', 'horas-estimadas': 3 },
          { folio: 'OT-2026-0002', activo: 'ACT-003', tipo: 'correctivo', estado: 'en-curso', prioridad: 'alta', 'fecha-prevista': '2026-09-08', 'horas-estimadas': 6 },
          { folio: 'OT-2026-0003', activo: 'ACT-002', tipo: 'preventivo', estado: 'abierta', prioridad: 'baja', 'fecha-prevista': '2026-09-30', 'horas-estimadas': 2 },
          { folio: 'OT-2026-0004', activo: 'ACT-004', tipo: 'correctivo', estado: 'abierta', prioridad: 'alta', 'fecha-prevista': '2026-09-10', 'horas-estimadas': 8 },
        ],
      },
      {
        slug: 'productos',
        name: 'Productos de almacen',
        description: 'Catalogo y stock ficticio.',
        icon: 'package',
        fields: [
          { slug: 'sku', name: 'SKU', type: 'text', required: true },
          { slug: 'nombre', name: 'Nombre', type: 'text', required: true },
          { slug: 'categoria', name: 'Categoria', type: 'select', config: opts(['repuesto', 'Repuesto'], ['consumible', 'Consumible'], ['herramienta', 'Herramienta']) },
          { slug: 'stock', name: 'Stock', type: 'number' },
          { slug: 'stock-minimo', name: 'Stock minimo', type: 'number' },
          { slug: 'activo', name: 'Activo', type: 'bool' },
        ],
        rows: [
          { sku: 'RP-1001', nombre: 'Rodamiento 6205 (demo)', categoria: 'repuesto', stock: 24, 'stock-minimo': 10, activo: true },
          { sku: 'CN-2002', nombre: 'Aceite hidraulico 20L', categoria: 'consumible', stock: 6, 'stock-minimo': 8, activo: true },
          { sku: 'HR-3003', nombre: 'Llave dinamometrica', categoria: 'herramienta', stock: 2, 'stock-minimo': 1, activo: true },
          { sku: 'RP-1002', nombre: 'Correa dentada A-42', categoria: 'repuesto', stock: 0, 'stock-minimo': 4, activo: false },
        ],
      },
    ],
  },
  {
    slug: 'soporte-demo',
    name: 'Soporte (demo)',
    description: 'Helpdesk ficticio para mostrar un segundo proyecto con otros modulos.',
    modules: [
      {
        slug: 'tickets',
        name: 'Tickets',
        description: 'Incidencias reportadas por usuarios ficticios.',
        icon: 'life-buoy',
        fields: [
          { slug: 'asunto', name: 'Asunto', type: 'text', required: true },
          { slug: 'solicitante', name: 'Solicitante', type: 'text', required: true },
          { slug: 'categoria', name: 'Categoria', type: 'select', config: opts(['hardware', 'Hardware'], ['software', 'Software'], ['accesos', 'Accesos']) },
          { slug: 'estado', name: 'Estado', type: 'select', required: true, config: opts(['nuevo', 'Nuevo'], ['en-curso', 'En curso'], ['resuelto', 'Resuelto']) },
          { slug: 'abierto-el', name: 'Abierto el', type: 'date' },
          { slug: 'resuelto', name: 'Resuelto', type: 'bool' },
        ],
        rows: [
          { asunto: 'No imprime la etiquetadora', solicitante: 'Elena Prado', categoria: 'hardware', estado: 'en-curso', 'abierto-el': '2026-09-02', resuelto: false },
          { asunto: 'Alta de usuario en el ERP', solicitante: 'Marco Vidal', categoria: 'accesos', estado: 'nuevo', 'abierto-el': '2026-09-05', resuelto: false },
          { asunto: 'Error al exportar informe', solicitante: 'Lucia Ferrer', categoria: 'software', estado: 'resuelto', 'abierto-el': '2026-08-21', resuelto: true },
        ],
      },
      {
        slug: 'clientes',
        name: 'Clientes',
        description: 'Cartera ficticia (CRM ligero).',
        icon: 'users',
        fields: [
          { slug: 'razon-social', name: 'Razon social', type: 'text', required: true },
          { slug: 'contacto', name: 'Contacto', type: 'text' },
          { slug: 'plan', name: 'Plan', type: 'select', config: opts(['basico', 'Basico'], ['pro', 'Pro'], ['enterprise', 'Enterprise']) },
          { slug: 'alta', name: 'Fecha de alta', type: 'date' },
          { slug: 'activo', name: 'Activo', type: 'bool' },
        ],
        rows: [
          { 'razon-social': 'Acme Andina SAC (ficticia)', contacto: 'Elena Prado', plan: 'pro', alta: '2025-04-18', activo: true },
          { 'razon-social': 'Textiles Demo SRL', contacto: 'Marco Vidal', plan: 'basico', alta: '2026-01-09', activo: true },
          { 'razon-social': 'Logistica Ejemplo EIRL', contacto: 'Lucia Ferrer', plan: 'enterprise', alta: '2024-10-30', activo: false },
        ],
      },
    ],
  },
];

async function ensureUser(email: string, name: string, password: string): Promise<string> {
  const [found] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (found) return found.id;

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, passwordHash, name }).onConflictDoNothing();

  const [created] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!created) throw new Error(`seed: could not create user ${email}`);
  return created.id;
}

async function ensureProject(spec: SeedProject, ownerId: string): Promise<string> {
  const [found] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, spec.slug));
  if (found) return found.id;

  await db
    .insert(projects)
    .values({ slug: spec.slug, name: spec.name, description: spec.description, createdBy: ownerId })
    .onConflictDoNothing();

  const [created] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, spec.slug));
  if (!created) throw new Error(`seed: could not create project ${spec.slug}`);
  return created.id;
}

async function ensureMembership(userId: string, projectId: string, role: Role): Promise<void> {
  await db
    .insert(memberships)
    .values({ userId, projectId, role })
    .onConflictDoUpdate({ target: [memberships.userId, memberships.projectId], set: { role } });
}

async function ensureModule(spec: SeedModule, projectId: string, position: number): Promise<string> {
  const where = and(eq(modules.projectId, projectId), eq(modules.slug, spec.slug));
  const [found] = await db.select({ id: modules.id }).from(modules).where(where);
  if (found) return found.id;

  await db
    .insert(modules)
    .values({
      projectId,
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      icon: spec.icon,
      position,
    })
    .onConflictDoNothing();

  const [created] = await db.select({ id: modules.id }).from(modules).where(where);
  if (!created) throw new Error(`seed: could not create module ${spec.slug}`);
  return created.id;
}

async function ensureField(spec: SeedField, moduleId: string, position: number): Promise<void> {
  await db
    .insert(fields)
    .values({
      moduleId,
      slug: spec.slug,
      name: spec.name,
      type: spec.type,
      required: spec.required ?? false,
      config: spec.config ?? {},
      position,
    })
    .onConflictDoNothing({ target: [fields.moduleId, fields.slug] });
}

/** Only fills a module that is still empty, so demo visitors keep their rows. */
async function ensureRecords(
  rows: Record<string, unknown>[],
  projectId: string,
  moduleId: string,
  createdBy: string,
): Promise<number> {
  const [counted] = (await db
    .select({ count: sql<number>`count(*)::int` })
    .from(records)
    .where(eq(records.moduleId, moduleId))) as [{ count: number }];

  if (counted.count > 0 || rows.length === 0) return 0;

  await db.insert(records).values(rows.map((data) => ({ projectId, moduleId, data, createdBy })));
  return rows.length;
}

export async function seedDemo(): Promise<void> {
  const password = env.DEMO_PASSWORD;
  console.log('[seed] ensuring demo users…');

  const userIds = new Map<string, string>();
  for (const u of DEMO_USERS) {
    userIds.set(u.email, await ensureUser(u.email, u.name, password));
  }

  const ownerEmail = DEMO_USERS[0]?.email ?? 'owner@kuidy.demo';
  const ownerId = userIds.get(ownerEmail);
  if (!ownerId) throw new Error('seed: owner user missing');

  for (const projectSpec of DEMO_PROJECTS) {
    const projectId = await ensureProject(projectSpec, ownerId);

    for (const u of DEMO_USERS) {
      const id = userIds.get(u.email);
      if (id) await ensureMembership(id, projectId, u.role);
    }

    let modulePosition = 0;
    for (const moduleSpec of projectSpec.modules) {
      const moduleId = await ensureModule(moduleSpec, projectId, modulePosition++);

      let fieldPosition = 0;
      for (const fieldSpec of moduleSpec.fields) {
        await ensureField(fieldSpec, moduleId, fieldPosition++);
      }

      const inserted = await ensureRecords(moduleSpec.rows, projectId, moduleId, ownerId);
      console.log(
        `[seed] ${projectSpec.slug}/${moduleSpec.slug}: ${moduleSpec.fields.length} campos, ${inserted} registros nuevos`,
      );
    }
  }

  console.log(`[seed] listo. Cuentas demo (password: ${password}):`);
  for (const u of DEMO_USERS) console.log(`[seed]   ${u.role.padEnd(6)} -> ${u.email}`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  await seedDemo();
  await queryClient.end({ timeout: 5 });
}
