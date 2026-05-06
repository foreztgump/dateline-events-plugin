import type { DatelineViewEvent } from "./types.js";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const TIME_FORMAT: Intl.DateTimeFormatOptions = { timeStyle: "short" };

export function formatEventTimeRange(event: DatelineViewEvent): string {
  if (event.allDay) return "All day";
  const formatter = new Intl.DateTimeFormat("en", TIME_FORMAT);
  return `${formatter.format(new Date(event.startsAt))} – ${formatter.format(new Date(event.endsAt))}`;
}

export function formatEventDateTime(event: DatelineViewEvent): string {
  return new Intl.DateTimeFormat("en", DATE_TIME_FORMAT).format(new Date(event.startsAt));
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
