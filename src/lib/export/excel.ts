import ExcelJS from "exceljs";

import {
  EXPORT_COLUMNS,
  exportRowToValues,
  type TimeBlockExportRow,
} from "@/lib/export/time-block-rows";

export const EXCEL_WORKSHEET_NAME = "Time Blocks";

const COLUMN_WIDTHS = [24, 16, 14, 20, 20, 16, 12, 16, 16, 12, 32, 20, 20];

/** Build an `.xlsx` workbook buffer for the given export rows. */
export async function timeBlocksToExcelBuffer(
  rows: TimeBlockExportRow[],
  timeZone: string,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(EXCEL_WORKSHEET_NAME);

  sheet.addRow([...EXPORT_COLUMNS]);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(exportRowToValues(row, timeZone));
  }

  EXPORT_COLUMNS.forEach((_, index) => {
    sheet.getColumn(index + 1).width = COLUMN_WIDTHS[index] ?? 14;
  });

  return workbook.xlsx.writeBuffer();
}
