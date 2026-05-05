import type { DatelineEvent } from "./types.js";

const CALENDAR_PROD_ID = "-//Dateline//Dateline Core 0.1//EN";
const CANONICAL_DATE_LOCALE = "en-CA";
const DATE_PATTERN = /[-:]/g;

export function renderICal(events: DatelineEvent[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${CALENDAR_PROD_ID}`, ...events.flatMap(renderEvent), "END:VCALENDAR", ""].join("\r\n");
}

function renderEvent(event: DatelineEvent): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeText(event.id)}@dateline`,
    `SUMMARY:${escapeText(event.title)}`,
    `DTSTART;TZID=${event.timezone}:${formatLocalDate(event.startsAt, event.timezone)}`,
    `DTEND;TZID=${event.timezone}:${formatLocalDate(event.endsAt, event.timezone)}`,
    `STATUS:${String(event.status).toUpperCase()}`,
  ];
  if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule.replace(/^RRULE:/, "")}`);
  return [...lines, "END:VEVENT"];
}

function formatLocalDate(isoDate: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat(CANONICAL_DATE_LOCALE, datePartsOptions(timezone)).formatToParts(new Date(isoDate));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}${value("month")}${value("day")}T${value("hour")}${value("minute")}${value("second")}`.replace(DATE_PATTERN, "");
}

function datePartsOptions(timezone: string): Intl.DateTimeFormatOptions {
  return { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" };
}

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}
