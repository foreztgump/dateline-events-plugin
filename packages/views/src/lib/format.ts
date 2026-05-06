import type { DatelineViewEvent } from "./types.js";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const TIME_FORMAT: Intl.DateTimeFormatOptions = { timeStyle: "short" };
const FALLBACK_TIMEZONE = "UTC";

function safeTimeZone(tz: string | undefined): string {
  // WHY: default to UTC (not host TZ) so an unset or invalid CMS-stored
  // timezone never leaks the server's local zone or crashes rendering.
  if (!tz) return FALLBACK_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function formatEventTimeRange(event: DatelineViewEvent): string {
  if (event.allDay) return "All day";
  const formatter = new Intl.DateTimeFormat("en", { ...TIME_FORMAT, timeZone: safeTimeZone(event.timezone) });
  return `${formatter.format(new Date(event.startsAt))} – ${formatter.format(new Date(event.endsAt))}`;
}

export function formatEventDateTime(event: DatelineViewEvent): string {
  const formatter = new Intl.DateTimeFormat("en", { ...DATE_TIME_FORMAT, timeZone: safeTimeZone(event.timezone) });
  return formatter.format(new Date(event.startsAt));
}

export function eventHref(event: DatelineViewEvent): string {
  return `/events/${event.slug ?? event.id}`;
}

export function plainPortableText(blocks: unknown[] | undefined): string {
  if (!blocks) return "";
  return blocks.map(blockText).filter(Boolean).join("\n");
}

function blockText(block: unknown): string {
  if (!isRecord(block) || !Array.isArray(block.children)) return "";
  return block.children.map(childText).join("");
}

function childText(child: unknown): string {
  if (!isRecord(child) || typeof child.text !== "string") return "";
  return child.text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
