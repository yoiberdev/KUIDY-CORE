import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { modules, views } from '../db/schema.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { requireMembership, requireModuleAccess } from '../lib/permissions.js';
import { VIEW_TYPES, validateLayoutForType, type ViewType } from '../lib/viewLayout.js';

const createSchema = z.object({
  type: z.enum(VIEW_TYPES),
  name: z.string().min(1).max(120),
  layout: z.unknown().default({}),
  isDefault: z.boolean().optional().default(false),
  position: z.number().int().nonnegative().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  layout: z.unknown().optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

/** Routes scoped under /api/modules/:moduleId/views */
export const moduleViewsRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/', async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    await requireModuleAccess(sub, moduleId, 'viewer');

    const typeFilter = c.req.query('type') as ViewType | undefined;

    const rows = await db
      .select()
      .from(views)
      .where(
        typeFilter
          ? and(eq(views.moduleId, moduleId), eq(views.type, typeFilter))
          : eq(views.moduleId, moduleId),
      )
      .orderBy(asc(views.position), asc(views.name));
    return c.json({ views: rows });
  })

  .post('/', zValidator('json', createSchema), async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    await requireModuleAccess(sub, moduleId, 'admin');
    const input = c.req.valid('json');

    const validated = validateLayoutForType(input.type as ViewType, input.layout);
    if (!validated.ok) {
      return c.json({ error: 'Invalid layout', issues: validated.issues }, 422);
    }

    try {
      const [created] = await db
        .insert(views)
        .values({
          moduleId,
          type: input.type,
          name: input.name,
          layout: validated.layout as object,
          isDefault: input.isDefault,
          position: input.position ?? 0,
        })
        .returning();
      return c.json({ view: created }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes('views_module_type_name_unique')) {
        throw new HTTPException(409, { message: 'A view with that name already exists for this module/type' });
      }
      throw err;
    }
  });

/** Routes scoped under /api/views/:id */
export const viewRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [v] = await db
      .select({
        view: views,
        projectId: modules.projectId,
      })
      .from(views)
      .innerJoin(modules, eq(modules.id, views.moduleId))
      .where(eq(views.id, id));
    if (!v) throw new HTTPException(404, { message: 'View not found' });
    await requireMembership(sub, v.projectId, 'viewer');
    return c.json({ view: v.view });
  })

  .patch('/:id', zValidator('json', updateSchema), async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [existing] = await db
      .select({
        view: views,
        projectId: modules.projectId,
      })
      .from(views)
      .innerJoin(modules, eq(modules.id, views.moduleId))
      .where(eq(views.id, id));
    if (!existing) throw new HTTPException(404, { message: 'View not found' });
    await requireMembership(sub, existing.projectId, 'admin');

    const patch = c.req.valid('json');

    if (patch.layout !== undefined) {
      const validated = validateLayoutForType(existing.view.type as ViewType, patch.layout);
      if (!validated.ok) {
        return c.json({ error: 'Invalid layout', issues: validated.issues }, 422);
      }
      patch.layout = validated.layout;
    }

    const [updated] = await db
      .update(views)
      .set({ ...patch, updatedAt: new Date() } as Partial<typeof views.$inferInsert>)
      .where(eq(views.id, id))
      .returning();
    return c.json({ view: updated });
  })

  .delete('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const [existing] = await db
      .select({ projectId: modules.projectId })
      .from(views)
      .innerJoin(modules, eq(modules.id, views.moduleId))
      .where(eq(views.id, id));
    if (!existing) throw new HTTPException(404, { message: 'View not found' });
    await requireMembership(sub, existing.projectId, 'admin');
    await db.delete(views).where(eq(views.id, id));
    return c.body(null, 204);
  });
