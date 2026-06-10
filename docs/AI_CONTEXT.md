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
| **9.3–9.5** | **Done** (day layout/overlap; week overview) |
| **9.6** | **Done** (week-view same-day column drag only) |
| **TZ-1** | **Done** (browser TZ cookie + `getUserCalendarTimeZone`) |
| **TZ-2** | **Done** (forms submit UTC ISO; strict server parse) |
| **TZ-3** | **Done** (calendar query/layout/labels use user TZ) |
| **TZ-4** | **Done** (dashboard/review use user TZ) |
| **TZ-4.5** | **Done** (list durations + redirect paths) |
| **TZ-5** | **Done** (audit, tests, docs, deploy checklist) — see `PROJECT_STATUS.md` §33 |
| **UI-1** | **Done** (Dashboard + App Shell from v0 reference) — see `PROJECT_STATUS.md` §34 |
| **UI-2** | **Done** (Focus page UI + stopwatch-first layout) — see `PROJECT_STATUS.md` §35 |
| **UI-3** | **Done** (Review pages v0-style UI) — see `PROJECT_STATUS.md` §36 |
| **UI-4** | **Done** (Categories + Time Blocks list/form UI) — see `PROJECT_STATUS.md` §37 |
| **UI-5** | **Done** (Calendar visual polish + detail panels) — see `PROJECT_STATUS.md` §38 |
| **UI-6** | **Done** (Site-wide polish: loading, empty, toast, confirm) — see `PROJECT_STATUS.md` §39 |
| **Feature-2** | **Done** (Stopwatch pause/resume, complete dialog, dashboard quick start, header timer) — see `PROJECT_STATUS.md` §40 |
| **Product-1** | **Done** (Landing, local demo seed, onboarding, README/deploy docs) — see `PROJECT_STATUS.md` §41 |

## Stack

Next.js 16 App Router · TypeScript · Tailwind 4 · Prisma 7 · PostgreSQL `app` schema · pnpm · Node 20+ · Recharts · Vitest · **Auth.js v5** (`next-auth@beta`)

## Architecture

```
Browser → middleware (auth gate) → App Router pages (requireUser + *ForUser)
                              → Server Actions (requireUser + assert*Owned)
                              → src/lib/db/scoped.ts → prisma
```

- **Public:** `/` (landing when logged out), `/login`, `/api/auth/*`
- **Private:** `/categories`, `/time-blocks`, `/calendar`, `/dashboard`, `/focus`, `/review/*`
- **Layout:** logged-in app routes use `AppShell` (sidebar + header); `/` (logged out) and `/login` use simplified public header (`AppLayoutController`); logged-in `/` → `/dashboard`
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
| `activeFocusSessionForUser(userId, opts?)` | At most one `status in (running, paused)` session |
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
6. **One active focus session per user** — `startStopwatch` / `createFocusSession` call `activeFocusSessionForUser` first (`running` or `paused`).

Action files: `categories.ts`, `time-blocks.ts`, `calendar-time-blocks.ts`, `focus-sessions.ts`, `focus-shared.ts` (transaction).

### Focus modes (Phase 9)

| Mode | Start | End | TimeBlock |
|------|-------|-----|-----------|
| **Pomodoro** | `createFocusSession` (`mode=pomodoro`, countdown client-only) | `completeFocusSession` → optional `convertFocusSessionToTimeBlock` (`source=pomodoro`) | Manual convert step |
| **Stopwatch** | `startStopwatch` | `pauseStopwatch` / `resumeStopwatch` / `completeStopwatchAndCreateTimeBlock` (`source=stopwatch`) or `cancelStopwatch` | Auto on complete |

Duplicate TimeBlock prevention: `updateMany` claim (`convertedToTimeBlock: false`, correct `status`/`mode`) **before** `timeBlock.create` in `convertFocusSessionInTransaction` / `completeStopwatchInTransaction`.

### Stopwatch TimeBlock time semantics (Feature-2)

When a stopwatch completes:

- `TimeBlock.startTime = FocusSession.startTime`
- `TimeBlock.endTime = startTime + **activeDuration**` (excludes pauses — **not** wall-clock end)
- `FocusSession.endTime = wall-clock completion instant`

Dashboard / calendar **stats use TimeBlock only**. Stopwatch blocks represent **recorded active time**, not when the user physically stopped. Pomodoro-converted and manual blocks keep wall-clock `startTime`/`endTime`.

Helpers: `src/lib/focus-session-elapsed.ts`, `completeStopwatchInTransaction` in `focus-shared.ts`.

Complete dialog fields (defaults): title (session → category → `instantRecordTitle`), note (session), status=`completed`, completionLevel=`100`. Cancel dialog → no complete, no TimeBlock.

Dashboard quick start: in-page `startStopwatch` with category name as title; blocked when `activeFocusSessionForUser` returns a session (toast). Header: `GlobalFocusTimerIndicator` from layout query.

### Product-1 — demo experience

- **Landing** (`/`): logged-out users see marketing page; logged-in → `/dashboard`. i18n `landing.*`.
- **Demo seed**: `pnpm db:seed:demo` — **local only**; `DEMO_SEED_USER_EMAIL` after first GitHub login; categories 学习/工作/休息/运动/娱乐 marked `[Demo]` in description. Guard: `src/lib/demo-seed-guard.ts` (localhost unless `DEMO_SEED=1`). Never in Vercel build.
- **Onboarding**: `DashboardOnboardingCard` checklist until user has categories + at least one TimeBlock or FocusSession.
- **Docs**: `README.md`, `docs/DEPLOYMENT.md` (index), `docs/SCREENSHOTS.md`. Demo URL placeholder in README.
- **No** shared production demo account.

Dashboard: TimeBlock totals from `stats.ts` only; FocusSession totals from `focus-stats.ts` only — do not merge the two headline numbers.

### Timezone model (TZ-1–TZ-5)

- **Database:** UTC `DateTime` instants (`startTime` / `endTime`).
- **User TZ:** Browser-detected → cookie **`calendar_time_zone`** (`TimezoneInitializer` in root layout).
- **Server:** `getUserCalendarTimeZone()` — cookie → `NEXT_PUBLIC_CALENDAR_TIMEZONE` → `UTC` (env is **fallback only**).
- **URL `?date=YYYY-MM-DD`:** Local calendar date in `userTimeZone` (`parseCalendarDateParam` — not `new Date("YYYY-MM-DD")`).
- **Queries:** `getDayQueryRange` / `getWeekQueryRange` compute civil boundaries in user TZ, convert to UTC for Prisma overlap filters.
- **Forms:** Browser converts `datetime-local` → `startTimeIso` / `endTimeIso`; Server Actions reject timezone-less schedule fields.
- **Dashboard / Review:** Same model as calendar (`getDashboardDateRanges`, clipped durations via `stats.ts`).
- **Focus:** Sessions attributed by **start time** in user TZ (not overlap-clipped); do not merge Focus + TimeBlock headline totals.
- **Limitations:** No saved per-user TZ preference; traveling users rely on cookie refresh. `getCalendarTimeZone()` / `Asia/Shanghai` remain default args on some helpers only.
- **Manual QA:** `PROJECT_STATUS.md` §33 — NY + Shanghai checklist, Neon UTC check, Vercel smoke test.

### TimeBlock forms (TZ-2)

- **Client:** `TimeBlockDatetimeFields` — `datetime-local` inputs sync hidden `startTimeIso` / `endTimeIso` via `datetimeLocalValueToUtcIso()` (browser local wall time → UTC ISO).
- **Edit defaults:** `instantToDatetimeLocalValue(iso, userTimeZone)` where `userTimeZone` = `getUserCalendarTimeZone()` on the server.
- **Server:** `parseTimeBlockScheduleFromForm` — **requires** valid `startTimeIso` / `endTimeIso`; ignores `startTime` / `endTime` (no server-side datetime-local parse). Missing/invalid ISO → `missing_fields`.
- **Submit sync:** `TimeBlockDatetimeFields` syncs hidden ISO on capture-phase `submit` (via `formId`); blocks submit if conversion fails.
- **Pages:** `/time-blocks` create + edit; calendar create + edit panels. Calendar drag/resize already sent ISO (unchanged).

### Calendar click-to-create / click-to-edit

- **Panel mode:** `resolveCalendarPanelMode` — `create` | `edit` | `null` in `CalendarInteractiveView`.
- **Create:** `createDraft` client state; `CalendarDayColumn` → `slotTimesFromGridClick`; `CalendarBlockCreatePanel`; `createTimeBlockFromCalendar`.
- **Edit:** URL `?blockId=` + server `selectedBlock`; `CalendarBlockEditPanel`; `updateTimeBlockFromCalendar` (preserves `source`; `updateMany` + user scope).
- **Delete:** `deleteTimeBlockFromCalendar` + `DeleteConfirmButton` with `calendarDate`/`calendarView` hidden fields; redirect without `blockId`, `success=deleted`.
- **Revalidate:** `revalidateTimeBlockPaths` — `/calendar`, `/time-blocks`, `/dashboard`, `/review/day`, `/review/week`.
- **Coexistence:** block click clears `createDraft`; empty slot click clears `blockId` from URL.
### completionLevel (deprecated in UX)

- **Hidden from UI** — no form field, list %, Dashboard completion-rate cards, or review average completion.
- **DB column retained** — no migration this phase.
- **Writes:** `resolveCompletionLevelForWrite` in `validation.ts`; create always sets from status; update omits field when absent (preserves existing row).
- **Focus convert / stopwatch** still set `completionLevel: 100` in `focus-shared.ts`.
- **Internal:** `stats.ts` `summarizeCompletionQuality` still reads DB values for skipped/low-efficiency helpers; not shown to users.
- **Future:** schema + stats cleanup phase.

### Reusable TimeBlock form

- **Component:** `src/components/time-block-form.tsx` — `TimeBlockForm` with `mode: create | edit`, `values`, `labels`, `hiddenFields`, optional `showEfficiencyAndReview`.
- **Used by:** `/time-blocks` create, `TimeBlockRow` edit, `CalendarBlockCreatePanel`, `CalendarBlockEditPanel`.
- **Actions:** passed via `action` prop (`createTimeBlock`, `updateTimeBlock`, `createTimeBlockFromCalendar`, `updateTimeBlockFromCalendar`); delete stays in panel/row wrappers.
- **Datetime:** still delegates to `TimeBlockDatetimeFields` (TZ-2 ISO sync unchanged).
- **Calendar create:** `showEfficiencyAndReview={false}` — no efficiency/review fields (same as before refactor).
- **Drag/resize:** implemented — see `Calendar drag & resize` above; cross-column/cross-day not supported.
- **Do not** use `new Date("YYYY-MM-DDTHH:mm")` in Server Actions for user-entered schedule times.

### Calendar layout (Phase 9.3 + TZ-3)

- **Visible segment:** `getVisibleSegmentInDay(block, day, userTimeZone)` → clip to user TZ day bounds from cookie.
- **Multi-block layout:** `layoutBlocksInDay` + `assignOverlapColumns` — overlap uses visible intervals; adjacent blocks do not overlap.
- **Labels:** `formatCalendarBlockTimeLabel` — clipped segments show visible time + `t.calendar.continuedSegment`.
- **Position:** `calendarBlockPositionStyle` — `leftPercent` / `widthPercent` for overlap columns.

### Calendar drag & resize (Phase 9.2–9.6, active)

- **Custom grid** — no third-party DnD library; `CalendarDraggableBlock` + pointer events.
- **Day view:** drag (preserve visible-segment duration) + bottom resize (`enableResize={true}`).
- **Week view:** same-day column drag only (`canDragCalendarColumnBlockInWeekView`); **no resize** (`compact` → `enableResize={false}`).
- **Save:** `updateTimeBlockSchedule` — schedule-only `updateMany`; preserves title/category/status/source/etc.
- **Preview:** 5-min snap (`CALENDAR_SNAP_MINUTES`); clamp 00:00–24:00 user TZ day.
- **Failure:** no optimistic DB write; preview cleared; `onSaveEnd(false)` + `router.refresh()` + `calendar.drag.saveFailed`.
- **Cross-day / cross-column:** not supported.
- **Cross-midnight:** clipped segment drag may save as same-day block.
- **Coexists with:** click-to-create (`onEmptySlotClick` on grid only) and click-to-edit (tap without drag threshold → `onSelect`).

### Week view (Phase 9.4–9.6)

- **Overview + column drag:** same-day blocks only via `canDragCalendarColumnBlockInWeekView`; column `calendarDate` fixes the day (no cross-column).
- **No week resize** — `enableResize={false}` when `compact` week column.
- **Cross-midnight:** not draggable in week view; `CalendarBlock` + `dragDisabledInWeek` hint; use day view to drag/resize.
- **Day view:** full drag + resize (precise edit mode).

### Phase 9.1 — zombie running + category delete

- **Statuses:** `planned` | `running` | `paused` (stopwatch only) | `completed` | `abandoned` | `converted` — stopwatch cancel uses `abandoned` (no `canceled`).
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

175 tests; no E2E. Timezone: `stats-list-duration.test.ts`, `calendar-redirect-timezone.test.ts`.

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
6. No Docker seed or shared demo data in production. Local demo: `pnpm db:seed:demo` (see README § Demo seed).

## Next likely tasks

1. **Settings page** — timezone, locale, profile (optional)
2. Pomodoro refresh recovery (localStorage) — optional
3. Cross-midnight stats; Review + Focus summary

Full status: `docs/PROJECT_STATUS.md` §21、§34–§39
