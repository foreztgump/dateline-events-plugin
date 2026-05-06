import { EVENTS_COLLECTION } from "./constants.js";
import { boundaryMessage } from "./errors.js";
import type { ImporterContext, ImportParseResult, ImportRow, ImportSummary } from "./types.js";

export async function importRows(rows: ImportRow[], ctx: ImporterContext): Promise<ImportSummary> {
  const summaries = await Promise.all(rows.map((row, index) => importSingleRow(row, ctx, index + 1)));
  return {
    created: summaries.filter((summary) => summary.status === "created").length,
    skipped: summaries.filter((summary) => summary.status === "skipped").length,
    errors: summaries.flatMap((summary) => summary.error ? [summary.error] : []),
  };
}

export function mergeParseResults(results: ImportParseResult[]): ImportParseResult {
  return {
    rows: results.flatMap((parseResult) => parseResult.rows),
    errors: results.flatMap((parseResult) => parseResult.errors),
  };
}

async function importSingleRow(row: ImportRow, ctx: ImporterContext, rowNumber: number) {
  try {
    const content = requireContent(ctx);
    if (await sourceExists(row.sourceId, ctx)) return { status: "skipped" as const };
    await content.create(EVENTS_COLLECTION, row.event);
    return { status: "created" as const };
  } catch (error) {
    ctx.log?.warn("dateline importer row failed", { sourceId: row.sourceId, error });
    return { status: "error" as const, error: { row: rowNumber, sourceId: row.sourceId, message: boundaryMessage("ctx.content", error) } };
  }
}

async function sourceExists(sourceId: string, ctx: ImporterContext): Promise<boolean> {
  const response = await requireContent(ctx).list(EVENTS_COLLECTION, { filter: { sourceId } });
  return (response?.items ?? response?.entries ?? []).length > 0;
}

function requireContent(ctx: ImporterContext): NonNullable<ImporterContext["content"]> {
  if (!ctx.content) throw new Error("Importer requires ctx.content.");
  return ctx.content;
}
