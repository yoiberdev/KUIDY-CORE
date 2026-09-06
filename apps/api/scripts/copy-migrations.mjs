// tsc only emits .js — the drizzle .sql files and meta/_journal.json would be
// left behind, so the compiled migrator would have nothing to run. Copy them.
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(pkgRoot, 'src', 'db', 'migrations');
const dest = path.join(pkgRoot, 'dist', 'db', 'migrations');

await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true });

const copied = (await readdir(dest)).filter((f) => f.endsWith('.sql'));
if (copied.length === 0) {
  console.error(`[build] no .sql migrations copied into ${dest}`);
  process.exit(1);
}
console.log(`[build] copied ${copied.length} migration(s) -> dist/db/migrations`);
