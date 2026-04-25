import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { fields } from '../db/schema.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { requireFieldAccess, requireModuleAccess } from '../lib/permissions.js';
import { slugSchema } from '../lib/slug.js';

export const FIELD_TYPES = ['text', 'number', 'date', 'datetime', 'bool', 'select'] as const;

const fieldConfigSchema = z
  .object({
    options: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .optional(),
    placeholder: z.string().max(120).optional(),
    helpText: z.string().max(500).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional().default(false),
  config: fieldConfigSchema.optional().default({}),
  position: z.number().int().nonnegative().optional(),
});

const updateSchema = createSchema.partial().omit({ slug: true, type: true });

/** Routes scoped under /api/modules/:moduleId/fields */
export const moduleFieldsRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/', async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    await requireModuleAccess(sub, moduleId, 'viewer');
    const rows = await db
      .select()
      .from(fields)
      .where(eq(fields.moduleId, moduleId))
      .orderBy(asc(fields.position), asc(fields.name));
    return c.json({ fields: rows });
  })

  .post('/', zValidator('json', createSchema), async (c) => {
    const { sub } = c.get('user');
    const moduleId = c.req.param('moduleId');
    if (!moduleId) throw new HTTPException(400, { message: 'moduleId required' });
    await requireModuleAccess(sub, moduleId, 'admin');
    const input = c.req.valid('json');
    try {
      const [created] = await db
        .insert(fields)
        .values({ ...input, moduleId })
        .returning();
      return c.json({ field: created }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes('fields_module_slug_unique')) {
        throw new HTTPException(409, { message: 'Field slug already exists in this module' });
      }
      throw err;
    }
  });

/** Routes scoped under /api/fields/:id */
export const fieldRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .patch('/:id', zValidator('json', updateSchema), async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireFieldAccess(sub, id, 'admin');
    const patch = c.req.valid('json');
    const [updated] = await db
      .update(fields)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(fields.id, id))
      .returning();
    if (!updated) throw new HTTPException(404, { message: 'Field not found' });
    return c.json({ field: updated });
  })

  .delete('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireFieldAccess(sub, id, 'admin');
    await db.delete(fields).where(eq(fields.id, id));
    return c.body(null, 204);
  });
