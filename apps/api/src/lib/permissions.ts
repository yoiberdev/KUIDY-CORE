import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/client.js';
import { memberships, modules, fields } from '../db/schema.js';

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export async function getMembership(userId: string, projectId: string) {
  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.projectId, projectId)));
  return m ?? null;
}

export async function requireMembership(userId: string, projectId: string, minRole: Role = 'viewer') {
  const m = await getMembership(userId, projectId);
  if (!m) {
    throw new HTTPException(403, { message: 'Not a member of this project' });
  }
  const role = (m.role as Role) ?? 'viewer';
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new HTTPException(403, { message: `Requires role ${minRole} or higher` });
  }
  return m;
}

/** Resolve a module's project, then assert membership. */
export async function requireModuleAccess(userId: string, moduleId: string, minRole: Role = 'viewer') {
  const [m] = await db
    .select({ id: modules.id, projectId: modules.projectId })
    .from(modules)
    .where(eq(modules.id, moduleId));
  if (!m) throw new HTTPException(404, { message: 'Module not found' });
  await requireMembership(userId, m.projectId, minRole);
  return m;
}

/** Resolve a field's project (via its module), then assert membership. */
export async function requireFieldAccess(userId: string, fieldId: string, minRole: Role = 'viewer') {
  const [f] = await db
    .select({ id: fields.id, moduleId: fields.moduleId, projectId: modules.projectId })
    .from(fields)
    .innerJoin(modules, eq(modules.id, fields.moduleId))
    .where(eq(fields.id, fieldId));
  if (!f) throw new HTTPException(404, { message: 'Field not found' });
  await requireMembership(userId, f.projectId, minRole);
  return f;
}
