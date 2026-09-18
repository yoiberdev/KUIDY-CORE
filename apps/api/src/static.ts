import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MiddlewareHandler } from 'hono';
import { env } from './env.js';

/**
 * Serves the built Vite frontend from the same origin as the API, so the whole
 * demo is one Cloud Run container. The root is resolved from this module's own
 * URL (never process.cwd(), which a container start command does not control):
 * compiled at dist/static.js it points at <pkg>/public.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

export const webRoot = path.resolve(env.WEB_ROOT ?? path.join(here, '..', 'public'));
export const hasWebBuild = existsSync(path.join(webRoot, 'index.html'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const cache = new Map<string, { body: Buffer; type: string }>();

async function loadFile(urlPath: string): Promise<{ body: Buffer; type: string } | null> {
  const cached = cache.get(urlPath);
  if (cached) return cached;

  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const target = path.resolve(webRoot, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  if (target !== webRoot && !target.startsWith(webRoot + path.sep)) return null; // traversal

  try {
    const info = await stat(target);
    if (!info.isFile()) return null;
    const body = await readFile(target);
    const asset = { body, type: MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream' };
    if (env.NODE_ENV === 'production') cache.set(urlPath, asset);
    return asset;
  } catch {
    return null;
  }
}

function cacheControl(urlPath: string): string {
  // Vite emits content-hashed filenames under /assets, safe to cache forever.
  return urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
}

/** Serves a real file if one exists, otherwise hands the request on. */
export const staticFiles: MiddlewareHandler = async (c, next) => {
  if (!hasWebBuild || (c.req.method !== 'GET' && c.req.method !== 'HEAD')) return next();

  const asset = await loadFile(c.req.path === '/' ? '/index.html' : c.req.path);
  if (!asset) return next();

  c.header('Content-Type', asset.type);
  c.header('Cache-Control', cacheControl(c.req.path));
  if (c.req.method === 'HEAD') {
    c.header('Content-Length', String(asset.body.byteLength));
    return c.body(null);
  }
  return c.body(new Uint8Array(asset.body));
};

/** index.html for client-side routes (/login, /p/:id …). Never for API paths. */
export async function spaFallback(): Promise<{ body: Buffer; type: string } | null> {
  return hasWebBuild ? loadFile('/index.html') : null;
}
