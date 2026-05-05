export type ValidateRRuleErrorCode = "INVALID_TZID" | "MISSING_FREQ" | "INVALID_FREQ" | "INVALID_RRULE";
export type ValidateRRuleResult = { ok: true } | { ok: false; code: ValidateRRuleErrorCode; message: string };

export interface DateRange {
  start: string;
  end: string;
}

export interface MaterializeOccurrencesInput {
  rule: string;
  dtstart: string;
  tzid: string;
  range: DateRange;
  exdates?: string[];
  rdates?: string[];
}

export interface Occurrence {
  startsAt: string;
}

export interface OccurrenceCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface WallTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}
