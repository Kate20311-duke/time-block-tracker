# AI Context — TimeBlock Tracker

Paste at the start of new coding sessions.

## Project

Personal time-block planner + tracker.

- **Phase 1 done**: Category/TimeBlock CRUD, basic dashboard, i18n, tests
- **Phase 2.5 done**: Calendar day/week views + inline edit + drag + resize
- **Phase 3 done (v1)**: Dashboard stats utilities + dashboard cards + basic charts (Recharts)
- **Phase 4 done (v1)**: Completion tracking + review pages + dashboard completion metrics
  - UI: edit status/completion/efficiency/reviewNote on `/time-blocks` and `/calendar`
  - Review: `/review/day` and `/review/week`
  - Stats: `summarizeCompletionQuality(...)`

## Stack

Next.js 16 App Router · TS · Tailwind 4 · Prisma 7 · PostgreSQL (`app` schema) · pnpm · Node 20+ · Recharts

## Local dev (Mac + Docker)

- **DB**: Docker Desktop + `docker compose up -d`
- **Env**: `cp .env.example .env` and set `DATABASE_URL` (must include `?schema=app`)
- **Prisma**: `pnpm prisma generate` then `pnpm prisma migrate dev`
- **App**: `pnpm dev` → `http://localhost:3000`
- **Stop DB**: `docker compose down` (avoid `docker compose down -v` unless you want to wipe data)

## Architecture

- Pages: `src/app/` — all data routes `force-dynamic`
- Layout: `app-nav.tsx` (client) + `language-switcher.tsx` (cookie + `router.refresh()`)
- i18n: client `@/lib/i18n` · server `getLocale` from `@/lib/i18n/server` only
- DB: `src/lib/prisma.ts`
- Actions: `lib/actions/{categories,time-blocks,calendar-time-blocks}.ts` (+ `revalidatePath("/calendar")`)
- Calendar: `src/lib/calendar.ts` (pure; includes snap/move/resize helpers) · tests in `calendar.test.ts`
- Tests: `pnpm test` (54 tests, no E2E)

## Routes

| Route | What |
|-------|------|
| `/` | Home + quick links |
| `/categories` | Category CRUD |
| `/time-blocks` | Time block CRUD (create/edit here) |
| `/calendar` | **Week (default) or day** calendar; see query params below |
| `/dashboard` | Today + current week stats + category breakdown + basic charts |
| `/review/day` | Daily review (summary + blocks) |
| `/review/week` | Weekly review (summary + daily breakdown + items) |

## Calendar URL

| Param | Values | Default |
|-------|--------|---------|
| `date` | `YYYY-MM-DD` local | today (invalid → today) |
| `view` | `week` \| `day` | **`week`** (omit `view` = week) |

Examples: `/calendar` · `/calendar?date=2026-05-21` · `/calendar?date=2026-05-21&view=day`

- **Week**: Monday–Sunday week containing `date`; query `getWeekQueryRange`; 7 columns via `getWeekDays` + `layoutBlockInDay` per column
- **Day**: single day `getDayQueryRange`; one column
- **Cross-day blocks**: clipped per day; same block may appear in multiple columns (keys `{id}-{date}`)
- **Edit**: selecting a block opens an inline edit panel on `/calendar` (save redirects back to calendar)
- **Move/Resize**: drag within a day column updates schedule via server action, then refreshes calendar data

## Calendar components

| File | Role |
|------|------|
| `src/app/calendar/page.tsx` | Server page: fetch, nav, view switch |
| `calendar-week-grid.tsx` | 7 columns + headers + hour axis |
| `calendar-day-grid.tsx` | Day view: hour axis + one column |
| `calendar-day-column.tsx` | Shared 24h column (`compact` in week) |
| `calendar-block.tsx` | Positioned block (`category.color`) |
| `calendar-draggable-block.tsx` | Drag-to-move + bottom resize handle (pointer events) |
| `calendar-interactive-view.tsx` | Selection + inline edit panel + refresh/error UX |
| `calendar-block-edit-panel.tsx` | Full edit form (save redirects back to `/calendar`) |

## Key `src/lib/calendar.ts`

| Function | Purpose |
|----------|---------|
| `parseCalendarDateParam` | `date` → start of day; fallback today |
| `parseCalendarViewParam` | `view` → `day` or default `week` |
| `formatCalendarDateParam` | Date → `YYYY-MM-DD` for links |
| `startOfWeekMonday` / `endOfWeekMonday` | Mon 00:00 … next Mon 00:00 |
| `getWeekDays` | Mon–Sun (7 dates) |
| `getWeekQueryRange` / `getDayQueryRange` | Prisma overlap bounds |
| `addCalendarDays` / `addCalendarWeeks` | Nav anchors |
| `layoutBlockInDay` | Clip + % top/height for one day |
| `formatWeekRangeHeading` / `formatCalendarColumnHeading` | Headings |
| `CALENDAR_SNAP_MINUTES` | Snap interval (currently 5 minutes) |
| `MIN_TIME_BLOCK_DURATION_MINUTES` | Minimum duration for move/resize (minutes) |
| `calculateMovedRange` | Move start within a day (preserve duration; clamp 00:00–24:00) |
| `calculateResizedRange` | Resize end within a day (endTime only; min duration; clamp) |

## DB (schema `app`)

`DATABASE_URL` must include `?schema=app`.

**Category:** id, name, color, description?  
**TimeBlock:** id, title, note?, reviewNote?, start/end, status, completionLevel, efficiencyLevel?, categoryId  

Status: `planned` \| `completed` \| `partial` \| `skipped` — UI via `getStatusLabel()`.

## Phase 4 fields (completion + review)

- `status` (string): planned | completed | partial | skipped
- `completionLevel` (int): 0–100
- `efficiencyLevel` (string?, optional): low | medium | high
- `reviewNote` (string?, optional): short reflection after the block

Saved via shared form parsing + validation in `src/lib/actions/time-block-shared.ts` (UI may omit these fields; null is allowed).

## Phase 4.2 UI (editing)

- `/time-blocks`: create + inline edit support `efficiencyLevel` and `reviewNote`
- `/calendar`: edit panel supports `efficiencyLevel` and `reviewNote`

## Phase 4.3 stats (completion quality)

- `summarizeCompletionQuality(blocks, categories?)` in `src/lib/stats.ts`
- `dailyCompletionQualityForSelectedWeek(blocks, weekStart, categories?)` in `src/lib/stats.ts`
- Rules:
  - `completed`: full duration counts as completed minutes
  - `skipped`: full duration counts as skipped minutes
  - `partial`: completed minutes = duration * completionLevel%
  - `planned`: completed minutes = 0

## Phase 4.4 daily review

- Route: `/review/day` (server page)
- Query: `?date=YYYY-MM-DD` (local, falls back to today)
- Shows: daily blocks, completion summary (via `summarizeCompletionQuality`), category breakdown, incomplete/skipped list, reviewNote

## Phase 4.5 weekly review

- Route: `/review/week` (server page)
- Query: `?date=YYYY-MM-DD` (local, uses the week containing the date; Monday-start)
- Shows: weekly completion summary, category breakdown, completion-by-category, Mon–Sun daily breakdown, items to review

## Phase 4.6 dashboard integration

- `/dashboard` now shows weekly completion quality metrics (planned, estimated completed, completion rate, average completion, skipped time)
- Uses `summarizeCompletionQuality(...)` from `src/lib/stats.ts`
- Links to `/review/day` and `/review/week`

## Dashboard (Phase 3)

- **Date conventions (local time)**:
  - **Today**: local 00:00 … next day 00:00 (exclusive)
  - **Week**: **Monday-start** week (Mon 00:00 … next Mon 00:00, exclusive) — consistent with `src/lib/calendar.ts`
- **Current querying (simple)**: Dashboard queries only the TimeBlocks whose **`startTime` falls within** today/week ranges.
- **Current time accounting (simple)**: cross-midnight blocks are counted fully toward the day/week where they **start** (documented limitation).
- **Charts**: Recharts rendered in a dedicated client component (`"use client"`), server page remains server-rendered for data fetching.

## Calendar limitations

- No click-create / blank-space creation
- Overlapping blocks stack (no columns); light colors + white text may be low contrast
- Week columns `compact` (title only in cell; time in `title` attr)
- Invalid `date` param: content falls back to today; URL not rewritten
- No FullCalendar / shadcn
- No conflict detection, no undo
- No recurring events, no external calendar sync
- No cross-column week dragging (date does not change by drag)

## Do NOT add yet

Auth · calendar click-create · additional chart libraries · Pomodoro · recurring events · external calendars · DB schema changes without request

## Next likely task

Phase 5: improve stats accuracy (split cross-midnight duration per day), refine review filters/UX, and expand completion-quality visuals (keep dependencies light).

## Commands

```bash
nvm use
pnpm install
docker compose up -d
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

Full status: `docs/PROJECT_STATUS.md`
