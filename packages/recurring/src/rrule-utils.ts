import { FREQ_PREFIX } from "./constants.js";

export function extractRRuleLine(rule: string): string {
  const rrulePrefix = "RRULE:";
  const matchingLine = rule.split(/\r?\n/).find((line) => line.toUpperCase().startsWith(rrulePrefix));
  return matchingLine ? matchingLine.slice(rrulePrefix.length).trim().toUpperCase() : rule.trim().toUpperCase();
}

export function readFreqValue(rruleLine: string): string | null {
  const freqPart = rruleLine.split(";").find((part) => part.startsWith(FREQ_PREFIX));
  return freqPart ? freqPart.slice(FREQ_PREFIX.length).trim().toUpperCase() : null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
