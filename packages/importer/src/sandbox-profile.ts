import { adminHandlers } from "./admin.js";
import { afterSave } from "./hooks.js";
import { importRows } from "./importer.js";
import type { ImporterContext } from "./types.js";

const PROFILE_SOURCE_ID = "profile:1";
const PROFILE_TITLE = "Profiler Event";

const PROFILE_ROW = {
  sourceId: PROFILE_SOURCE_ID,
  event: {
    sourceId: PROFILE_SOURCE_ID,
    title: PROFILE_TITLE,
    startsAt: "2026-01-01T17:00:00.000Z",
    endsAt: "2026-01-01T18:00:00.000Z",
    timezone: "UTC",
    status: "published",
    allDay: false,
    locationType: "physical" as const,
    organizers: [],
    categories: [],
    tags: [],
  },
};

export function profileAdmin(): void {
  adminHandlers.settings();
}

export function profileAfterSave(): void {
  afterSave({ collection: "dateline_importer_settings" });
}

export async function profileImportRows(ctx: ImporterContext): Promise<void> {
  await importRows([PROFILE_ROW], ctx);
}
