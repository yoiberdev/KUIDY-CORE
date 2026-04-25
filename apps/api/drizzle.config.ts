import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: ['../../.env', '.env'] });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
