import type { CsvFieldMapping } from "./types.js";

export function csvMapping(payload: unknown): CsvFieldMapping {
  const mapping = readPayloadProperty(payload, "mapping");
  if (!isCsvFieldMapping(mapping)) throw new Error("CSV import requires a mapping object.");
  return mapping;
}

function readPayloadProperty(payload: unknown, key: string): unknown {
  if (!isRecord(payload)) return undefined;
  return payload[key];
}

function isCsvFieldMapping(value: unknown): value is CsvFieldMapping {
  if (!isRecord(value)) return false;
  return typeof value.title === "string" && typeof value.startsAt === "string" && typeof value.endsAt === "string" && typeof value.timezone === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
