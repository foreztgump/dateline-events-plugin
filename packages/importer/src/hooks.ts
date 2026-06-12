import { IMPORTER_CRON_NAME, IMPORTER_CRON_SCHEDULE } from "./constants.js";
import { drainDeferredRemoteFeeds } from "./deferred.js";
import { boundaryError } from "./errors.js";
import type { ImporterContext } from "./types.js";

export function afterSave(event: { collection: string }): void {
  if (event.collection !== "dateline_importer_settings") return;
}

export async function install(_event: unknown, ctx: ImporterContext): Promise<void> {
  await scheduleImporterJobs(ctx, "install");
}

export async function activate(_event: unknown, ctx: ImporterContext): Promise<void> {
  await scheduleImporterJobs(ctx, "activate");
}

export async function cron(event: { name?: string }, ctx: ImporterContext): Promise<void> {
  if (event.name !== IMPORTER_CRON_NAME) return;
  try {
    await drainDeferredRemoteFeeds(ctx);
  } catch (error) {
    throw boundaryError("cron(importer-deferred-feeds)", error);
  }
}

async function scheduleImporterJobs(ctx: ImporterContext, lifecycleName: string): Promise<void> {
  const schedule = ctx.cron?.schedule.bind(ctx.cron);
  if (!schedule) return;
  try {
    await schedule(IMPORTER_CRON_NAME, { schedule: IMPORTER_CRON_SCHEDULE });
  } catch (error) {
    throw boundaryError(`cron.schedule(importer-${lifecycleName})`, error);
  }
}
