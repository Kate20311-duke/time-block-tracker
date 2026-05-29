# AI Context — TimeBlock Tracker

Paste at the start of new coding sessions.

## Project

Personal time-block planner + Pomodoro focus tracker. **Phase 7 complete:** Docker (DB + production image).

| Phase | Status |
|-------|--------|
| 1–6 | Done |
| **7** | **Done** (Docker Compose db/app, Dockerfile, docs) |
| **8+** | Sealos deploy; then stats/focus enhancements — see `PROJECT_STATUS.md` §16 / §19 |

## Stack

Next.js 16 App Router · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL `app` schema · pnpm · Node 20+ · Recharts · Vitest · **Auth.js v5** (`next-auth@beta`)

## Architecture

```
Browser → middleware (auth gate) → App Router pages (requireUser + *ForUser)
                              → Server Actions (requireUser + assert*Owned)
                              → src/lib/db/scoped.ts → prisma
```

- **Public:** `/`, `/login`, `/api/auth/*`
- **Private:** `/categories`, `/time-blocks`, `/calendar`, `/dashboard`, `/focus`, `/review/*`
- **No** REST API for business data; writes via Server Actions only

## Auth / session

| Piece | Path |
|-------|------|
| Edge config | `src/auth.config.ts` |
| Full Auth.js + Prisma adapter | `src/auth.ts` |
| Routes | `src/app/api/auth/[...nextauth]/route.ts` |
| Route protection | `src/middleware.ts` |
| Session helpers | `src/lib/session.ts` — `getSessionUser()`, `requireUser()` |

- Provider: **GitHub OAuth only**
- Session: **JWT** (`session: { strategy: "jwt" }`)
- Sign-in page: `/login`

## Data model & ownership

- **`User`** — Auth.js + `Category[]`
- **`Category.userId`** — required; root of tenant isolation
- **`TimeBlock`**, **`FocusSession`** — no `userId`; owned via **`category.userId`**

Rule: never read/write private rows with `{ id }` alone.

## Scoped helpers (`src/lib/db/scoped.ts`)

| Helper | Use |
|--------|-----|
| `categoriesForUser(userId, opts?)` | Lists / dropdowns |
| `timeBlocksForUser(userId, opts?)` | Calendar, dashboard, lists |
| `focusSessionsForUser(userId, opts?)` | Focus, dashboard |
| `assertCategoryOwned` | Before category-scoped creates |
| `assertTimeBlockOwned` | Before block update/delete/schedule |
| `assertFocusSessionOwned` | Before focus update/convert |

Errors: `ScopedAccessError` / `isScopedAccessError`.

## Server Action security rules

1. **`requireUser()`** at the start of every business action.
2. **Create** TimeBlock/FocusSession → `assertCategoryOwned(user.id, categoryId)`.
3. **Update/delete** → `assert*Owned` then `updateMany`/`deleteMany` with `category: { userId }`.
4. **Category delete** → count user's TimeBlocks + FocusSessions; redirect `?error=has-records`.
5. **Focus convert** → `assertFocusSessionOwned` + transaction claim `category: { userId }`.

Action files: `categories.ts`, `time-blocks.ts`, `calendar-time-blocks.ts`, `focus-sessions.ts`, `focus-shared.ts` (transaction).

## Docker

| Piece | Path / command |
|-------|----------------|
| Compose | `docker-compose.yml` — services **`db`** (Postgres 16), **`app`** (Next standalone) |
| Image | `Dockerfile` — multi-stage: deps → builder (`prisma generate` + `next build`) → runner |
| Startup | `scripts/docker-entrypoint.sh` — `CREATE SCHEMA IF NOT EXISTS app` → `prisma migrate deploy` → `node server.js` |
| Docs | `docs/DOCKER.md` |

- **Dev (host):** `docker compose up -d db` + `pnpm dev` — `DATABASE_URL` host `localhost`
- **Full stack:** `docker compose up app` — `DATABASE_URL` host `db`; `.env` via `env_file` (optional file)

**No seed data** in Docker startup.

## Env (see `.env.example`)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `NODE_ENV`

Callback: `http://localhost:3000/api/auth/callback/github`

### Auth.js in Docker

- Set `AUTH_URL` to the URL users open in the browser (e.g. `http://localhost:3000`).
- `AUTH_TRUST_HOST=true` when behind Compose port mapping or reverse proxy.
- Do **not** bake `.env` into the image; use Compose `env_file` / platform secrets.

## Local dev

```bash
nvm use && pnpm install
docker compose up -d db
cp .env.example .env   # fill AUTH_* and GitHub keys
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # or migrate dev
pnpm dev
```

## Verification

```bash
pnpm exec prisma generate && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

110 tests; no E2E. Phase 6 completion audit (2026-05-29): all checks green; no unscoped reads in `src/app/**`.

**Audit rules for new code:** pages → `requireUser` + `*ForUser`; actions → `requireUser` + `assert*Owned`; never `update({ where: { id } })` on private models.

Manual dual-GitHub-user checklist: `PROJECT_STATUS.md` §18.10.

## Do NOT add yet

Teams · sharing · invites · payments · password login · dev Credentials in production · E2E (unless asked)

## Security rules (always)

1. Private pages → `requireUser()` + `*ForUser` helpers.
2. Server Actions → `requireUser()` + `assert*Owned`; no `update({ where: { id } })` on private models.
3. Do not query Category / TimeBlock / FocusSession without `userId` / `category.userId` filtering.
4. Do not bypass `src/lib/db/scoped.ts`.
5. Validate category ownership before creating TimeBlock or FocusSession.
6. No Docker seed or shared demo data.

## Next likely tasks (Phase 8)

1. **Sealos deployment** — image registry, app, PostgreSQL, env, domain, OAuth callback, migrations
2. Cross-midnight stats split; focus timer recovery; Review + Focus summary (see `PROJECT_STATUS.md` §16)

Full status: `docs/PROJECT_STATUS.md` §18–§19
