# AI Context — TimeBlock Tracker

Paste at the start of new coding sessions.

## Project

Personal time-block planner + tracker.

- **Phase 1 done**: CRUD, dashboard stats, i18n, tests
- **Phase 2 in progress**: Basic calendar view
- **Done**: Day View MVP + Week View (`/calendar`, both manually verified)
- **Next**: Calendar event detail enhancement; optional block → `/time-blocks` link

## Stack

Next.js 16 App Router · TS · Tailwind 4 · Prisma 7 · PostgreSQL (`app` schema) · pnpm · Node 20+

## Architecture

- Pages: `src/app/` — all data routes `force-dynamic`
- Layout: `app-nav.tsx` (client) + `language-switcher.tsx` (cookie + `router.refresh()`)
- i18n: client `@/lib/i18n` · server `getLocale` from `@/lib/i18n/server` only
- DB: `src/lib/prisma.ts` · Actions: `lib/actions/{categories,time-blocks}.ts` (+ `revalidatePath("/calendar")`)
- Calendar: `src/lib/calendar.ts` (pure) · tests in `calendar.test.ts`
- Tests: `pnpm test` (32 tests, no E2E)

## Routes

| Route | What |
|-------|------|
| `/` | Home + quick links |
| `/categories` | Category CRUD |
| `/time-blocks` | Time block CRUD (create/edit here) |
| `/calendar` | **Week (default) or day** calendar; see query params below |
| `/dashboard` | Summary numbers + per-category hours (no charts) |

## Calendar URL

| Param | Values | Default |
|-------|--------|---------|
| `date` | `YYYY-MM-DD` local | today (invalid → today) |
| `view` | `week` \| `day` | **`week`** (omit `view` = week) |

Examples: `/calendar` · `/calendar?date=2026-05-21` · `/calendar?date=2026-05-21&view=day`

- **Week**: Monday–Sunday week containing `date`; query `getWeekQueryRange`; 7 columns via `getWeekDays` + `layoutBlockInDay` per column
- **Day**: single day `getDayQueryRange`; one column
- **Cross-day blocks**: clipped per day; same block may appear in multiple columns (keys `{id}-{date}`)
- **Edit**: read-only on calendar; footer link to `/time-blocks` (no per-block edit link yet)

## Calendar components

| File | Role |
|------|------|
| `src/app/calendar/page.tsx` | Server page: fetch, nav, view switch |
| `calendar-week-grid.tsx` | 7 columns + headers + hour axis |
| `calendar-day-grid.tsx` | Day view: hour axis + one column |
| `calendar-day-column.tsx` | Shared 24h column (`compact` in week) |
| `calendar-block.tsx` | Positioned block (`category.color`) |

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

## DB (schema `app`)

`DATABASE_URL` must include `?schema=app`.

**Category:** id, name, color, description?  
**TimeBlock:** id, title, note?, start/end, status, completionLevel, categoryId  

Status: `planned` \| `completed` \| `partial` \| `skipped` — UI via `getStatusLabel()`.

## Calendar limitations

- No drag-drop, no click-create, no inline edit on blocks
- Overlapping blocks stack (no columns); light colors + white text may be low contrast
- Week columns `compact` (title only in cell; time in `title` attr)
- Invalid `date` param: content falls back to today; URL not rewritten
- No FullCalendar / shadcn

## Do NOT add yet

Auth · drag on calendar · calendar click-create · chart libs · Pomodoro · recurring events · external calendars · DB schema changes without request

## Next likely task

**Event detail on calendar blocks** (status, completion, note snippet) and/or **link block → `/time-blocks`** for the matching record. Keep read-only calendar unless user asks for edit-on-calendar.

## Commands

```bash
nvm use && pnpm db:generate && pnpm dev
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

Full status: `docs/PROJECT_STATUS.md`
