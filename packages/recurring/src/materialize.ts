import rrulePackage from "rrule";
import { z } from "zod";
import { createCacheKey, readCachedOccurrences, writeCachedOccurrences } from "./cache.js";
import {
  DATE_VALUE_INDEX,
  DTSTART_TZID_PREFIX,
  FORWARD_CAP_YEARS,
  ISO_DATE_SEPARATOR,
  LOCAL_BASIC_LENGTH,
  MONTH_INDEX_OFFSET,
  TZID_PARAM_PREFIX,
  UTC_BASIC_LENGTH,
} from "./constants.js";
import { errorMessage, extractRRuleLine } from "./rrule-utils.js";
import { floatingDateToUtcIso, isoToBasicWallTime, parseLocalBasicDate, toFloatingDate, wallTimeToUtc } from "./timezone.js";
import type { MaterializeOccurrencesInput, Occurrence, OccurrenceCache } from "./types.js";
import { validateRRule } from "./validate.js";

const { rrulestr } = rrulePackage;

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
  const dtstart = `${DTSTART_TZID_PREFIX}${input.tzid}:${isoToBasicWallTime(input.dtstart, input.tzid)}`;
  try {
    return rrulestr(`${dtstart}\nRRULE:${extractRRuleLine(input.rule)}`, { forceset: true, tzid: input.tzid });
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

function parseDateLine(line: string, fallbackTzid: string): string[] {
  const colonIndex = line.indexOf(":");
  const rawProperty = colonIndex >= 0 ? line.slice(0, colonIndex) : "";
  const rawDates = colonIndex >= 0 ? line.slice(colonIndex + MONTH_INDEX_OFFSET) : "";
  if (!rawProperty || !rawDates) return [];

  const tzid = rawProperty.includes(TZID_PARAM_PREFIX) ? rawProperty.split(TZID_PARAM_PREFIX)[DATE_VALUE_INDEX] : fallbackTzid;
  return rawDates.split(",").map((rawDate) => parseDateValue(rawDate.trim(), tzid ?? fallbackTzid));
}

function parseDateValue(rawDate: string, tzid: string): string {
  if (rawDate.includes(ISO_DATE_SEPARATOR)) return new Date(rawDate).toISOString();
  if (rawDate.endsWith("Z") && rawDate.length === UTC_BASIC_LENGTH) return parseUtcBasicDate(rawDate).toISOString();
  if (rawDate.length === LOCAL_BASIC_LENGTH) return wallTimeToUtc(parseLocalBasicDate(rawDate), tzid).toISOString();
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
