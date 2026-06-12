import { describe, expect, it } from "vitest";

import { buildTimeBlocksExportFilename } from "@/lib/export/filenames";

describe("buildTimeBlocksExportFilename", () => {
  it("builds csv filename", () => {
    expect(buildTimeBlocksExportFilename("2026-06-01", "2026-06-30", "csv")).toBe(
      "time-blocks-2026-06-01-to-2026-06-30.csv",
    );
  });

  it("builds xlsx filename", () => {
    expect(buildTimeBlocksExportFilename("2026-06-01", "2026-06-30", "xlsx")).toBe(
      "time-blocks-2026-06-01-to-2026-06-30.xlsx",
    );
  });
});
