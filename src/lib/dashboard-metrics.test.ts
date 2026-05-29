import { describe, expect, it } from "vitest";
import { canConvertFocusSession } from "@/lib/actions/focus-shared";
import {
  focusStatsMinutesForSession,
  summarizeFocusSessions,
} from "@/lib/focus-stats";
import {
  durationMinutesSafe,
  totalMinutesByCategory,
  totalRecordedMinutes,
} from "@/lib/stats";

const STUDY = "cat_study";
const categories = [{ id: STUDY, name: "Study", color: "#3b82f6" }];

function minutesAfterStart(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

function timeBlock(
  start: Date,
  durationMinutes: number,
  categoryId: string = STUDY,
) {
  return {
    startTime: start,
    endTime: minutesAfterStart(start, durationMinutes),
    categoryId,
    status: "completed",
  };
}

function focusSession(
  start: Date,
  durationMinutes: number,
  status: string,
  convertedToTimeBlock: boolean,
) {
  return {
    startTime: start,
    endTime: minutesAfterStart(start, durationMinutes),
    status,
    categoryId: STUDY,
    actualDurationMinutes: durationMinutes,
    plannedDurationMinutes: durationMinutes,
    convertedToTimeBlock,
  };
}

describe("dashboard metrics — TimeBlock-only category totals", () => {
  it("counts a normal TimeBlock once in category statistics", () => {
    const start = new Date("2026-05-21T09:00:00");
    const blocks = [timeBlock(start, 60)];

    expect(totalRecordedMinutes(blocks)).toBe(60);
    const study = totalMinutesByCategory(blocks, categories).find(
      (r) => r.categoryId === STUDY,
    );
    expect(study?.totalMinutes).toBe(60);
    expect(study?.blockCount).toBe(1);
  });
});

describe("dashboard metrics — unconverted completed focus", () => {
  it("appears in focus stats but not in TimeBlock category totals", () => {
    const start = new Date("2026-05-21T10:00:00");
    const blocks: ReturnType<typeof timeBlock>[] = [];
    const sessions = [
      focusSession(start, 30, "completed", false),
    ];

    const focus = summarizeFocusSessions(sessions, categories);
    const study = totalMinutesByCategory(blocks, categories).find(
      (r) => r.categoryId === STUDY,
    );

    expect(focus.totalFocusMinutes).toBe(30);
    expect(focus.convertedFocusMinutes).toBe(0);
    expect(focus.unconvertedFocusMinutes).toBe(30);
    expect(focus.completedCount).toBe(1);
    expect(totalRecordedMinutes(blocks)).toBe(0);
    expect(study).toBeUndefined();
  });
});

describe("dashboard metrics — converted focus + TimeBlock", () => {
  it("counts converted duration only via the TimeBlock, not again in category from FocusSession", () => {
    const start = new Date("2026-05-21T10:00:00");
    const blocks = [timeBlock(start, 25)];
    const sessions = [
      focusSession(start, 25, "converted", true),
    ];

    const focus = summarizeFocusSessions(sessions, categories);
    const study = totalMinutesByCategory(blocks, categories).find(
      (r) => r.categoryId === STUDY,
    );

    expect(totalRecordedMinutes(blocks)).toBe(25);
    expect(study?.totalMinutes).toBe(25);
    expect(focus.totalFocusMinutes).toBe(25);
    expect(focus.convertedFocusMinutes).toBe(25);
    expect(focus.unconvertedFocusMinutes).toBe(0);
    expect(study?.totalMinutes).not.toBe(50);
    expect(totalRecordedMinutes(blocks)).not.toBe(50);
  });

  it("manual block plus converted focus block yields 85 minutes Study (not 110)", () => {
    const manualStart = new Date("2026-05-21T09:00:00");
    const focusStart = new Date("2026-05-21T11:00:00");
    const blocks = [
      timeBlock(manualStart, 60),
      timeBlock(focusStart, 25),
    ];
    const sessions = [
      focusSession(focusStart, 25, "converted", true),
      focusSession(new Date("2026-05-21T12:00:00"), 30, "completed", false),
      focusSession(new Date("2026-05-21T13:00:00"), 20, "abandoned", false),
    ];

    const focus = summarizeFocusSessions(sessions, categories);
    const tracked = totalRecordedMinutes(blocks);
    const study = totalMinutesByCategory(blocks, categories).find(
      (r) => r.categoryId === STUDY,
    );

    expect(tracked).toBe(85);
    expect(study?.totalMinutes).toBe(85);
    expect(focus.totalFocusMinutes).toBe(55);
    expect(focus.convertedFocusMinutes).toBe(25);
    expect(focus.unconvertedFocusMinutes).toBe(30);
    expect(focus.convertedFocusMinutes + focus.unconvertedFocusMinutes).toBe(
      focus.totalFocusMinutes,
    );
    expect(focus.abandonedCount).toBe(1);
    expect(focus.completedCount).toBe(2);
    expect(focus.convertedCount).toBe(1);

    expect(tracked).not.toBe(140);
    expect(study?.totalMinutes).not.toBe(110);
    expect(tracked + focus.totalFocusMinutes).toBe(140);
  });
});

describe("dashboard metrics — duplicate conversion prevention (rules)", () => {
  it("blocks second conversion when already converted", () => {
    const end = new Date("2026-05-21T10:25:00");
    expect(
      canConvertFocusSession({
        status: "converted",
        convertedToTimeBlock: true,
        endTime: end,
      }),
    ).toBe(false);
  });
});

describe("dashboard metrics — abandoned focus", () => {
  it("does not count toward completed focus minutes or TimeBlock totals", () => {
    const start = new Date("2026-05-21T14:00:00");
    const sessions = [focusSession(start, 20, "abandoned", false)];

    expect(
      focusStatsMinutesForSession(sessions[0]),
    ).toBe(0);
    expect(summarizeFocusSessions(sessions).totalFocusMinutes).toBe(0);
    expect(summarizeFocusSessions(sessions).abandonedCount).toBe(1);
    expect(summarizeFocusSessions(sessions).completedCount).toBe(0);
    expect(
      canConvertFocusSession({
        status: "abandoned",
        convertedToTimeBlock: false,
        endTime: sessions[0].endTime,
      }),
    ).toBe(false);

    expect(totalRecordedMinutes([])).toBe(0);
  });
});

describe("dashboard metrics — mirrors dashboard page formulas", () => {
  it("weekRecordedMinutes uses TimeBlocks only; weekFocusSummary uses FocusSessions only", () => {
    const start = new Date("2026-05-21T10:00:00");
    const blocks = [timeBlock(start, 60)];
    const sessions = [focusSession(start, 30, "completed", false)];

    const weekRecordedMinutes = blocks.reduce(
      (sum, b) => sum + durationMinutesSafe(b.startTime, b.endTime),
      0,
    );
    const weekFocusSummary = summarizeFocusSessions(sessions, categories);

    expect(weekRecordedMinutes).toBe(60);
    expect(weekFocusSummary.totalFocusMinutes).toBe(30);
    expect(weekRecordedMinutes).not.toBe(90);
  });
});
