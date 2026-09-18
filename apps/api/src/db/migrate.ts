import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { assertMigrationsPresent, migrationsFolder } from './migrationsPath.js';

config({ path: ['../../.env', '.env'] });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

assertMigrationsPresent();

const sslmode = new URL(url).searchParams.get('sslmode');
const sql = postgres(url, {
  max: 1,
  ssl: !sslmode || sslmode === 'disable' ? false : 'require',
  onnotice: () => {},
});
const db = drizzle(sql);

console.log(`Running migrations from ${migrationsFolder} ...`);
await migrate(db, { migrationsFolder });
console.log('Migrations complete.');
await sql.end();
