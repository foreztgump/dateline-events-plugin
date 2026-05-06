import ICAL from "ical.js";
import { createEventDraft } from "./normalize.js";
import type { ImportError, ImportParseResult, ImportRow } from "./types.js";

const DEFAULT_EVENT_TITLE = "Untitled event";
const DEFAULT_TIMEZONE = "UTC";

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
  const startsAt = dateProperty(vevent, "dtstart");
  const endsAt = dateProperty(vevent, "dtend");
  const timezone = timezoneProperty(vevent, "dtstart");
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

function dateProperty(vevent: ICAL.Component, propertyName: string): string {
  const propertyValue = vevent.getFirstPropertyValue(propertyName);
  if (!isIcalTime(propertyValue)) throw new Error(`VEVENT missing ${propertyName}.`);
  return propertyValue.toJSDate().toISOString();
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
  return vevent.getAllProperties("exdate").flatMap((property) =>
    property.getValues().flatMap((propertyValue) => isIcalTime(propertyValue) ? [propertyValue.toJSDate().toISOString()] : []));
}

function isIcalTime(value: unknown): value is ICAL.Time {
  return typeof value === "object" && value !== null && "toJSDate" in value;
}

function sourceIdForError(vevent: ICAL.Component, rowNumber: number): string {
  return `ical:${textProperty(vevent, "uid", String(rowNumber))}`;
}
