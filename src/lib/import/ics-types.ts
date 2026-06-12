export type ParsedIcsEventStatus = "supported" | "warning" | "unsupported";

export type IcsImportCheckStatus =
  | "ready"
  | "duplicate"
  | "batch_duplicate"
  | "conflict"
  | "unsupported"
  | "invalid";

export type IcsImportCheckConflict = {
  id: string;
  title: string;
  categoryName: string;
  startTime: string;
  endTime: string;
};

export type IcsImportCheck = {
  status: IcsImportCheckStatus;
  canImport: boolean;
  reasons: string[];
  conflicts?: IcsImportCheckConflict[];
};

export type IcsImportCheckSummary = {
  ready: number;
  duplicate: number;
  batch_duplicate: number;
  conflict: number;
  invalid: number;
  unsupported: number;
};

export type ParsedIcsEvent = {
  id: string;
  uid?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  timeZone?: string;
  categories: string[];
  status: ParsedIcsEventStatus;
  warnings: string[];
  unsupportedReasons: string[];
  importCheck?: IcsImportCheck;
};

export type IcsPreviewSummary = {
  total: number;
  supported: number;
  warning: number;
  unsupported: number;
  importCheck?: IcsImportCheckSummary | null;
};

export type IcsPreviewResult = {
  fileName: string;
  events: ParsedIcsEvent[];
  summary: IcsPreviewSummary;
  truncated: boolean;
};
