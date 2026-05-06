import { renderICal } from "@dateline/core/ical";
import { seedEvents } from "./fixtures.js";

const ICAL_HEADERS = { "content-type": "text/calendar; charset=utf-8" } as const;

export function renderReferenceICal(): Response {
  return new Response(renderICal(seedEvents), { headers: ICAL_HEADERS });
}
