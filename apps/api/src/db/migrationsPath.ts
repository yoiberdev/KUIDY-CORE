import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the folder holding the drizzle .sql files + meta/_journal.json.
 *
 * Resolved from this module's own location, never from process.cwd(): the
 * compiled entrypoint runs with an arbitrary working directory in a container.
 * Under tsx this points at src/db/migrations; in dist it points at
 * dist/db/migrations, which `scripts/copy-migrations.mjs` fills during build.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

export const migrationsFolder = path.join(here, 'migrations');

export function assertMigrationsPresent(): void {
  const journal = path.join(migrationsFolder, 'meta', '_journal.json');
  if (!existsSync(journal)) {
    throw new Error(
      `Migrations not found at ${migrationsFolder} (missing meta/_journal.json). ` +
        'Did the build copy src/db/migrations into dist/db/migrations?',
    );
  }
}
