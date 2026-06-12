import * as rruleNamespace from "rrule";

export function getRRuleApi(): typeof import("rrule") {
  const candidate = rruleNamespace as Partial<typeof import("rrule")> & { default?: typeof import("rrule") };
  if (candidate.rrulestr) return candidate as typeof import("rrule");
  if (candidate.default?.rrulestr) return candidate.default;
  throw new Error("rrule package does not expose rrulestr.");
}
