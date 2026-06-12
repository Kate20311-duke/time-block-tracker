import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  EXCEL_WORKSHEET_NAME,
  timeBlocksToExcelBuffer,
} from "@/lib/export/excel";
import { EXPORT_COLUMNS } from "@/lib/export/time-block-rows";
import type { TimeBlockExportRow } from "@/lib/export/time-block-rows";

const sampleRow: TimeBlockExportRow = {
  title: "Study",
  categoryName: "学习",
  categoryColor: "#3b82f6",
  startTime: new Date("2026-06-01T01:00:00.000Z"),
  endTime: new Date("2026-06-01T02:00:00.000Z"),
  status: "completed",
  completionLevel: 100,
  efficiencyLevel: "high",
  source: "manual",
  note: "focus session",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T02:30:00.000Z"),
};

async function loadWorkbookFromExportBuffer(
  buffer: Awaited<ReturnType<typeof timeBlocksToExcelBuffer>>,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  return workbook;
}

describe("timeBlocksToExcelBuffer", () => {
  it("creates a workbook buffer with the expected worksheet", async () => {
    const buffer = await timeBlocksToExcelBuffer([sampleRow], "UTC");
    const workbook = await loadWorkbookFromExportBuffer(buffer);

    const sheet = workbook.getWorksheet(EXCEL_WORKSHEET_NAME);
    expect(sheet).toBeDefined();
    expect(sheet?.name).toBe("Time Blocks");
  });

  it("includes expected header columns", async () => {
    const buffer = await timeBlocksToExcelBuffer([sampleRow], "UTC");
    const workbook = await loadWorkbookFromExportBuffer(buffer);

    const sheet = workbook.getWorksheet(EXCEL_WORKSHEET_NAME);
    const headerValues = sheet?.getRow(1).values as (string | undefined)[];
    const headers = headerValues.slice(1);

    expect(headers).toEqual([...EXPORT_COLUMNS]);
  });

  it("includes a data row for the sample block", async () => {
    const buffer = await timeBlocksToExcelBuffer([sampleRow], "UTC");
    const workbook = await loadWorkbookFromExportBuffer(buffer);

    const sheet = workbook.getWorksheet(EXCEL_WORKSHEET_NAME);
    expect(sheet?.rowCount).toBe(2);
    expect(sheet?.getRow(2).getCell(1).value).toBe("Study");
  });
});
