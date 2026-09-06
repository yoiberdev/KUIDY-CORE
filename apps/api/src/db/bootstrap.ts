import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { env } from '../env.js';
import { queryClient, resolveSsl } from './client.js';
import { assertMigrationsPresent, migrationsFolder } from './migrationsPath.js';
import { seedDemo } from './seed.js';

/**
 * Startup bootstrap: migrate (and optionally seed) before the server listens.
 *
 * Cloud Run can start several instances of the same revision at once, so the
 * whole thing runs under a Postgres advisory lock taken on its own dedicated
 * connection — otherwise two cold starts race on drizzle's migrations table.
 */
const LOCK_KEY = 4213371337;

export async function bootstrap(options: { seed?: boolean } = {}): Promise<void> {
  const seed = options.seed ?? env.SEED_DEMO;
  assertMigrationsPresent();

  const client = postgres(env.DATABASE_URL, {
    max: 1,
    connect_timeout: 15,
    ssl: resolveSsl(env.DATABASE_URL, env.DATABASE_SSL),
    // drizzle's migrator issues CREATE ... IF NOT EXISTS; the resulting NOTICEs
    // are printed as objects and read like crashes in Cloud Run logs.
    onnotice: () => {},
  });

  try {
    await client`select pg_advisory_lock(${LOCK_KEY}::bigint)`;
    console.log(`[bootstrap] running migrations from ${migrationsFolder}`);
    await migrate(drizzle(client), { migrationsFolder });
    console.log('[bootstrap] migrations up to date');

    if (seed) await seedDemo();
    else console.log('[bootstrap] SEED_DEMO off, skipping demo data');
  } finally {
    try {
      await client`select pg_advisory_unlock(${LOCK_KEY}::bigint)`;
    } catch {
      /* connection already gone: the lock dies with the session anyway */
    }
    await client.end({ timeout: 5 });
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  await bootstrap();
  await queryClient.end({ timeout: 5 });
}
