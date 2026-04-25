# KUIDY-CORE

Data-driven platform for building internal operations apps (Odoo-lite). Users define modules, fields, relations, and views from a designer UI; a generic engine renders forms, lists, filters, and routes from that metadata. Repo name = the engine. The first commercial template is **OPS** (inventario, almacén, mantenimiento correctivo+preventivo, helpdesk, CRM ligero, RRHH ligero).

## Stack constraint

**TypeScript everywhere — Hono + Drizzle + Postgres on the backend, React + Vite + TS on the frontend, shared types via `packages/shared`.**

Rust was actively considered and rejected for this project (the user knows little Rust and works through Claude Code; velocity and self-debuggability won). Do not re-propose Rust here. The Rust-in-Docker default that applies to other projects in this workspace was about a Windows desktop `.exe` constraint — that reason does not apply to a web backend.

## Layout (monorepo, pnpm workspaces)

```
KUIDY-CORE/
├── package.json              # root scripts (dev, build, db:up, db:psql)
├── pnpm-workspace.yaml       # apps/*, packages/*
├── tsconfig.base.json        # strict + noUncheckedIndexedAccess
├── docker-compose.yml        # postgres:16-alpine
├── .env.example              # DATABASE_URL, JWT_SECRET, ports
├── apps/
│   ├── api/                  # Hono + Drizzle + zod
│   └── web/                  # Vite + React + TS + Tailwind + react-router
└── packages/
    └── shared/               # zod schemas + TS types shared between api and web
```

## Architectural decisions (settled — do not re-litigate without strong cause)

- **JSONB single `records` table** for all record data, NOT DDL-on-the-fly per module. Indexes are GIN on `data` plus expression indexes on hot fields. Avoids Odoo-style migration pain and DDL locks in production.
- **Hybrid metadata model**: real tables for `users`, `projects`, `memberships`, `modules`, `fields`, `views`, `roles`, `permissions`. JSONB only for `records`.
- **Generic dynamic renderer** on the frontend driven by a field-type registry (`FIELD_COMPONENTS = { text, number, date, bool, select, relation, ... }`). Adding a new field type = registering a component, not editing forms or lists.
- **The module designer is built on the same engine** — `modules` and `fields` are themselves modules, just pre-seeded.
- **Two API surfaces**: `/api/meta/...` for metadata CRUD (projects, modules, fields, views, permisos), `/api/data/:project/:module/...` for generic record CRUD respecting permissions.

## Roadmap

- **F0** (current): monorepo + Postgres + auth + projects + modules + fields + generic records CRUD + DynamicForm/List with primitive types.
- **F1**: relation field type, navigation between modules, designer UI for modules/fields built into the app.
- **F2**: OPS template seed — when a user creates a project from "Operaciones", the modules Personas/Productos/Almacenes/Movimientos/Stock/Activos/OT/Tickets get auto-created.
- **F3**: triggers/hooks, workflow state machines per module, calculated fields, auto-numbering (folios).
- **F4**: niche field types — QR/barcode (camera + scanner), photo, signature, geolocation, file.
- **F5**: scheduler (preventive maintenance, recurring tasks) + notifications.
- **F6**: roles and granular permissions (module + field level).
- **F7**: tier-2 modules — purchase orders, HR (vacations), CRM pipeline, etc.

## Build flow

Local dev:

```bash
cp .env.example .env
pnpm install
pnpm db:up                  # starts Postgres in Docker on host port 5435
pnpm dev                    # runs api + web in parallel
```

**Host port for Postgres is 5435** (not 5432) because the dev machine has other Postgres instances on 5432 and 5433. The container internally still listens on 5432; only the host mapping is shifted. If you move this to a different machine where 5432 is free, change `docker-compose.yml` and `.env` together.

Postgres lives in a named Docker volume (`kuidy-pgdata`) so data persists across `docker compose down`. To wipe: `docker compose down -v`.

## Things not to redo

- Do not propose Rust for the backend — settled.
- Do not switch to per-module DDL tables — JSONB is the deliberate choice.
- Do not introduce a separate state-management library on the frontend; React Query owns server state, react-hook-form owns form state, AuthContext owns the JWT. Do not pull in Redux/Zustand/Jotai unless something genuinely doesn't fit those three.
- Do not commit `.env` (only `.env.example`). `pnpm-lock.yaml` SHOULD be committed — this is a serious project, lockfile non-negotiable.
