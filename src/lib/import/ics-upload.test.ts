import { describe, expect, it } from "vitest";

import {
  isIcsFileName,
  isIcsMimeType,
  validateIcsUploadFile,
} from "@/lib/import/ics-upload";

describe("ics upload validation", () => {
  it("accepts .ics file names and calendar mime types", () => {
    expect(isIcsFileName("calendar.ics")).toBe(true);
    expect(isIcsMimeType("text/calendar")).toBe(true);
  });

  it("rejects unrelated files", () => {
    const file = new File(["data"], "notes.txt", { type: "text/plain" });
    expect(validateIcsUploadFile(file)).toBe("invalid_type");
  });

  it("accepts valid ics uploads", () => {
    const file = new File(["BEGIN:VCALENDAR"], "import.ics", {
      type: "text/calendar",
    });
    expect(validateIcsUploadFile(file)).toBe("ok");
  });
});
