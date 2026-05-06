import ICAL from "ical.js";
import { createEventDraft } from "./normalize.js";
import type { ImportError, ImportParseResult, ImportRow } from "./types.js";

const DEFAULT_EVENT_TITLE = "Untitled event";
const DEFAULT_TIMEZONE = "UTC";
const MONTH_INDEX_OFFSET = 1;

const WALL_TIME_FORMAT_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
} as const;

export function parseICal(icsText: string): ImportParseResult {
  try {
    const calendar = new ICAL.Component(ICAL.parse(icsText) as unknown[]);
    const parsedEvents = calendar.getAllSubcomponents("vevent").map((vevent, index) => parseEventComponent(vevent, index + 1));
    return {
      rows: parsedEvents.flatMap((parsedEvent) => parsedEvent.row ? [parsedEvent.row] : []),
      errors: parsedEvents.flatMap((parsedEvent) => parsedEvent.error ? [parsedEvent.error] : []),
    };
  } catch (error) {
    return { rows: [], errors: [{ row: 1, sourceId: "ical:document", message: String(error) }] };
  }
}

function parseEventComponent(vevent: ICAL.Component, rowNumber: number): { row?: ImportRow; error?: ImportError } {
  try {
    return { row: eventRowFromComponent(vevent, rowNumber) };
  } catch (error) {
    return { error: { row: rowNumber, sourceId: sourceIdForError(vevent, rowNumber), message: String(error) } };
  }
}

function eventRowFromComponent(vevent: ICAL.Component, rowNumber: number): ImportRow {
  const sourceId = `ical:${textProperty(vevent, "uid", String(rowNumber))}`;
  const timezone = timezoneProperty(vevent, "dtstart");
  const startsAt = dateProperty(vevent, "dtstart", timezone);
  const endsAt = dateProperty(vevent, "dtend", timezone);
  return {
    sourceId,
    event: createEventDraft({
      sourceId,
      title: textProperty(vevent, "summary", DEFAULT_EVENT_TITLE),
      startsAt,
      endsAt,
      timezone,
      recurrenceRule: recurrenceRule(vevent),
      recurrenceExceptions: recurrenceExceptions(vevent),
    }),
  };
}

function textProperty(vevent: ICAL.Component, propertyName: string, fallback: string): string {
  const propertyValue = vevent.getFirstPropertyValue(propertyName);
  return typeof propertyValue === "string" && propertyValue.length > 0 ? propertyValue : fallback;
}

function dateProperty(vevent: ICAL.Component, propertyName: string, fallbackTzid: string): string {
  const property = vevent.getFirstProperty(propertyName);
  const propertyValue = vevent.getFirstPropertyValue(propertyName);
  if (!isIcalTime(propertyValue)) throw new Error(`VEVENT missing ${propertyName}.`);
  return icalTimeToUtcIso(propertyValue, propertyTzid(property) ?? fallbackTzid);
}

function propertyTzid(property: ICAL.Property | null | undefined): string | undefined {
  const tzid = property?.getParameter("tzid");
  return typeof tzid === "string" ? tzid : undefined;
}

// ical.js `toJSDate()` falls back to the host process timezone when no VTIMEZONE
// component is registered, which makes parsing host-tz-dependent. We instead read
// the wall-clock components from the ICAL.Time and convert via Intl, which is
// host-agnostic.
function icalTimeToUtcIso(time: ICAL.Time, tzid: string): string {
  if (time.zone?.tzid === "UTC" || time.isDate || tzid === "UTC") {
    return time.toJSDate().toISOString();
  }
  return wallTimeToUtcIso({
    year: time.year,
    month: time.month,
    day: time.day,
    hour: time.hour,
    minute: time.minute,
    second: time.second,
  }, tzid);
}

interface WallTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallTimeToUtcIso(parts: WallTimeParts, tzid: string): string {
  const wallTime = Date.UTC(parts.year, parts.month - MONTH_INDEX_OFFSET, parts.day, parts.hour, parts.minute, parts.second);
  // First pass approximates UTC; second pass corrects when that instant crosses a DST offset boundary.
  const firstUtc = wallTime - getOffsetMilliseconds(new Date(wallTime), tzid);
  const secondUtc = wallTime - getOffsetMilliseconds(new Date(firstUtc), tzid);
  return new Date(secondUtc).toISOString();
}

function getOffsetMilliseconds(date: Date, tzid: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { ...WALL_TIME_FORMAT_OPTIONS, timeZone: tzid });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const wallTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - MONTH_INDEX_OFFSET,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallTime - date.getTime();
}

function timezoneProperty(vevent: ICAL.Component, propertyName: string): string {
  const property = vevent.getFirstProperty(propertyName);
  const timezone = property?.getParameter("tzid");
  return typeof timezone === "string" ? timezone : DEFAULT_TIMEZONE;
}

function recurrenceRule(vevent: ICAL.Component): string | undefined {
  const propertyValue = vevent.getFirstPropertyValue("rrule");
  return propertyValue && typeof propertyValue !== "string" && "toString" in propertyValue ? propertyValue.toString() : undefined;
}

function recurrenceExceptions(vevent: ICAL.Component): string[] {
  const dtstartTzid = timezoneProperty(vevent, "dtstart");
  return vevent.getAllProperties("exdate").flatMap((property) => {
    const tzid = propertyTzid(property) ?? dtstartTzid;
    return property.getValues().flatMap((propertyValue) => isIcalTime(propertyValue) ? [icalTimeToUtcIso(propertyValue, tzid)] : []);
  });
}

function isIcalTime(value: unknown): value is ICAL.Time {
  return typeof value === "object" && value !== null && "toJSDate" in value;
}

function sourceIdForError(vevent: ICAL.Component, rowNumber: number): string {
  return `ical:${textProperty(vevent, "uid", String(rowNumber))}`;
}
