import { z } from "zod";
import { createCacheKey, readCachedOccurrences, writeCachedOccurrences } from "./cache.js";
import {
  FORWARD_CAP_YEARS,
  ISO_DATE_SEPARATOR,
  ISO_EXTENDED_LOCAL_LENGTH,
  LOCAL_BASIC_LENGTH,
  MONTH_INDEX_OFFSET,
  TZID_PARAM_PREFIX,
  UTC_BASIC_LENGTH,
} from "./constants.js";
import { errorMessage, extractRRuleLine } from "./rrule-utils.js";
import {
  floatingDateToUtcIso,
  isoToBasicWallTime,
  parseExtendedIsoLocalDate,
  parseLocalBasicDate,
  toFloatingDate,
  wallTimeToUtc,
} from "./timezone.js";
import type { MaterializeOccurrencesInput, Occurrence, OccurrenceCache } from "./types.js";
import { validateRRule } from "./validate.js";
import { getRRuleApi } from "./rrule-api.js";

const { rrulestr } = getRRuleApi();

const MaterializeInputSchema = z.object({
  rule: z.string().min(1),
  dtstart: z.string().datetime({ offset: true }),
  tzid: z.string().min(1),
  range: z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
  }),
  exdates: z.array(z.string().datetime({ offset: true })).optional(),
  rdates: z.array(z.string().datetime({ offset: true })).optional(),
});

export async function materializeOccurrences(
  input: MaterializeOccurrencesInput,
  cache?: OccurrenceCache,
): Promise<Occurrence[]> {
  const materializeInput = parseMaterializeInput(input);
  const cacheKey = await createCacheKey(materializeInput);
  const cachedOccurrences = cache ? await tryReadCachedOccurrences(cache, cacheKey) : null;

  if (cachedOccurrences) return cachedOccurrences;

  const occurrences = computeOccurrences(materializeInput);
  if (cache) await tryWriteCachedOccurrences(cache, cacheKey, occurrences);
  return occurrences;
}

function computeOccurrences(input: MaterializeOccurrencesInput): Occurrence[] {
  const validation = validateRRule(input.rule, input.tzid);
  if (!validation.ok) throw new Error(validation.message);

  const rangeStart = new Date(input.range.start);
  const rangeEnd = minDate(new Date(input.range.end), addYears(rangeStart, FORWARD_CAP_YEARS));
  const recurrenceRule = parseRuleForMaterialization(input);
  // rrule.js uses an inclusive flag here; isWithinRange keeps Dateline's upper bound exclusive after TZ conversion.
  const ruleDates = recurrenceRule.between(toFloatingDate(rangeStart, input.tzid), toFloatingDate(rangeEnd, input.tzid), true);
  const startsAtValues = ruleDates.map((date) => floatingDateToUtcIso(date, input.tzid));

  return mergeDates({ ruleDates: startsAtValues, input, start: rangeStart, end: rangeEnd }).map((startsAt) => ({ startsAt }));
}

function mergeDates(
  { ruleDates, input, start, end }: { ruleDates: string[]; input: MaterializeOccurrencesInput; start: Date; end: Date },
): string[] {
  const excludedDates = new Set([...(input.exdates ?? []), ...extractDateLines(input.rule, "EXDATE", input.tzid)]);
  const includedDates = [...ruleDates, ...(input.rdates ?? []), ...extractDateLines(input.rule, "RDATE", input.tzid)];
  const uniqueDates = new Set(includedDates.filter((date) => isWithinRange(date, start, end) && !excludedDates.has(date)));
  return [...uniqueDates].sort();
}

function parseRuleForMaterialization(input: MaterializeOccurrencesInput): ReturnType<typeof rrulestr> {
  // DTSTART is emitted as a floating UTC value (basic wall-time + Z). Combined with omitting
  // the `tzid` option below, this makes rrule produce host-independent floating dates whose
  // UTC fields encode the wall-clock time in `input.tzid`. We then convert wall→UTC ourselves
  // via `floatingDateToUtcIso`, which uses Intl and is host-agnostic. Passing `tzid` to rrule
  // would route through `dateInTimeZone()`, whose offset depends on the host process timezone
  // (rrule.js dateutil.js — see Issue #501), breaking CI runners not in the target tzid.
  const dtstart = `DTSTART:${isoToBasicWallTime(input.dtstart, input.tzid)}Z`;
  try {
    return rrulestr(`${dtstart}\nRRULE:${extractRRuleLine(input.rule)}`, { forceset: true });
  } catch (error) {
    throw new Error(`Failed to parse RRULE for materialization: ${errorMessage(error)}`);
  }
}

function parseMaterializeInput(input: MaterializeOccurrencesInput): MaterializeOccurrencesInput {
  const parsedInput = MaterializeInputSchema.safeParse(input);
  if (!parsedInput.success) throw new Error(parsedInput.error.issues.map((issue) => issue.message).join("; "));
  return parsedInput.data;
}

function extractDateLines(rule: string, propertyName: "EXDATE" | "RDATE", fallbackTzid: string): string[] {
  return rule
    .split(/\r?\n/)
    .filter((line) => line.toUpperCase().startsWith(propertyName))
    .flatMap((line) => parseDateLine(line, fallbackTzid));
}

// RFC5545 property params are `;`-separated; a TZID= segment may appear in any position.
const ICAL_PARAM_SEPARATOR = ";";
// Matches an explicit UTC offset on an extended-format ISO 8601 string: `Z`, `+HH:MM`, or `-HH:MM`.
const ISO_OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

function parseDateLine(line: string, fallbackTzid: string): string[] {
  const colonIndex = line.indexOf(":");
  const rawProperty = colonIndex >= 0 ? line.slice(0, colonIndex) : "";
  const rawDates = colonIndex >= 0 ? line.slice(colonIndex + MONTH_INDEX_OFFSET) : "";
  if (!rawProperty || !rawDates) return [];

  const tzid = extractTzidParam(rawProperty) ?? fallbackTzid;
  return rawDates.split(",").map((rawDate) => parseDateValue(rawDate.trim(), tzid));
}

function extractTzidParam(rawProperty: string): string | undefined {
  // Walk all params instead of a naive `split(TZID=)` so trailing params like
  // `;VALUE=DATE-TIME` cannot pollute the tzid value (PRO-489).
  for (const segment of rawProperty.split(ICAL_PARAM_SEPARATOR)) {
    if (segment.toUpperCase().startsWith(TZID_PARAM_PREFIX)) return segment.slice(TZID_PARAM_PREFIX.length);
  }
  return undefined;
}

function parseDateValue(rawDate: string, tzid: string): string {
  if (rawDate.includes(ISO_DATE_SEPARATOR)) return parseIsoDateValue(rawDate, tzid);
  if (rawDate.endsWith("Z") && rawDate.length === UTC_BASIC_LENGTH) return parseUtcBasicDate(rawDate).toISOString();
  if (rawDate.length === LOCAL_BASIC_LENGTH) return wallTimeToUtc(parseLocalBasicDate(rawDate), tzid).toISOString();
  throw new Error(`Unsupported recurrence date value: ${rawDate}`);
}

function parseIsoDateValue(rawDate: string, tzid: string): string {
  // Offset-less extended ISO (`YYYY-MM-DDTHH:MM:SS`) must be interpreted as wall
  // time in `tzid`; delegating to `new Date(rawDate)` would use the host process
  // timezone — same family as the rrule.js host-tz determinism bug (PRO-483).
  if (ISO_OFFSET_PATTERN.test(rawDate)) return new Date(rawDate).toISOString();
  if (rawDate.length === ISO_EXTENDED_LOCAL_LENGTH) return wallTimeToUtc(parseExtendedIsoLocalDate(rawDate), tzid).toISOString();
  throw new Error(`Unsupported recurrence date value: ${rawDate}`);
}

function parseUtcBasicDate(rawDate: string): Date {
  const localParts = parseLocalBasicDate(rawDate.slice(0, -1));
  return new Date(Date.UTC(
    localParts.year,
    localParts.month - MONTH_INDEX_OFFSET,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  ));
}

function addYears(date: Date, years: number): Date {
  const cappedDate = new Date(date);
  cappedDate.setUTCFullYear(cappedDate.getUTCFullYear() + years);
  return cappedDate;
}

function minDate(firstDate: Date, secondDate: Date): Date {
  return firstDate.getTime() < secondDate.getTime() ? firstDate : secondDate;
}

function isWithinRange(isoValue: string, start: Date, end: Date): boolean {
  const timestamp = new Date(isoValue).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

async function tryReadCachedOccurrences(cache: OccurrenceCache, cacheKey: string): Promise<Occurrence[] | null> {
  try {
    return await readCachedOccurrences(cache, cacheKey);
  } catch {
    return null;
  }
}

async function tryWriteCachedOccurrences(cache: OccurrenceCache, cacheKey: string, occurrences: Occurrence[]): Promise<void> {
  try {
    await writeCachedOccurrences(cache, cacheKey, occurrences);
  } catch {
    return undefined;
  }
}

