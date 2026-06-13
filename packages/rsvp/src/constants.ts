export const PLUGIN_ID = "dateline-rsvp";
export const ATTENDEES_COLLECTION = "dateline_attendees";
export const RSVPS_STORAGE_COLLECTION = "rsvps";
export const CAPACITY_FULL_MESSAGE = "capacity full";
export const DUPLICATE_RSVP_MESSAGE = "duplicate RSVP";
export const RSVP_STATUS_CONFIRMED = "confirmed";
export const RSVP_STATUS_WAITLISTED = "waitlisted";
export const RSVP_STATUS_CANCELLED = "cancelled";
export const CLAIM_STATUS_PENDING = "pending";
export const CLAIM_STATUS_CONFIRMED = "confirmed";
export const CLAIM_STATUS_RELEASED = "released";
export const CLAIM_STATUS_CANCELLED = "cancelled";
export const HOLD_STATUS_ACTIVE = "active";
export const HOLD_STATUS_EXPIRED = "expired";
export const RSVP_SWEEP_NAME = "dateline-rsvp-waitlist-sweep";
export const RSVP_HOLD_EXPIRY_NAME = "dateline-rsvp-hold-expiry";
export const RSVP_SWEEP_CRON = "*/5 * * * *";
export const RATE_LIMIT_TTL_SECONDS = 60;
export const HTTP_OK = 200;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_CAPACITY_FULL = 409;
export const HTTP_INTERNAL_ERROR = 500;
export const INTERNAL_ERROR_MESSAGE = "internal error";
export const MAX_CRON_PROMOTIONS = 3;
// Cap hold expirations per cron invocation: each expireHold spends multiple
// storage subrequests, so an unbounded sweep would breach the 10-subrequest
// sandbox budget. Remaining holds are swept on the next cron tick.
export const MAX_CRON_HOLD_EXPIRATIONS = 3;
// PRO-879: cap rate-limit record deletions per cron tick. Each purge spends a
// storage subrequest, so an unbounded sweep would breach the 10-subrequest
// sandbox budget. Remaining expired records are purged on the next tick.
export const MAX_CRON_RATE_LIMIT_PURGES = 3;
export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
