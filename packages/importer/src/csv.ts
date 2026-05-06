import { createEventDraft } from "./normalize.js";
import type { CsvFieldMapping, ImportError, ImportParseResult, ImportRow } from "./types.js";

const REQUIRED_EVENT_FIELDS = ["title", "startsAt", "endsAt", "timezone"] as const;

export function parseCsv(csvText: string, mapping: CsvFieldMapping): ImportParseResult {
  const [headerLine, ...bodyLines] = csvText.trim().split(/\r?\n/);
  if (!headerLine) return { rows: [], errors: [{ row: 1, sourceId: "csv:1", message: "CSV header row is required." }] };
  const headers = splitCsvLine(headerLine);
  const parsedRows = bodyLines.map((line, index) => parseCsvRow({ line, headers, mapping, rowNumber: index + 2 }));
  return {
    rows: parsedRows.flatMap((parsedRow) => parsedRow.row ? [parsedRow.row] : []),
    errors: parsedRows.flatMap((parsedRow) => parsedRow.error ? [parsedRow.error] : []),
  };
}

function parseCsvRow(options: { line: string; headers: string[]; mapping: CsvFieldMapping; rowNumber: number }): { row?: ImportRow; error?: ImportError } {
  const { line, headers, mapping, rowNumber } = options;
  const record = Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index] ?? `column_${index}`, value]));
  const sourceId = `csv:${rowNumber}`;
  const missingField = REQUIRED_EVENT_FIELDS.find((field) => !record[mapping[field]]);
  if (missingField) return { error: { row: rowNumber, sourceId, message: `Missing required field ${missingField}.` } };
  try {
    return { row: { sourceId, event: createEventDraft(csvInput(sourceId, record, mapping)) } };
  } catch (error) {
    return { error: { row: rowNumber, sourceId, message: String(error) } };
  }
}

function csvInput(sourceId: string, record: Record<string, string>, mapping: CsvFieldMapping) {
  return {
    sourceId,
    title: record[mapping.title] ?? "",
    startsAt: record[mapping.startsAt] ?? "",
    endsAt: record[mapping.endsAt] ?? "",
    timezone: record[mapping.timezone] ?? "",
    customFields: mapping.location ? { location: record[mapping.location] } : undefined,
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;
  for (const character of line) {
    if (character === "\"") insideQuotes = !insideQuotes;
    else if (character === "," && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
    } else currentValue += character;
  }
  values.push(currentValue);
  return values.map((value) => value.trim());
}
