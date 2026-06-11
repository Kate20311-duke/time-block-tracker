import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/assistant/tomorrow-plan-context", () => ({
  getTomorrowDateParam: vi.fn(() => "2026-06-11"),
  getTomorrowRoutineBlocks: vi.fn(),
}));
vi.mock("@/lib/db/scoped", () => ({
  categoriesForUser: vi.fn(),
  timeBlocksForUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    timeBlock: {
      create: vi.fn(),
    },
  },
}));

import { getTomorrowRoutineBlocks } from "@/lib/assistant/tomorrow-plan-context";
import { applyTomorrowPlanBlocks } from "@/lib/assistant/tomorrow-plan-apply";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import { prisma } from "@/lib/prisma";

const TIME_ZONE = "Asia/Shanghai";
const CATEGORY_ID = "cat-1";

describe("applyTomorrowPlanBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(categoriesForUser).mockResolvedValue([
      { id: CATEGORY_ID },
    ] as Awaited<ReturnType<typeof categoriesForUser>>);
    vi.mocked(timeBlocksForUser).mockResolvedValue([]);
    vi.mocked(getTomorrowRoutineBlocks).mockResolvedValue([]);
  });

  it("skips blocks that conflict with tomorrow routineBlocks", async () => {
    vi.mocked(getTomorrowRoutineBlocks).mockResolvedValue([
      {
        routineId: "routine-1",
        title: "上班",
        categoryId: CATEGORY_ID,
        categoryName: "工作",
        startTime: "2026-06-11T01:00:00.000Z",
        endTime: "2026-06-11T09:00:00.000Z",
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    ]);

    const result = await applyTomorrowPlanBlocks({
      userId: "user-1",
      timeZone: TIME_ZONE,
      blocks: [
        {
          title: "冲突任务",
          categoryId: CATEGORY_ID,
          startTime: "2026-06-11T02:00:00.000Z",
          endTime: "2026-06-11T03:00:00.000Z",
        },
      ],
    });

    expect(result.createdCount).toBe(0);
    expect(result.skippedBlocks).toHaveLength(1);
    expect(result.skippedBlocks[0]?.reason).toBe("conflict_routine");
    expect(prisma.timeBlock.create).not.toHaveBeenCalled();
  });
});
