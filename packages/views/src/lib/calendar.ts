import type { CalendarDayCell, DatelineViewEvent } from "./types.js";

const DAYS_PER_WEEK = 7;
const FIXED_MONTH_WEEKS = 6;
const VISIBLE_EVENTS_PER_CELL = 3;
const DEFAULT_AGENDA_LIMIT = 10;
const ISO_DATE_LENGTH = 10;
const FIRST_DAY_OFFSET = 1;
const MILLISECONDS_PER_DAY = 86_400_000;
const UTC_DAY_START_SUFFIX = "T00:00:00.000Z";
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function buildMonthCells(events: DatelineViewEvent[], month: string): CalendarDayCell[] {
  const monthStart = parseMonthStart(month);
  const gridStart = startOfCalendarGrid(monthStart);
  const options = { events, monthStart, gridStart };
  return Array.from({ length: DAYS_PER_WEEK * FIXED_MONTH_WEEKS }, (_, dayIndex) => buildDayCell(options, dayIndex));
}

export function eventsOnDate(events: DatelineViewEvent[], date: string): DatelineViewEvent[] {
  return events.filter((event) => dateInEventRange(date, event));
}

export function groupEventsByDate(events: DatelineViewEvent[]): Array<{ date: string; events: DatelineViewEvent[] }> {
  const grouped = new Map<string, DatelineViewEvent[]>();
  for (const event of [...events].sort(compareEvents)) addGroupedEvent(grouped, event);
  return [...grouped.entries()].map(([date, dateEvents]) => ({ date, events: dateEvents }));
}



export function agendaEvents(events: DatelineViewEvent[], limit = DEFAULT_AGENDA_LIMIT): DatelineViewEvent[] {
  return [...events].sort(compareEvents).slice(0, limit);
}

export function buildWeekDays(weekStart: string): string[] {
  const start = new Date(`${weekStart}${UTC_DAY_START_SUFFIX}`);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => isoDate(addDays(start, index)));
}

export function monthLabel(month: string): string {
  const monthStart = parseMonthStart(month);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
}

interface BuildDayCellOptions {
  events: DatelineViewEvent[];
  monthStart: Date;
  gridStart: Date;
}

function buildDayCell(options: BuildDayCellOptions, dayIndex: number): CalendarDayCell {
  const date = addDays(options.gridStart, dayIndex);
  const dateKey = isoDate(date);
  const placements = eventsOnDate(options.events, dateKey).map((event) => ({ event, spanDays: eventSpanDays(event) }));
  return {
    date: dateKey,
    dayNumber: date.getUTCDate(),
    inMonth: date.getUTCMonth() === options.monthStart.getUTCMonth(),
    events: placements.slice(0, VISIBLE_EVENTS_PER_CELL),
    hiddenCount: Math.max(0, placements.length - VISIBLE_EVENTS_PER_CELL),
  };
}

function addGroupedEvent(grouped: Map<string, DatelineViewEvent[]>, event: DatelineViewEvent): void {
  const date = event.startsAt.slice(0, ISO_DATE_LENGTH);
  const dateEvents = grouped.get(date) ?? [];
  dateEvents.push(event);
  grouped.set(date, dateEvents);
}

function dateInEventRange(date: string, event: DatelineViewEvent): boolean {
  return date >= event.startsAt.slice(0, ISO_DATE_LENGTH) && date <= event.endsAt.slice(0, ISO_DATE_LENGTH);
}

function eventSpanDays(event: DatelineViewEvent): number {
  const start = Date.parse(`${event.startsAt.slice(0, ISO_DATE_LENGTH)}${UTC_DAY_START_SUFFIX}`);
  const end = Date.parse(`${event.endsAt.slice(0, ISO_DATE_LENGTH)}${UTC_DAY_START_SUFFIX}`);
  return Math.max(1, Math.round((end - start) / MILLISECONDS_PER_DAY) + 1);
}

function compareEvents(first: DatelineViewEvent, second: DatelineViewEvent): number {
  return first.startsAt.localeCompare(second.startsAt);
}

function parseMonthStart(month: string): Date {
  return new Date(`${month}-01${UTC_DAY_START_SUFFIX}`);
}

function startOfCalendarGrid(monthStart: Date): Date {
  const dayOffset = (monthStart.getUTCDay() + DAYS_PER_WEEK - FIRST_DAY_OFFSET) % DAYS_PER_WEEK;
  return addDays(monthStart, -dayOffset);
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}
