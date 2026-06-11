import { describe, expect, it } from "vitest";
import {
  formatDaysOfWeek,
  formatTimeRange,
  getDayLabels,
} from "./routine-format";
import { EVERYDAY_DAYS, WEEKDAY_DAYS } from "./routine-validation";

describe("formatDaysOfWeek", () => {
  const labels = { weekdays: "工作日", everyday: "每天" };

  it("formats weekday preset", () => {
    expect(formatDaysOfWeek(WEEKDAY_DAYS, "zh", labels)).toBe("工作日");
    expect(formatDaysOfWeek(WEEKDAY_DAYS, "en", { weekdays: "Weekdays", everyday: "Every day" })).toBe(
      "Weekdays",
    );
  });

  it("formats everyday preset", () => {
    expect(formatDaysOfWeek(EVERYDAY_DAYS, "zh", labels)).toBe("每天");
  });

  it("formats consecutive range in Chinese", () => {
    expect(formatDaysOfWeek([1, 2, 3, 4, 5], "zh", labels)).toBe("工作日");
    expect(formatDaysOfWeek([1, 2, 3], "zh", labels)).toBe("周一至周三");
  });

  it("formats non-consecutive days", () => {
    expect(formatDaysOfWeek([1, 3, 5], "zh", labels)).toBe("周一、周三、周五");
    expect(formatDaysOfWeek([1, 3, 5], "en", { weekdays: "Weekdays", everyday: "Every day" })).toBe(
      "Mon, Wed, Fri",
    );
  });
});

describe("formatTimeRange", () => {
  it("joins start and end with en dash", () => {
    expect(formatTimeRange("09:00", "17:00")).toBe("09:00–17:00");
  });
});

describe("getDayLabels", () => {
  it("returns seven labels per locale", () => {
    expect(getDayLabels("zh")).toHaveLength(7);
    expect(getDayLabels("zh")[0]).toBe("周日");
    expect(getDayLabels("en")[1]).toBe("Mon");
  });
});
