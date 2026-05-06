import {
  BASIC_DATE_PAD,
  DAY_END,
  DAY_START,
  HOUR_END,
  HOUR_START,
  MINUTE_END,
  MINUTE_START,
  MONTH_END,
  MONTH_INDEX_OFFSET,
  MONTH_START,
  SECOND_END,
  SECOND_START,
  YEAR_END,
  YEAR_PAD,
  YEAR_START,
} from "./constants.js";
import type { WallTimeParts } from "./types.js";

const DATE_TIME_FORMAT_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
} as const;

export function isValidTimeZone(tzid: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzid }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isoToBasicWallTime(isoValue: string, tzid: string): string {
  return formatBasicWallTime(getWallTimeParts(new Date(isoValue), tzid));
}

export function toFloatingDate(date: Date, tzid: string): Date {
  const parts = getWallTimeParts(date, tzid);
  return new Date(Date.UTC(parts.year, parts.month - MONTH_INDEX_OFFSET, parts.day, parts.hour, parts.minute, parts.second));
}

export function floatingDateToUtcIso(date: Date, tzid: string): string {
  return wallTimeToUtc(getUtcParts(date), tzid).toISOString();
}

export function wallTimeToUtc(parts: WallTimeParts, tzid: string): Date {
  const wallTime = Date.UTC(parts.year, parts.month - MONTH_INDEX_OFFSET, parts.day, parts.hour, parts.minute, parts.second);
  // First pass approximates UTC; second pass corrects when that instant crosses a DST offset boundary.
  const firstUtc = wallTime - getOffsetMilliseconds(new Date(wallTime), tzid);
  const secondUtc = wallTime - getOffsetMilliseconds(new Date(firstUtc), tzid);
  return new Date(secondUtc);
}

export function parseLocalBasicDate(rawDate: string): WallTimeParts {
  return {
    year: Number(rawDate.slice(YEAR_START, YEAR_END)),
    month: Number(rawDate.slice(MONTH_START, MONTH_END)),
    day: Number(rawDate.slice(DAY_START, DAY_END)),
    hour: Number(rawDate.slice(HOUR_START, HOUR_END)),
    minute: Number(rawDate.slice(MINUTE_START, MINUTE_END)),
    second: Number(rawDate.slice(SECOND_START, SECOND_END)),
  };
}

export function parseExtendedIsoLocalDate(rawDate: string): WallTimeParts {
  // `YYYY-MM-DDTHH:MM:SS` — extended ISO 8601 form without a UTC offset. Pure
  // string slicing keeps this host-tz independent (PRO-483).
  const [datePart = "", timePart = ""] = rawDate.split("T");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function getOffsetMilliseconds(date: Date, tzid: string): number {
  const parts = getWallTimeParts(date, tzid);
  const wallTime = Date.UTC(parts.year, parts.month - MONTH_INDEX_OFFSET, parts.day, parts.hour, parts.minute, parts.second);
  return wallTime - date.getTime();
}

function getWallTimeParts(date: Date, tzid: string): WallTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", { ...DATE_TIME_FORMAT_OPTIONS, timeZone: tzid });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return parseWallTimeParts(parts);
}

function getUtcParts(date: Date): WallTimeParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + MONTH_INDEX_OFFSET,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function parseWallTimeParts(parts: Record<string, string>): WallTimeParts {
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function formatBasicWallTime(parts: WallTimeParts): string {
  const year = String(parts.year).padStart(YEAR_PAD, "0");
  const month = String(parts.month).padStart(BASIC_DATE_PAD, "0");
  const day = String(parts.day).padStart(BASIC_DATE_PAD, "0");
  const hour = String(parts.hour).padStart(BASIC_DATE_PAD, "0");
  const minute = String(parts.minute).padStart(BASIC_DATE_PAD, "0");
  const second = String(parts.second).padStart(BASIC_DATE_PAD, "0");
  return `${year}${month}${day}T${hour}${minute}${second}`;
}
