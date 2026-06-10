/**
 * Local demo seed — NEVER run against production unless DEMO_SEED=1 is explicitly set.
 *
 * Usage:
 *   1. Log in once locally (GitHub OAuth) so your User row exists.
 *   2. Set DEMO_SEED_USER_EMAIL in .env to that GitHub email.
 *   3. pnpm db:seed:demo
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../src/generated/prisma";
import {
  assertDemoSeedAllowed,
  DEMO_SEED_MARKER,
} from "../src/lib/demo-seed-guard";

const DEMO_CATEGORIES = [
  { name: "学习", color: "#6366f1", description: `${DEMO_SEED_MARKER} 本地演示分类` },
  { name: "工作", color: "#0ea5e9", description: `${DEMO_SEED_MARKER} 本地演示分类` },
  { name: "休息", color: "#22c55e", description: `${DEMO_SEED_MARKER} 本地演示分类` },
  { name: "运动", color: "#f59e0b", description: `${DEMO_SEED_MARKER} 本地演示分类` },
  { name: "娱乐", color: "#ec4899", description: `${DEMO_SEED_MARKER} 本地演示分类` },
] as const;

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function atHour(base: Date, hour: number, minute = 0): Date {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
}

async function main(): Promise<void> {
  const guard = assertDemoSeedAllowed();
  if (!guard.ok) {
    console.error(`Demo seed aborted: ${guard.reason}`);
    process.exit(1);
  }

  const email = process.env.DEMO_SEED_USER_EMAIL?.trim();
  if (!email) {
    console.error(
      "Set DEMO_SEED_USER_EMAIL in .env to your GitHub email (after first local login).",
    );
    process.exit(1);
  }

  const prisma = createPrisma();

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(
        `No User found for ${email}. Sign in locally once, then re-run seed.`,
      );
      process.exit(1);
    }

    const existingDemo = await prisma.category.findFirst({
      where: {
        userId: user.id,
        description: { contains: DEMO_SEED_MARKER },
      },
    });

    if (existingDemo && process.env.DEMO_SEED_FORCE !== "1") {
      console.log(
        "Demo categories already exist for this user. Set DEMO_SEED_FORCE=1 to re-seed.",
      );
      process.exit(0);
    }

    if (existingDemo && process.env.DEMO_SEED_FORCE === "1") {
      const demoCategories = await prisma.category.findMany({
        where: { userId: user.id, description: { contains: DEMO_SEED_MARKER } },
        select: { id: true },
      });
      const demoCategoryIds = demoCategories.map((c) => c.id);

      await prisma.timeBlock.deleteMany({
        where: { categoryId: { in: demoCategoryIds } },
      });
      await prisma.focusSession.deleteMany({
        where: { categoryId: { in: demoCategoryIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: demoCategoryIds } },
      });
      console.log("Removed previous demo data.");
    }

    const categoryRecords = await Promise.all(
      DEMO_CATEGORIES.map((cat) =>
        prisma.category.create({
          data: {
            userId: user.id,
            name: cat.name,
            color: cat.color,
            description: cat.description,
          },
        }),
      ),
    );

    const byName = Object.fromEntries(categoryRecords.map((c) => [c.name, c]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeBlockSpecs = [
      {
        dayOffset: -6,
        category: "学习",
        title: `${DEMO_SEED_MARKER} 晨读`,
        start: [8, 0],
        end: [9, 30],
        status: "completed",
        completionLevel: 100,
        source: "manual",
      },
      {
        dayOffset: -5,
        category: "工作",
        title: `${DEMO_SEED_MARKER} 项目开发`,
        start: [10, 0],
        end: [12, 0],
        status: "completed",
        completionLevel: 90,
        source: "manual",
      },
      {
        dayOffset: -4,
        category: "运动",
        title: `${DEMO_SEED_MARKER} 跑步`,
        start: [18, 0],
        end: [18, 45],
        status: "completed",
        completionLevel: 100,
        source: "stopwatch",
      },
      {
        dayOffset: -3,
        category: "学习",
        title: `${DEMO_SEED_MARKER} 复习笔记`,
        start: [14, 0],
        end: [15, 0],
        status: "partial",
        completionLevel: 60,
        source: "manual",
      },
      {
        dayOffset: -2,
        category: "工作",
        title: `${DEMO_SEED_MARKER} 会议`,
        start: [15, 30],
        end: [16, 30],
        status: "completed",
        completionLevel: 100,
        source: "manual",
      },
      {
        dayOffset: -1,
        category: "娱乐",
        title: `${DEMO_SEED_MARKER} 放松`,
        start: [20, 0],
        end: [21, 30],
        status: "completed",
        completionLevel: 100,
        source: "manual",
      },
      {
        dayOffset: 0,
        category: "工作",
        title: `${DEMO_SEED_MARKER} 今日专注`,
        start: [9, 0],
        end: [11, 0],
        status: "planned",
        completionLevel: 0,
        source: "manual",
      },
      {
        dayOffset: -2,
        category: "休息",
        title: `${DEMO_SEED_MARKER} 午休`,
        start: [12, 0],
        end: [13, 0],
        status: "skipped",
        completionLevel: 0,
        source: "manual",
      },
    ] as const;

    for (const spec of timeBlockSpecs) {
      const day = addDays(today, spec.dayOffset);
      const category = byName[spec.category];
      if (!category) continue;

      await prisma.timeBlock.create({
        data: {
          title: spec.title,
          note: `${DEMO_SEED_MARKER} 演示数据`,
          categoryId: category.id,
          startTime: atHour(day, spec.start[0], spec.start[1]),
          endTime: atHour(day, spec.end[0], spec.end[1]),
          status: spec.status,
          completionLevel: spec.completionLevel,
          source: spec.source,
        },
      });
    }

    const focusSpecs = [
      {
        dayOffset: -5,
        category: "学习",
        mode: "pomodoro",
        status: "converted",
        planned: 25,
        actual: 25,
        converted: true,
      },
      {
        dayOffset: -3,
        category: "工作",
        mode: "stopwatch",
        status: "converted",
        planned: 1,
        actual: 45,
        converted: true,
      },
      {
        dayOffset: -1,
        category: "学习",
        mode: "pomodoro",
        status: "abandoned",
        planned: 50,
        actual: 12,
        converted: false,
      },
    ] as const;

    for (const spec of focusSpecs) {
      const day = addDays(today, spec.dayOffset);
      const category = byName[spec.category];
      if (!category) continue;

      const startTime = atHour(day, 16, 0);
      const endTime = atHour(day, 16, spec.actual);

      const session = await prisma.focusSession.create({
        data: {
          title: `${DEMO_SEED_MARKER} 专注`,
          note: `${DEMO_SEED_MARKER} 演示 FocusSession`,
          categoryId: category.id,
          mode: spec.mode,
          status: spec.status,
          startTime,
          endTime,
          plannedDurationMinutes: spec.planned,
          actualDurationMinutes: spec.actual,
          convertedToTimeBlock: spec.converted,
        },
      });

      if (spec.converted && spec.status === "converted") {
        const block = await prisma.timeBlock.create({
          data: {
            title: `${DEMO_SEED_MARKER} 专注转换`,
            categoryId: category.id,
            startTime,
            endTime,
            status: "completed",
            completionLevel: 100,
            source: spec.mode === "stopwatch" ? "stopwatch" : "pomodoro",
          },
        });
        await prisma.focusSession.update({
          where: { id: session.id },
          data: { timeBlockId: block.id },
        });
      }
    }

    console.log(
      `Demo seed complete for ${email} (${categoryRecords.length} categories, marked with ${DEMO_SEED_MARKER}).`,
    );
    console.log(
      "Demo categories:",
      categoryRecords.map((c) => c.name).join(", "),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
