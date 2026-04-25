import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { db } from '../db/client.js';
import { fields, modules, records } from '../db/schema.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { requireMembership, requireModuleAccess } from '../lib/permissions.js';
import { buildRecordSchema } from '../lib/recordSchema.js';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  order: z.enum(['asc', 'desc']).default('desc'),
});

async function getModuleFields(moduleId: string) {
  return db.select().from(fields).where(eq(fields.moduleId, moduleId)).orderBy(asc(fields.position));
}

/** Routes scoped under /api/modules/:moduleId/records */
export const moduleRecordsRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/', async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    await requireModuleAccess(sub, moduleId, 'viewer');

    const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
    if (!parsed.success) throw new HTTPException(400, { message: 'Invalid query params' });
    const { limit, offset, order } = parsed.data;

    const [{ count }] = (await db
      .select({ count: sql<number>`count(*)::int` })
      .from(records)
      .where(eq(records.moduleId, moduleId))) as [{ count: number }];

    const rows = await db
      .select()
      .from(records)
      .where(eq(records.moduleId, moduleId))
      .orderBy(order === 'asc' ? asc(records.createdAt) : desc(records.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ records: rows, total: count, limit, offset });
  })

  .post('/', async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    const m = await requireModuleAccess(sub, moduleId, 'member');

    const fieldDefs = await getModuleFields(moduleId);
    const schema = buildRecordSchema(fieldDefs, 'create');

    const body = await c.req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.flatten() }, 422);
    }

    const [created] = await db
      .insert(records)
      .values({ projectId: m.projectId, moduleId, data: parsed.data, createdBy: sub })
      .returning();

    return c.json({ record: created }, 201);
  });

/** Routes scoped under /api/records/:id */
export const recordRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [r] = await db.select().from(records).where(eq(records.id, id));
    if (!r) throw new HTTPException(404, { message: 'Record not found' });
    await requireMembership(sub, r.projectId, 'viewer');
    return c.json({ record: r });
  })

  .patch('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [existing] = await db.select().from(records).where(eq(records.id, id));
    if (!existing) throw new HTTPException(404, { message: 'Record not found' });
    await requireMembership(sub, existing.projectId, 'member');

    const fieldDefs = await getModuleFields(existing.moduleId);
    const schema = buildRecordSchema(fieldDefs, 'update');

    const body = await c.req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.flatten() }, 422);
    }

    const merged = { ...(existing.data as Record<string, unknown>), ...parsed.data };
    const [updated] = await db
      .update(records)
      .set({ data: merged, updatedAt: new Date() })
      .where(eq(records.id, id))
      .returning();

    return c.json({ record: updated });
  })

  .delete('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [r] = await db.select().from(records).where(eq(records.id, id));
    if (!r) throw new HTTPException(404, { message: 'Record not found' });
    await requireMembership(sub, r.projectId, 'member');
    await db.delete(records).where(eq(records.id, id));
    return c.body(null, 204);
  });
