import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { bootstrap } from './db/bootstrap.js';
import { db } from './db/client.js';
import { corsOrigins, env, httpPort } from './env.js';
import { authRoutes } from './routes/auth.js';
import { fieldRoutes, moduleFieldsRoutes } from './routes/fields.js';
import { moduleRoutes, projectModulesRoutes } from './routes/modules.js';
import { projectRoutes } from './routes/projects.js';
import { moduleRecordsRoutes, recordRoutes } from './routes/records.js';
import { hasWebBuild, spaFallback, staticFiles, webRoot } from './static.js';

const app = new Hono();

app.use('*', logger());

// Same-origin deploys need no CORS at all; this only opens the dev vite origin
// (and whatever CORS_ORIGINS lists) for the API surfaces.
const corsMiddleware = cors({
  origin: corsOrigins,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
app.use('/api/*', corsMiddleware);
app.use('/auth/*', corsMiddleware);

app.get('/health', async (c) => {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return c.json({
      status: 'ok',
      db: result.length > 0 ? 'connected' : 'no rows',
      web: hasWebBuild ? 'bundled' : 'absent',
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

app.get('/api', (c) => c.json({ name: 'kuidy-api', version: '0.1.0' }));

app.route('/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/projects/:projectId/modules', projectModulesRoutes);
app.route('/api/modules', moduleRoutes);
app.route('/api/modules/:moduleId/fields', moduleFieldsRoutes);
app.route('/api/modules/:moduleId/records', moduleRecordsRoutes);
app.route('/api/fields', fieldRoutes);
app.route('/api/records', recordRoutes);

// Registered last: only reached when no API route produced a response.
app.use('*', staticFiles);

app.notFound(async (c) => {
  const p = c.req.path;
  // API surfaces must 404 as JSON — never hand back index.html, or a typo in a
  // fetch path silently returns HTML with status 200 and the client parses it.
  const isApiPath =
    p === '/api' || p === '/auth' || p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/assets/');
  if (isApiPath) return c.json({ error: 'Not found' }, 404);

  const index = await spaFallback();
  if (!index) return c.json({ name: 'kuidy-api', version: '0.1.0', error: 'Not found' }, 404);

  c.header('Content-Type', index.type);
  c.header('Cache-Control', 'no-cache');
  return c.body(new Uint8Array(index.body), 200);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

if (env.RUN_MIGRATIONS) {
  await bootstrap();
}

console.log(`KUIDY-CORE listening on 0.0.0.0:${httpPort} (web: ${hasWebBuild ? webRoot : 'not bundled'})`);
serve({ fetch: app.fetch, port: httpPort, hostname: '0.0.0.0' });
