export const PLUGIN_ID = "dateline-core";
export const EVENTS_COLLECTION = "dateline_events";
export const VENUES_COLLECTION = "dateline_venues";
export const ORGANIZERS_COLLECTION = "dateline_organizers";
export const ATTENDEES_COLLECTION = "dateline_attendees";
// PRO-879: range-cache lazy-expiry horizon. EmDash 0.18 `ctx.kv.set` has no
// expirationTtl (get/set/delete/list only), so cached feed bodies must carry
// their own createdAt and be treated as misses once older than this.
export const CACHE_TTL_SECONDS = 3_600;
export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
export const ICAL_HEADERS = { "content-type": "text/calendar; charset=utf-8" };
export const TOMBSTONED_EMAIL = "erased@dateline.local";
