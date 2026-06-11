export type RoutineInput = {
  title: string;
  categoryId: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
};

export type RoutineValidationError =
  | "empty_title"
  | "title_too_long"
  | "missing_category"
  | "invalid_time_format"
  | "invalid_time_range"
  | "empty_days"
  | "invalid_days"
  | "invalid_start_date"
  | "invalid_date_range";

export type RoutineRowData = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

/** Routine item passed to the generate card (client-safe). */
export type RoutineGenerateListItem = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};
