import { renderICal } from "@dateline/core/ical";

import { loadSeedEvents } from "./events.js";

const ICAL_HEADERS = { "content-type": "text/calendar; charset=utf-8" } as const;

export async function renderReferenceICal(): Promise<Response> {
  const events = await loadSeedEvents();
  return new Response(renderICal(events), { headers: ICAL_HEADERS });
}
