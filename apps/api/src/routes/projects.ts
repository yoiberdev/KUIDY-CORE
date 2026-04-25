import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { memberships, projects } from '../db/schema.js';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { requireMembership } from '../lib/permissions.js';
import { slugSchema } from '../lib/slug.js';

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial().omit({ slug: true });

export const projectRoutes = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)

  .get('/', async (c) => {
    const { sub } = c.get('user');
    const myMemberships = await db
      .select({ projectId: memberships.projectId, role: memberships.role })
      .from(memberships)
      .where(eq(memberships.userId, sub));

    if (myMemberships.length === 0) return c.json({ projects: [] });

    const ids = myMemberships.map((m) => m.projectId);
    const rows = await db.select().from(projects).where(inArray(projects.id, ids));
    const roleByProject = new Map(myMemberships.map((m) => [m.projectId, m.role]));

    return c.json({
      projects: rows.map((p) => ({ ...p, role: roleByProject.get(p.id) ?? 'viewer' })),
    });
  })

  .post('/', zValidator('json', createSchema), async (c) => {
    const { sub } = c.get('user');
    const input = c.req.valid('json');

    const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, input.slug));
    if (existing.length > 0) {
      throw new HTTPException(409, { message: 'Project slug already taken' });
    }

    const project = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(projects)
        .values({ ...input, createdBy: sub })
        .returning();
      if (!created) throw new HTTPException(500, { message: 'Failed to create project' });
      await tx.insert(memberships).values({ userId: sub, projectId: created.id, role: 'owner' });
      return created;
    });

    return c.json({ project: { ...project, role: 'owner' } }, 201);
  })

  .get('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const m = await requireMembership(sub, id, 'viewer');
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) throw new HTTPException(404, { message: 'Project not found' });
    return c.json({ project: { ...project, role: m.role } });
  })

  .patch('/:id', zValidator('json', updateSchema), async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireMembership(sub, id, 'admin');
    const patch = c.req.valid('json');
    const [updated] = await db
      .update(projects)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    if (!updated) throw new HTTPException(404, { message: 'Project not found' });
    return c.json({ project: updated });
  })

  .delete('/:id', async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    await requireMembership(sub, id, 'owner');
    await db.delete(projects).where(eq(projects.id, id));
    return c.body(null, 204);
  });
