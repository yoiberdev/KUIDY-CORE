import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Options, PostgresType } from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

type SslSetting = Options<Record<string, PostgresType>>['ssl'];

/**
 * Managed Postgres (Neon, Cloud SQL over TCP, Supabase…) requires TLS, while a
 * local docker Postgres has none. `auto` reads ?sslmode= from the URL — Neon
 * connection strings always carry `sslmode=require`.
 */
export function resolveSsl(databaseUrl: string, mode: typeof env.DATABASE_SSL): SslSetting {
  if (mode === 'disable') return false;
  if (mode === 'require') return 'require';
  if (mode === 'no-verify') return { rejectUnauthorized: false };

  let sslmode: string | null = null;
  try {
    sslmode = new URL(databaseUrl).searchParams.get('sslmode');
  } catch {
    sslmode = null;
  }
  if (!sslmode || sslmode === 'disable') return false;
  if (sslmode === 'verify-full' || sslmode === 'verify-ca') return 'verify-full';
  return 'require';
}

export const connectionOptions = {
  max: env.DB_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: resolveSsl(env.DATABASE_URL, env.DATABASE_SSL),
} as const;

const queryClient = postgres(env.DATABASE_URL, connectionOptions);

export const db = drizzle(queryClient, { schema, casing: 'snake_case' });
export { schema, queryClient };
