import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/scoped", () => ({
  assertCategoryOwned: vi.fn(),
  timeBlocksForUser: vi.fn(),
}));

import { assertCategoryOwned, timeBlocksForUser } from "@/lib/db/scoped";
import { ScopedAccessError } from "@/lib/db/scoped-errors";
import {
  buildCategoryTimeBlockKeysetWhere,
  buildCategoryTimeBlockListQuery,
  CATEGORY_TIME_BLOCK_LIST_TAKE,
  isCategoryTimeBlockAfterCursor,
  loadCategoryTimeBlocksForUser,
  mapCategoryTimeBlockListItem,
  parseCategoryTimeBlockCursor,
  resolveCategoryTimeBlockListTake,
  sortCategoryTimeBlocksStable,
} from "./category-time-blocks";

const USER_ID = "user-1";
const CATEGORY_ID = "cat-study";
const TIME_ZONE = "America/New_York";
const SAME_START = "2026-08-26T10:00:00.000Z";

function blockRow(id: string, startIso: string, endIso: string, title = id) {
  return {
    id,
    title,
    startTime: new Date(startIso),
    endTime: new Date(endIso),
  };
}

function paginateInMemory<T extends { startTime: Date; id: string }>(
  rows: readonly T[],
  pageSize: number,
): { sorted: T[]; pages: T[][] } {
  const sorted = sortCategoryTimeBlocksStable(rows);
  const pages: T[][] = [];
  let cursor: { startTime: Date; id: string } | null = null;
  let remaining: T[] = sorted;

  while (remaining.length > 0) {
    const currentCursor = cursor;
    const filtered: T[] = currentCursor
      ? remaining.filter((row) =>
          isCategoryTimeBlockAfterCursor(row, currentCursor),
        )
      : remaining;
    const page: T[] = filtered.slice(0, pageSize);
    if (page.length === 0) {
      break;
    }
    pages.push(page);
    const last = page.at(-1);
    if (!last || page.length < pageSize) {
      break;
    }
    cursor = last;
    remaining = filtered;
  }

  return { sorted, pages };
}

describe("resolveCategoryTimeBlockListTake", () => {
  it("defaults to 20 and never exceeds 20", () => {
    expect(resolveCategoryTimeBlockListTake()).toBe(20);
    expect(resolveCategoryTimeBlockListTake(100)).toBe(20);
    expect(resolveCategoryTimeBlockListTake(10_000)).toBe(20);
    expect(resolveCategoryTimeBlockListTake(0)).toBe(20);
    expect(resolveCategoryTimeBlockListTake(-3)).toBe(20);
    expect(resolveCategoryTimeBlockListTake(7)).toBe(7);
  });
});

describe("parseCategoryTimeBlockCursor", () => {
  it("treats missing cursor as the first page", () => {
    expect(parseCategoryTimeBlockCursor(undefined)).toEqual({
      ok: true,
      cursor: null,
    });
    expect(parseCategoryTimeBlockCursor(null)).toEqual({
      ok: true,
      cursor: null,
    });
    expect(parseCategoryTimeBlockCursor("")).toEqual({
      ok: true,
      cursor: null,
    });
  });

  it("parses a valid cursor", () => {
    const result = parseCategoryTimeBlockCursor({
      startTime: SAME_START,
      id: "tb-b",
    });
    expect(result).toEqual({
      ok: true,
      cursor: {
        startTime: new Date(SAME_START),
        id: "tb-b",
      },
    });
  });

  it("rejects malformed cursors", () => {
    expect(parseCategoryTimeBlockCursor("not-json")).toEqual({ ok: false });
    expect(parseCategoryTimeBlockCursor(12)).toEqual({ ok: false });
    expect(parseCategoryTimeBlockCursor({ id: "tb-1" })).toEqual({ ok: false });
    expect(
      parseCategoryTimeBlockCursor({ startTime: SAME_START, id: "  " }),
    ).toEqual({ ok: false });
    expect(
      parseCategoryTimeBlockCursor({ startTime: "not-a-date", id: "tb-1" }),
    ).toEqual({ ok: false });
  });
});

describe("buildCategoryTimeBlockListQuery", () => {
  it("scopes by categoryId, sorts startTime+id desc, and caps take at 20", () => {
    expect(buildCategoryTimeBlockListQuery(" cat-study ")).toEqual({
      where: { categoryId: "cat-study" },
      orderBy: [{ startTime: "desc" }, { id: "desc" }],
      take: CATEGORY_TIME_BLOCK_LIST_TAKE,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    });
    expect(buildCategoryTimeBlockListQuery(CATEGORY_ID, 999).take).toBe(20);
    expect(buildCategoryTimeBlockListQuery(CATEGORY_ID, 10_000).take).toBe(20);
  });

  it("adds a keyset where after a cursor", () => {
    const cursor = { startTime: new Date(SAME_START), id: "tb-b" };
    expect(buildCategoryTimeBlockKeysetWhere(CATEGORY_ID, cursor)).toEqual({
      AND: [
        { categoryId: CATEGORY_ID },
        {
          OR: [
            { startTime: { lt: cursor.startTime } },
            {
              AND: [
                { startTime: cursor.startTime },
                { id: { lt: "tb-b" } },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("same startTime keyset pagination", () => {
  it("pages without duplicates, skips, or order drift", () => {
    const rows = [
      blockRow("c", SAME_START, "2026-08-26T11:00:00.000Z"),
      blockRow("a", SAME_START, "2026-08-26T11:00:00.000Z"),
      blockRow("b", SAME_START, "2026-08-26T11:00:00.000Z"),
      blockRow("d", "2026-08-25T10:00:00.000Z", "2026-08-25T11:00:00.000Z"),
    ];
    const { sorted, pages } = paginateInMemory(rows, 2);

    expect(sorted.map((row) => row.id)).toEqual(["c", "b", "a", "d"]);
    expect(pages.map((page) => page.map((row) => row.id))).toEqual([
      ["c", "b"],
      ["a", "d"],
    ]);

    const seen = pages.flat().map((row) => row.id);
    expect(new Set(seen).size).toBe(rows.length);
    expect(seen).toEqual(sorted.map((row) => row.id));
  });
});

describe("mapCategoryTimeBlockListItem", () => {
  it("formats date, time range, and duration in the user calendar timezone", () => {
    const item = mapCategoryTimeBlockListItem(
      blockRow(
        "tb-1",
        "2026-08-26T13:00:00.000Z",
        "2026-08-26T14:30:00.000Z",
        "IELTS Reading",
      ),
      TIME_ZONE,
      "en",
    );

    expect(item.title).toBe("IELTS Reading");
    expect(item.dateLabel).toContain("Aug");
    expect(item.dateLabel).toContain("26");
    expect(item.timeRangeLabel).toMatch(/9:00/);
    expect(item.timeRangeLabel).toMatch(/10:30/);
    expect(item.durationLabel).toBe("1h 30min");
  });
});

describe("loadCategoryTimeBlocksForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCategoryOwned).mockResolvedValue({
      id: CATEGORY_ID,
    } as Awaited<ReturnType<typeof assertCategoryOwned>>);
  });

  it("returns the first page of TimeBlocks for an owned category", async () => {
    const newest = blockRow(
      "tb-new",
      "2026-08-26T13:00:00.000Z",
      "2026-08-26T14:00:00.000Z",
      "Newest",
    );
    const older = blockRow(
      "tb-old",
      "2026-08-25T18:00:00.000Z",
      "2026-08-25T19:00:00.000Z",
      "Older",
    );
    vi.mocked(timeBlocksForUser).mockResolvedValue(
      [newest, older] as unknown as Awaited<
        ReturnType<typeof timeBlocksForUser>
      >,
    );

    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      userTimeZone: TIME_ZONE,
      locale: "en",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks.map((block) => block.title)).toEqual([
      "Newest",
      "Older",
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(assertCategoryOwned).toHaveBeenCalledWith(USER_ID, CATEGORY_ID);
  });

  it("queries startTime+id desc and fetches one extra row to detect hasMore", async () => {
    vi.mocked(timeBlocksForUser).mockResolvedValue([]);

    await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: `  ${CATEGORY_ID}  `,
      userTimeZone: TIME_ZONE,
      locale: "zh",
    });

    expect(timeBlocksForUser).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        where: { categoryId: CATEGORY_ID },
        orderBy: [{ startTime: "desc" }, { id: "desc" }],
        take: CATEGORY_TIME_BLOCK_LIST_TAKE + 1,
      }),
    );
  });

  it("returns at most 20 TimeBlocks and a nextCursor when more exist", async () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      blockRow(
        `tb-${String(index).padStart(3, "0")}`,
        new Date(Date.UTC(2026, 7, 26, 20 - index, 0, 0)).toISOString(),
        new Date(Date.UTC(2026, 7, 26, 21 - index, 0, 0)).toISOString(),
      ),
    );
    vi.mocked(timeBlocksForUser).mockResolvedValue(
      rows as unknown as Awaited<ReturnType<typeof timeBlocksForUser>>,
    );

    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      userTimeZone: TIME_ZONE,
      locale: "en",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks).toHaveLength(20);
    expect(result.blocks[0]?.id).toBe("tb-000");
    expect(result.blocks.at(-1)?.id).toBe("tb-019");
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toEqual({
      startTime: rows[19]?.startTime.toISOString(),
      id: "tb-019",
    });
  });

  it("returns a short last page with no nextCursor", async () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      blockRow(
        `tb-${index}`,
        new Date(Date.UTC(2026, 7, 1, 12 - index, 0, 0)).toISOString(),
        new Date(Date.UTC(2026, 7, 1, 13 - index, 0, 0)).toISOString(),
      ),
    );
    vi.mocked(timeBlocksForUser).mockResolvedValue(
      rows as unknown as Awaited<ReturnType<typeof timeBlocksForUser>>,
    );

    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      userTimeZone: TIME_ZONE,
      locale: "en",
      cursor: { startTime: SAME_START, id: "tb-prev" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks).toHaveLength(7);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(timeBlocksForUser).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        where: buildCategoryTimeBlockKeysetWhere(CATEGORY_ID, {
          startTime: new Date(SAME_START),
          id: "tb-prev",
        }),
        take: CATEGORY_TIME_BLOCK_LIST_TAKE + 1,
      }),
    );
  });

  it("does not query when the cursor is malformed", async () => {
    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      userTimeZone: TIME_ZONE,
      locale: "en",
      cursor: { startTime: "nope", id: "tb-1" },
    });

    expect(result).toEqual({ ok: false, error: "load_failed" });
    expect(assertCategoryOwned).not.toHaveBeenCalled();
    expect(timeBlocksForUser).not.toHaveBeenCalled();
  });

  it("cannot paginate another user's category", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: "someone-elses-category",
      userTimeZone: TIME_ZONE,
      locale: "en",
      cursor: { startTime: SAME_START, id: "tb-1" },
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(timeBlocksForUser).not.toHaveBeenCalled();
  });

  it("treats an empty categoryId as not found without querying TimeBlocks", async () => {
    const result = await loadCategoryTimeBlocksForUser({
      userId: USER_ID,
      categoryId: "   ",
      userTimeZone: TIME_ZONE,
      locale: "en",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(assertCategoryOwned).not.toHaveBeenCalled();
    expect(timeBlocksForUser).not.toHaveBeenCalled();
  });
});
