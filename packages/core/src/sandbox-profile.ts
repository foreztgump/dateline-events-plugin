import { afterSave, beforeDelete, beforeSave } from "./hooks.js";
import { calendarFeed, iCalFeed } from "./routes.js";
import { privacyErase, privacyExport } from "./privacy.js";
import type { CoreContext } from "./types.js";

const SAMPLE_EVENT = {
  collection: "dateline_events",
  id: "evt_profile",
  content: {
    id: "evt_profile",
    startsAt: "2026-01-01T17:00:00.000Z",
    endsAt: "2026-01-01T18:00:00.000Z",
    timezone: "UTC",
  },
};

export function profileBeforeSave(): void {
  beforeSave(structuredClone(SAMPLE_EVENT));
}

export async function profileAfterSave(ctx: CoreContext): Promise<void> {
  await afterSave(SAMPLE_EVENT, ctx);
}

export async function profileBeforeDelete(ctx: CoreContext): Promise<void> {
  await beforeDelete(SAMPLE_EVENT, ctx);
}

export async function profileCalendarFeed(ctx: CoreContext): Promise<void> {
  await calendarFeed({ request: new Request("https://example.com/calendar-feed?range=2026-01-01..2026-12-31"), ctx });
}

export async function profileICal(ctx: CoreContext): Promise<void> {
  await iCalFeed({ ctx });
}

export async function profilePrivacyExport(ctx: CoreContext): Promise<void> {
  await privacyExport({ request: privacyRequest("export"), ctx });
}

export async function profilePrivacyErase(ctx: CoreContext): Promise<void> {
  await privacyErase({ request: privacyRequest("erase"), ctx });
}

function privacyRequest(route: "export" | "erase"): Request {
  return new Request(`https://example.com/privacy/${route}?email=profile@example.com`);
}
