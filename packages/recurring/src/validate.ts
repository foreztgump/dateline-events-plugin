import { DTSTART_TZID_PREFIX, VALID_FREQ_VALUES } from "./constants.js";
import { getRRuleApi } from "./rrule-api.js";
import { errorMessage, extractRRuleLine, readFreqValue } from "./rrule-utils.js";
import { isValidTimeZone } from "./timezone.js";
import type { ValidateRRuleErrorCode, ValidateRRuleResult } from "./types.js";

const VALIDATION_DTSTART = "20000101T000000";
const { rrulestr } = getRRuleApi();

export function validateRRule(rule: string, tzid: string): ValidateRRuleResult {
  if (!isValidTimeZone(tzid)) return validationError("INVALID_TZID", `Unknown IANA timezone: ${tzid}`);

  const rruleLine = extractRRuleLine(rule);
  const freqValue = readFreqValue(rruleLine);

  if (!freqValue) return validationError("MISSING_FREQ", "RRULE must include a FREQ value.");
  if (!VALID_FREQ_VALUES.has(freqValue)) return validationError("INVALID_FREQ", `Unsupported RRULE FREQ value: ${freqValue}`);

  return parseRuleForValidation(rruleLine, tzid);
}

function parseRuleForValidation(rruleLine: string, tzid: string): ValidateRRuleResult {
  try {
    rrulestr(`${DTSTART_TZID_PREFIX}${tzid}:${VALIDATION_DTSTART}\nRRULE:${rruleLine}`, { forceset: true, tzid });
    return { ok: true };
  } catch (error) {
    return validationError("INVALID_RRULE", errorMessage(error));
  }
}

function validationError(code: ValidateRRuleErrorCode, message: string): ValidateRRuleResult {
  return { ok: false, code, message };
}

