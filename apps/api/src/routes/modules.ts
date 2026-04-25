import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { modules } from '../db/schema.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { requireMembership, requireModuleAccess } from '../lib/permissions.js';
import { slugSchema } from '../lib/slug.js';

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(60).optional(),
  position: z.number().int().nonnegative().optional(),
});

const updateSchema = createSchema.partial().omit({ slug: true });

/** Routes scoped under /api/projects/:projectId/modules */
export const projectModulesRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/', async (c) => {
    const { sub } = c.get('user');
    const projectId = c.req.param('projectId');
    if (!projectId) throw new HTTPException(400, { message: 'projectId required' });
    await requireMembership(sub, projectId, 'viewer');
    const rows = await db
      .select()
      .from(modules)
      .where(eq(modules.projectId, projectId))
      .orderBy(asc(modules.position), asc(modules.name));
    return c.json({ modules: rows });
  })

  .post('/', zValidator('json', createSchema), async (c) => {
    const { sub } = c.get('user');
    const projectId = c.req.param('projectId');
    if (!projectId) throw new HTTPException(400, { message: 'projectId required' });
    await requireMembership(sub, projectId, 'admin');
    const input = c.req.valid('json');
    try {
      const [created] = await db
        .insert(modules)
        .values({ ...input, projectId })
        .returning();
      return c.json({ module: created }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes('modules_project_slug_unique')) {
        throw new HTTPException(409, { message: 'Module slug already exists in this project' });
      }
      throw err;
    }
  });

/** Routes scoped under /api/modules/:id (single module by id) */
export const moduleRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireModuleAccess(sub, id, 'viewer');
    const [m] = await db.select().from(modules).where(eq(modules.id, id));
    if (!m) throw new HTTPException(404, { message: 'Module not found' });
    return c.json({ module: m });
  })

  .patch('/:id', zValidator('json', updateSchema), async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireModuleAccess(sub, id, 'admin');
    const patch = c.req.valid('json');
    const [updated] = await db
      .update(modules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
    if (!updated) throw new HTTPException(404, { message: 'Module not found' });
    return c.json({ module: updated });
  })

  .delete('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireModuleAccess(sub, id, 'admin');
    await db.delete(modules).where(eq(modules.id, id));
    return c.body(null, 204);
  });
