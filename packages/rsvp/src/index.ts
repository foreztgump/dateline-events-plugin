import { definePlugin } from "emdash";
import { adminHandlers } from "./admin.js";
import { collections } from "./collections.js";
import { PLUGIN_ID, PLUGIN_VERSION } from "./constants.js";
import { activate, afterSave, cron } from "./hooks.js";
import { rsvpSubmit, waitlistJoin } from "./routes.js";

export { adminHandlers } from "./admin.js";
export { collections, attendeeFields } from "./collections.js";
export { activate, afterSave, cron } from "./hooks.js";
export { rsvpSubmit, waitlistJoin } from "./routes.js";
export { reserveCapacity, releaseCapacity } from "./capacity.js";
export { enqueueWaitlist, popNextWaitlistEntry, readWaitlist } from "./waitlist.js";
export type { AdminHandlers, Attendee, HookEvent, RouteInput, RsvpContext, RsvpStatus } from "./types.js";

const capabilities = ["content:read", "content:write", "email:send"];
const routeNames = ["rsvp-submit", "waitlist", "admin/attendees", "admin/waitlist"];
// EmDash 0.9.0 runtime accepts manifest metadata, while its public type omits in-progress plugin fields used by Dateline v0.1.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const defineDatelinePlugin = definePlugin as unknown as <T extends Record<string, unknown>>(definition: T) => T;

export default function createRsvpPlugin() {
  return defineDatelinePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [...capabilities],
    collections,
    hooks: {
      "content:afterSave": afterSave,
      "plugin:activate": activate,
      cron,
    },
    routes: routeNames,
    routeHandlers: {
      "rsvp-submit": rsvpSubmit,
      waitlist: waitlistJoin,
      "admin/attendees": adminHandlers.attendees,
      "admin/waitlist": adminHandlers.waitlist,
    },
    admin: {
      pages: [
        { path: "/dateline/rsvp/attendees", label: "RSVP Attendees", icon: "users" },
        { path: "/dateline/rsvp/waitlist", label: "Waitlist", icon: "clock" },
      ],
    },
  });
}
