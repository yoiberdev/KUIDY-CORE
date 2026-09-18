# syntax=docker/dockerfile:1
#
# One image that serves the React build and the Hono API on the same origin,
# listening on $PORT — the shape Cloud Run expects. Postgres lives outside
# (Neon), so the container keeps no state on disk.

# ---------- base: node + pinned pnpm ----------
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
WORKDIR /app

# ---------- build: full workspace install, then compile everything ----------
FROM base AS build

# Manifests first so the dependency layer is cached independently of the source.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY . .

# shared -> api -> web, in workspace topological order.
# api's build also copies src/db/migrations into dist/db/migrations.
RUN pnpm build

# Self-contained production tree for the API (prod deps only, no tsx/vite/
# drizzle-kit), plus the compiled frontend next to it as ./public.
RUN pnpm --filter @kuidy/api --prod --legacy deploy /runtime \
 && rm -rf /runtime/src /runtime/scripts /runtime/tsconfig.json /runtime/drizzle.config.ts \
 && cp -r apps/web/dist /runtime/public

# ---------- runtime: no pnpm, no dev dependencies, non-root ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    RUN_MIGRATIONS=true
WORKDIR /app

COPY --from=build --chown=node:node /runtime /app

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
