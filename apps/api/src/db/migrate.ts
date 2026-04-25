import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: ['../../.env', '.env'] });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './src/db/migrations' });
console.log('Migrations complete.');
await sql.end();
