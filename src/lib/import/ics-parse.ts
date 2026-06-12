import ICAL from "ical.js";

import type {
  IcsPreviewResult,
  IcsPreviewSummary,
  ParsedIcsEvent,
  ParsedIcsEventStatus,
} from "@/lib/import/ics-types";

/** Max events returned in preview (parse may find more). */
export const ICS_PREVIEW_MAX_EVENTS = 500;

export const ICS_UNSUPPORTED_REASON = {
  recurring: "recurring",
  cancelled: "cancelled",
  missingEnd: "missing_end",
  invalidRange: "invalid_range",
} as const;

export const ICS_WARNING = {
  allDay: "all_day",
  missingTimeZone: "missing_time_zone",
} as const;

export type IcsParseErrorCode = "empty" | "invalid_ics";

export class IcsParseError extends Error {
  constructor(public readonly code: IcsParseErrorCode) {
    super(code);
    this.name = "IcsParseError";
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatIcalTimeAsIso(time: InstanceType<typeof ICAL.Time>): string {
  if (time.isDate) {
    return `${time.year}-${pad2(time.month)}-${pad2(time.day)}`;
  }
  return time.toJSDate().toISOString();
}

function readCategories(vevent: InstanceType<typeof ICAL.Component>): string[] {
  const categories: string[] = [];
  for (const property of vevent.getAllProperties("categories")) {
    for (const value of property.getValues()) {
      const text = String(value ?? "").trim();
      if (!text) continue;
      for (const part of text.split(",")) {
        const trimmed = part.trim();
        if (trimmed) {
          categories.push(trimmed);
        }
      }
    }
  }
  return categories;
}

function slugifyId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "event";
}

function classifyEvent(params: {
  hasRrule: boolean;
  isCancelled: boolean;
  hasEnd: boolean;
  isAllDay: boolean;
  rangeValid: boolean;
  timeZone?: string;
}): Pick<ParsedIcsEvent, "status" | "warnings" | "unsupportedReasons"> {
  const warnings: string[] = [];
  const unsupportedReasons: string[] = [];

  if (params.hasRrule) {
    unsupportedReasons.push(ICS_UNSUPPORTED_REASON.recurring);
  }
  if (params.isCancelled) {
    unsupportedReasons.push(ICS_UNSUPPORTED_REASON.cancelled);
  }
  if (!params.hasEnd) {
    unsupportedReasons.push(ICS_UNSUPPORTED_REASON.missingEnd);
  }
  if (!params.rangeValid) {
    unsupportedReasons.push(ICS_UNSUPPORTED_REASON.invalidRange);
  }

  if (params.isAllDay) {
    warnings.push(ICS_WARNING.allDay);
  }
  if (!params.isAllDay && !params.timeZone) {
    warnings.push(ICS_WARNING.missingTimeZone);
  }

  let status: ParsedIcsEventStatus = "supported";
  if (unsupportedReasons.length > 0) {
    status = "unsupported";
  } else if (warnings.length > 0) {
    status = "warning";
  }

  return { status, warnings, unsupportedReasons };
}

function summarizeEvents(events: ParsedIcsEvent[]): IcsPreviewSummary {
  return events.reduce<IcsPreviewSummary>(
    (acc, event) => {
      acc.total += 1;
      if (event.status === "supported") acc.supported += 1;
      else if (event.status === "warning") acc.warning += 1;
      else acc.unsupported += 1;
      return acc;
    },
    { total: 0, supported: 0, warning: 0, unsupported: 0 },
  );
}

function parseVevent(
  vevent: InstanceType<typeof ICAL.Component>,
  index: number,
): ParsedIcsEvent | null {
  const event = new ICAL.Event(vevent);
  const startDate = event.startDate;
  if (!startDate) {
    return null;
  }

  const endDate = event.endDate;
  const isAllDay = Boolean(startDate.isDate);
  const hasRrule = vevent.getFirstProperty("rrule") !== null;
  const statusProp = String(vevent.getFirstPropertyValue("status") ?? "")
    .trim()
    .toUpperCase();
  const isCancelled = statusProp === "CANCELLED";

  const startIso = formatIcalTimeAsIso(startDate);
  const endIso = endDate ? formatIcalTimeAsIso(endDate) : "";

  const rangeValid =
    Boolean(endDate) &&
    (isAllDay
      ? endIso >= startIso
      : endDate!.toJSDate().getTime() > startDate.toJSDate().getTime());

  const timeZone =
    !isAllDay && startDate.zone?.tzid && startDate.zone.tzid !== "floating"
      ? startDate.zone.tzid
      : undefined;

  const uid = event.uid?.trim() || undefined;
  const id = slugifyId(uid ? `${uid}-${index}` : `event-${index}`);

  const classification = classifyEvent({
    hasRrule,
    isCancelled,
    hasEnd: Boolean(endDate),
    isAllDay,
    rangeValid,
    timeZone,
  });

  return {
    id,
    uid,
    summary: event.summary?.trim() || "(No title)",
    description: event.description?.trim() || undefined,
    location: event.location?.trim() || undefined,
    start: startIso,
    end: endIso,
    isAllDay,
    timeZone,
    categories: readCategories(vevent),
    ...classification,
  };
}

/**
 * Parse ICS text into normalized preview events. Does not touch the database.
 */
export function parseIcsPreview(
  icsText: string,
  fileName = "upload.ics",
): IcsPreviewResult {
  const trimmed = icsText.trim();
  if (!trimmed) {
    throw new IcsParseError("empty");
  }

  let jcal: unknown;
  try {
    jcal = ICAL.parse(trimmed);
  } catch {
    throw new IcsParseError("invalid_ics");
  }

  const root = new ICAL.Component(jcal as ConstructorParameters<typeof ICAL.Component>[0]);
  const vevents = root.getAllSubcomponents("vevent");

  const allEvents: ParsedIcsEvent[] = [];
  vevents.forEach((vevent, index) => {
    const parsed = parseVevent(vevent, index);
    if (parsed) {
      allEvents.push(parsed);
    }
  });

  allEvents.sort((a, b) => a.start.localeCompare(b.start));

  const truncated = allEvents.length > ICS_PREVIEW_MAX_EVENTS;
  const events = truncated
    ? allEvents.slice(0, ICS_PREVIEW_MAX_EVENTS)
    : allEvents;

  return {
    fileName,
    events,
    summary: summarizeEvents(allEvents),
    truncated,
  };
}
