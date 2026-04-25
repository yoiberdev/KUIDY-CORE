import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { db } from './db/client.js';
import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { fieldRoutes, moduleFieldsRoutes } from './routes/fields.js';
import { moduleRoutes, projectModulesRoutes } from './routes/modules.js';
import { projectRoutes } from './routes/projects.js';
import { moduleRecordsRoutes, recordRoutes } from './routes/records.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return c.json({
      status: 'ok',
      db: result.length > 0 ? 'connected' : 'no rows',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json(
      {
        status: 'degraded',
        db: 'error',
        error: err instanceof Error ? err.message : String(err),
      },
      503,
    );
  }
});

app.get('/', (c) => c.json({ name: 'kuidy-api', version: '0.1.0' }));

app.route('/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/projects/:projectId/modules', projectModulesRoutes);
app.route('/api/modules', moduleRoutes);
app.route('/api/modules/:moduleId/fields', moduleFieldsRoutes);
app.route('/api/modules/:moduleId/records', moduleRecordsRoutes);
app.route('/api/fields', fieldRoutes);
app.route('/api/records', recordRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = env.API_PORT;
console.log(`KUIDY-CORE api listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
