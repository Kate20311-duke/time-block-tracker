import { describe, expect, it } from "vitest";
import {
  buildStopwatchAbandonUpdate,
  computeResumeStopwatchUpdate,
  defaultStopwatchTitle,
  parseStopwatchCompleteInput,
  rejectStopwatchStartWhenActive,
} from "./focus-shared";
import {
  computeFocusSessionElapsedSeconds,
  computeStopwatchTimeBlockEndTime,
  finalizePausedTotalSeconds,
} from "@/lib/focus-session-elapsed";

describe("focus-session elapsed", () => {
  const startTime = new Date("2026-06-01T10:00:00");

  it("counts elapsed seconds while running", () => {
    const seconds = computeFocusSessionElapsedSeconds(
      {
        startTime,
        status: "running",
        pausedAt: null,
        pausedTotalSeconds: 0,
      },
      new Date("2026-06-01T10:10:00"),
    );
    expect(seconds).toBe(600);
  });

  it("freezes elapsed seconds while paused", () => {
    const seconds = computeFocusSessionElapsedSeconds({
      startTime,
      status: "paused",
      pausedAt: new Date("2026-06-01T10:12:00"),
      pausedTotalSeconds: 120,
    });
    expect(seconds).toBe(600);
  });

  it("excludes accumulated pause time after resume", () => {
    const seconds = computeFocusSessionElapsedSeconds(
      {
        startTime,
        status: "running",
        pausedAt: null,
        pausedTotalSeconds: 300,
      },
      new Date("2026-06-01T10:20:00"),
    );
    expect(seconds).toBe(900);
  });
});

describe("pause/resume helpers", () => {
  it("accumulates pause segment on resume", () => {
    const update = computeResumeStopwatchUpdate(
      {
        startTime: new Date("2026-06-01T10:00:00"),
        status: "paused",
        pausedAt: new Date("2026-06-01T10:10:00"),
        pausedTotalSeconds: 60,
      },
      new Date("2026-06-01T10:15:00"),
    );

    expect(update).toEqual({
      status: "running",
      pausedAt: null,
      pausedTotalSeconds: 360,
    });
  });

  it("finalizes paused total when completing while paused", () => {
    const total = finalizePausedTotalSeconds(
      {
        startTime: new Date("2026-06-01T10:00:00"),
        status: "paused",
        pausedAt: new Date("2026-06-01T10:20:00"),
        pausedTotalSeconds: 300,
      },
      new Date("2026-06-01T10:25:00"),
    );
    expect(total).toBe(600);
  });

  it("builds abandon update from active duration", () => {
    const result = buildStopwatchAbandonUpdate(
      {
        startTime: new Date("2026-06-01T10:00:00"),
        status: "paused",
        pausedAt: new Date("2026-06-01T10:20:00"),
        pausedTotalSeconds: 300,
      },
      new Date("2026-06-01T10:25:00"),
    );

    expect(result).toEqual({
      endTime: new Date("2026-06-01T10:25:00"),
      actualDurationMinutes: 15,
      pausedAt: null,
      pausedTotalSeconds: 600,
    });
  });
});

describe("stopwatch TimeBlock endTime semantics", () => {
  it("uses start + active duration, not wall-clock end", () => {
    const endTime = computeStopwatchTimeBlockEndTime(
      {
        startTime: new Date("2026-06-01T10:00:00"),
        status: "running",
        pausedAt: null,
        pausedTotalSeconds: 600,
      },
      new Date("2026-06-01T10:30:00"),
    );
    expect(endTime).toEqual(new Date("2026-06-01T10:20:00"));
  });
});

describe("parseStopwatchCompleteInput", () => {
  it("defaults status and completion level", () => {
    const { fields, error } = parseStopwatchCompleteInput({
      defaultTitle: "Study",
      defaultNote: "notes",
    });
    expect(error).toBeNull();
    expect(fields).toEqual({
      title: "Study",
      note: "notes",
      status: "completed",
      completionLevel: 100,
    });
  });
});

describe("defaultStopwatchTitle", () => {
  it("prefers session title, then category, then fallback", () => {
    expect(
      defaultStopwatchTitle({ title: "Writing" }, "Study", "Instant record"),
    ).toBe("Writing");
    expect(defaultStopwatchTitle({ title: null }, "Study", "Instant record")).toBe(
      "Study",
    );
    expect(defaultStopwatchTitle({ title: "  " }, " ", "Instant record")).toBe(
      "Instant record",
    );
  });
});

describe("rejectStopwatchStartWhenActive", () => {
  it("blocks when an active session exists", () => {
    expect(rejectStopwatchStartWhenActive(true)).toBe("session_already_running");
    expect(rejectStopwatchStartWhenActive(false)).toBeNull();
  });
});
