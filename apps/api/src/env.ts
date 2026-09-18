import { config } from 'dotenv';
import { z } from 'zod';

// Loads a local .env when present (dev). Real environment variables always win,
// so this is a no-op on Cloud Run / Docker where config comes from the platform.
config({ path: ['../../.env', '.env'] });

const boolFromEnv = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim() === '') return fallback;
      return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
    });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),

  /** Cloud Run injects PORT. API_PORT stays for local dev / the vite proxy. */
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(3000),

  /** TLS for Postgres. `auto` honours ?sslmode= in DATABASE_URL (Neon sets it). */
  DATABASE_SSL: z.enum(['auto', 'require', 'no-verify', 'disable']).default('auto'),
  DB_POOL_MAX: z.coerce.number().int().positive().max(50).default(5),

  /** Run migrations (and, if enabled, the demo seed) before listening. */
  RUN_MIGRATIONS: boolFromEnv(false),
  SEED_DEMO: boolFromEnv(false),
  DEMO_PASSWORD: z.string().min(8).default('Demo1234!'),

  /** Directory with the built frontend. Defaults to ../public next to dist/. */
  WEB_ROOT: z.string().optional(),

  /** Extra CORS origins, comma separated. Same-origin deploys need none. */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Port the HTTP server binds to: PORT (Cloud Run) wins over API_PORT. */
export const httpPort = env.PORT ?? env.API_PORT;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
