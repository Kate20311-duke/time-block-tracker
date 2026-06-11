import { describe, expect, it } from "vitest";
import {
  EVERYDAY_DAYS,
  WEEKDAY_DAYS,
  isStartBeforeEnd,
  isValidDaysOfWeek,
  isValidHHmm,
  normalizeDaysOfWeek,
  parseDateOnly,
  validateRoutineInput,
} from "./routine-validation";

function validInput() {
  return {
    title: "上班",
    categoryId: "cat-1",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: new Date(2026, 5, 15),
    endDate: null,
    notes: null,
  };
}

describe("validateRoutineInput", () => {
  it("rejects empty categoryId", () => {
    expect(
      validateRoutineInput({ ...validInput(), categoryId: null }),
    ).toBe("missing_category");
    expect(
      validateRoutineInput({ ...validInput(), categoryId: "   " }),
    ).toBe("missing_category");
  });

  it("rejects empty title", () => {
    expect(
      validateRoutineInput({ ...validInput(), title: "   " }),
    ).toBe("empty_title");
  });

  it("rejects startTime >= endTime", () => {
    expect(
      validateRoutineInput({ ...validInput(), startTime: "17:00", endTime: "09:00" }),
    ).toBe("invalid_time_range");
    expect(
      validateRoutineInput({ ...validInput(), startTime: "09:00", endTime: "09:00" }),
    ).toBe("invalid_time_range");
  });

  it("rejects empty daysOfWeek", () => {
    expect(
      validateRoutineInput({ ...validInput(), daysOfWeek: [] }),
    ).toBe("empty_days");
  });

  it("rejects invalid daysOfWeek values", () => {
    expect(
      validateRoutineInput({ ...validInput(), daysOfWeek: [1, 7] }),
    ).toBe("invalid_days");
    expect(
      validateRoutineInput({ ...validInput(), daysOfWeek: [1, 1] }),
    ).toBe("invalid_days");
  });

  it("rejects endDate before startDate", () => {
    expect(
      validateRoutineInput({
        ...validInput(),
        startDate: new Date(2026, 5, 15),
        endDate: new Date(2026, 5, 10),
      }),
    ).toBe("invalid_date_range");
  });

  it("accepts valid input", () => {
    expect(validateRoutineInput(validInput())).toBeNull();
    expect(
      validateRoutineInput({
        ...validInput(),
        endDate: new Date(2026, 11, 31),
      }),
    ).toBeNull();
  });
});

describe("time helpers", () => {
  it("validates HH:mm", () => {
    expect(isValidHHmm("09:00")).toBe(true);
    expect(isValidHHmm("23:59")).toBe(true);
    expect(isValidHHmm("24:00")).toBe(false);
    expect(isValidHHmm("9:00")).toBe(false);
  });

  it("compares start before end", () => {
    expect(isStartBeforeEnd("09:00", "17:00")).toBe(true);
    expect(isStartBeforeEnd("23:00", "01:00")).toBe(false);
  });
});

describe("day presets", () => {
  it("weekdays and everyday helpers are correct", () => {
    expect(WEEKDAY_DAYS).toEqual([1, 2, 3, 4, 5]);
    expect(EVERYDAY_DAYS).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(isValidDaysOfWeek(WEEKDAY_DAYS)).toBe(true);
    expect(isValidDaysOfWeek(EVERYDAY_DAYS)).toBe(true);
  });

  it("normalizes and deduplicates days", () => {
    expect(normalizeDaysOfWeek([3, 1, 2, 2])).toEqual([1, 2, 3]);
  });
});

describe("parseDateOnly", () => {
  it("parses YYYY-MM-DD", () => {
    const date = parseDateOnly("2026-06-15");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(15);
  });

  it("rejects invalid dates", () => {
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("bad")).toBeNull();
  });
});
