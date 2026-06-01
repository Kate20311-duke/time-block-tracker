# AI Context — TimeBlock Tracker

Paste at the start of new coding sessions.

## Project

Personal time-block planner + Pomodoro + **stopwatch** focus tracker. **Phase 9:** stopwatch → auto TimeBlock.

| Phase | Status |
|-------|--------|
| 1–7 | Done |
| **8A** | **Done** (Vercel + Neon deployment guide) |
| **9** | **Done** (stopwatch / positive timer on `/focus`) |
| **9.2** | **Done** (calendar drag stability — day view only) |
| **Next** | Focus page UI polish — see `PROJECT_STATUS.md` §21.9 |

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
- **`FocusSession.mode`**: `pomodoro` | `stopwatch` (default `pomodoro`)
- **`TimeBlock.source`**: `manual` | `pomodoro` | `stopwatch` (default `manual`)

Rule: never read/write private rows with `{ id }` alone.

## Scoped helpers (`src/lib/db/scoped.ts`)

| Helper | Use |
|--------|-----|
| `categoriesForUser(userId, opts?)` | Lists / dropdowns |
| `timeBlocksForUser(userId, opts?)` | Calendar, dashboard, lists |
| `focusSessionsForUser(userId, opts?)` | Focus, dashboard |
| `runningFocusSessionForUser(userId, opts?)` | At most one `status=running` session |
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
6. **One running focus session per user** — `startStopwatch` / `createFocusSession` call `runningFocusSessionForUser` first.

Action files: `categories.ts`, `time-blocks.ts`, `calendar-time-blocks.ts`, `focus-sessions.ts`, `focus-shared.ts` (transaction).

### Focus modes (Phase 9)

| Mode | Start | End | TimeBlock |
|------|-------|-----|-----------|
| **Pomodoro** | `createFocusSession` (`mode=pomodoro`, countdown client-only) | `completeFocusSession` → optional `convertFocusSessionToTimeBlock` (`source=pomodoro`) | Manual convert step |
| **Stopwatch** | `startStopwatch` | `completeStopwatchAndCreateTimeBlock` (`source=stopwatch`) or `cancelStopwatch` | Auto on complete |

Duplicate TimeBlock prevention: `updateMany` claim (`convertedToTimeBlock: false`, correct `status`/`mode`) **before** `timeBlock.create` in `convertFocusSessionInTransaction` / `completeStopwatchInTransaction`.

Dashboard: TimeBlock totals from `stats.ts` only; FocusSession totals from `focus-stats.ts` only — do not merge the two headline numbers.

### Calendar drag (Phase 9.2)

- **Day view:** drag uses `layout.visibleStart` / `visibleEnd` (not full block ISO) for duration + save via `updateTimeBlockSchedule`.
- **Preview + save:** `calculateSnappedDragTopPx` → 5-min snap during move and on release (`CALENDAR_SNAP_MINUTES`).
- **Week view:** drag **disabled**; `CalendarBlock` only; hint `t.calendar.drag.dayViewOnly`.
- **Cross-midnight:** dragging a clipped segment may save as a **same-day** block (documented limitation). No cross-day drag this phase.
- **Resize:** bottom handle only; `stopPropagation`; uses visible segment start for `calculateResizedRange`.

### Phase 9.1 — zombie running + category delete

- **Statuses:** `planned` | `running` | `completed` | `abandoned` | `converted` — stopwatch cancel uses `abandoned` (no `canceled`).
- **FocusHistory:** always lists recent sessions; banner if `running` vs only non-completed; running rows call `abandonFocusSession` or `cancelStopwatch`.
- **Pomodoro after refresh:** `orphanRunningPomodoro` on `/focus` → abandon via server (`focus-timer.tsx`).
- **Category delete:** block on TimeBlocks + non-`abandoned` FocusSessions; in transaction `deleteMany` `abandoned` then delete category. Helpers: `src/lib/focus-session-status.ts`.

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

## Deployment paths

| Path | Doc | Notes |
|------|-----|-------|
| **Dev + deploy workflow** | `docs/WORKFLOW.md` | **Local first, then push to Vercel** |
| **Local dev** | `docs/DOCKER.md` | `docker compose up -d db` + `pnpm dev` |
| **Docker full stack** | `docs/DOCKER.md` | Phase 7 `Dockerfile` + Compose `app` |
| **Vercel + Neon** | `docs/DEPLOYMENT_VERCEL_NEON.md` | First-time setup; manual `migrate deploy` to Neon |
| **Sealos (future 8B)** | `docs/DOCKER.md` | Reuse Docker image |

Vercel build: `pnpm run build` (`prisma generate && next build`). **Do not** run migrate in Vercel build by default.

Neon `DATABASE_URL` must include `?schema=app`. Prefer Neon **pooled** URL in Vercel production env.

## Env (see `.env.example`)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `NODE_ENV`

Callback: `http://localhost:3000/api/auth/callback/github`

### Auth.js in Docker

- Set `AUTH_URL` to the URL users open in the browser (e.g. `http://localhost:3000`).
- `AUTH_TRUST_HOST=true` when behind Compose port mapping or reverse proxy.
- Do **not** bake `.env` into the image; use Compose `env_file` / platform secrets.

## Local dev

See **`docs/WORKFLOW.md`** for daily dev + deploy. Quick start:

```bash
nvm use && pnpm install
docker compose up -d db
cp .env.example .env   # fill AUTH_* and GitHub keys (localhost OAuth)
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # or migrate dev
pnpm dev
```

## Verification

```bash
pnpm exec prisma generate && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

113 tests; no E2E. Phase 9: `stopwatch-complete.test.ts`, `formatStopwatchElapsed` in `focus.test.ts`.

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

## Next likely tasks

1. **Focus page UI polish** — layout, mode badges, history `mode`/`source` labels
2. Pomodoro refresh recovery (localStorage) — optional
3. Cross-midnight stats; Review + Focus summary

Full status: `docs/PROJECT_STATUS.md` §21
