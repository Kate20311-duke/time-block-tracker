import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { applyTomorrowPlanBlocks } from "@/lib/assistant/tomorrow-plan-apply";
import { getTomorrowDateParam } from "@/lib/assistant/tomorrow-plan-context";
import {
  formatCalendarDateParamInTimeZone,
  getDayBoundsForDateParam,
} from "@/lib/calendar-timezone";
import { prisma } from "@/lib/prisma";

const TEST_TIMEZONE = "Asia/Shanghai";
const TEST_MARKER = "[apply-integration-test]";

function tomorrowAt(hour: number, minute: number): Date {
  const tomorrowDate = getTomorrowDateParam(TEST_TIMEZONE);
  const { dayStart } = getDayBoundsForDateParam(tomorrowDate, TEST_TIMEZONE);
  return new Date(dayStart.getTime() + hour * 3_600_000 + minute * 60_000);
}

describe("applyTomorrowPlanBlocks integration", () => {
  let userId = "";
  let categoryId = "";
  const createdBlockIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      select: { id: true },
    });
    if (!user) {
      throw new Error("No User in database — sign in locally once before running tests.");
    }
    userId = user.id;

    let category = await prisma.category.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: `${TEST_MARKER} category`,
          color: "#6366f1",
        },
        select: { id: true },
      });
    }
    categoryId = category.id;

    const conflictStart = tomorrowAt(14, 0);
    const conflictEnd = tomorrowAt(15, 0);
    const seeded = await prisma.timeBlock.create({
      data: {
        title: `${TEST_MARKER} existing conflict`,
        categoryId,
        startTime: conflictStart,
        endTime: conflictEnd,
        status: "planned",
        completionLevel: 0,
        source: "manual",
      },
      select: { id: true },
    });
    createdBlockIds.push(seeded.id);
  });

  afterAll(async () => {
    if (createdBlockIds.length > 0) {
      await prisma.timeBlock.deleteMany({
        where: { id: { in: createdBlockIds } },
      });
    }
  });

  it("creates a valid tomorrow block", async () => {
    const start = tomorrowAt(9, 0);
    const end = tomorrowAt(10, 0);
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} morning focus`,
          categoryId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.createdBlocks[0]?.title).toContain(TEST_MARKER);
    expect(result.calendarUrl).toContain("/calendar?date=");
    createdBlockIds.push(result.createdBlocks[0]!.id);
  });

  it("skips duplicate block on second apply", async () => {
    const start = tomorrowAt(9, 0);
    const end = tomorrowAt(10, 0);
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} morning focus`,
          categoryId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedBlocks[0]?.reason).toBe("duplicate");
  });

  it("skips conflict with existing time block", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} overlap existing`,
          categoryId,
          startTime: tomorrowAt(14, 30).toISOString(),
          endTime: tomorrowAt(15, 30).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks[0]?.reason).toBe("conflict_existing");
  });

  it("skips overlap between two blocks in the same request", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} batch A`,
          categoryId,
          startTime: tomorrowAt(6, 0).toISOString(),
          endTime: tomorrowAt(7, 0).toISOString(),
        },
        {
          title: `${TEST_MARKER} batch B overlap`,
          categoryId,
          startTime: tomorrowAt(6, 30).toISOString(),
          endTime: tomorrowAt(7, 30).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(["conflict_existing", "conflict_batch"]).toContain(
      result.skippedBlocks[0]?.reason,
    );
    createdBlockIds.push(result.createdBlocks[0]!.id);
  });

  it("skips invalid categoryId", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} bad category`,
          categoryId: "nonexistent-category-id",
          startTime: tomorrowAt(18, 0).toISOString(),
          endTime: tomorrowAt(19, 0).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks[0]?.reason).toBe("invalid_category");
  });

  it("skips block outside tomorrow", async () => {
    const todayDate = formatCalendarDateParamInTimeZone(
      new Date(),
      TEST_TIMEZONE,
    );
    const { dayStart } = getDayBoundsForDateParam(todayDate, TEST_TIMEZONE);
    const start = new Date(dayStart.getTime() + 10 * 3_600_000);
    const end = new Date(dayStart.getTime() + 11 * 3_600_000);

    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} not tomorrow`,
          categoryId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks[0]?.reason).toBe("not_tomorrow");
  });

  it("skips unreasonable duration", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} too short`,
          categoryId,
          startTime: tomorrowAt(20, 0).toISOString(),
          endTime: tomorrowAt(20, 2).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks[0]?.reason).toBe("invalid_duration");
  });

  it("skips invalid fields", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: "   ",
          categoryId,
          startTime: tomorrowAt(21, 0).toISOString(),
          endTime: tomorrowAt(22, 0).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks[0]?.reason).toBe("invalid_fields");
  });

  it("allows adjacent blocks without conflict", async () => {
    const result = await applyTomorrowPlanBlocks({
      userId,
      timeZone: TEST_TIMEZONE,
      blocks: [
        {
          title: `${TEST_MARKER} adjacent A`,
          categoryId,
          startTime: tomorrowAt(22, 0).toISOString(),
          endTime: tomorrowAt(23, 0).toISOString(),
        },
        {
          title: `${TEST_MARKER} adjacent B`,
          categoryId,
          startTime: tomorrowAt(23, 0).toISOString(),
          endTime: tomorrowAt(23, 30).toISOString(),
        },
      ],
    });

    expect(result.createdCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    for (const block of result.createdBlocks) {
      createdBlockIds.push(block.id);
    }
  });
});
