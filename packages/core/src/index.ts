import { adminHandlers } from "./admin.js";
import { collections } from "./collections.js";
import { PLUGIN_ID, PLUGIN_VERSION } from "./constants.js";
import { afterSave, beforeDelete, beforeSave } from "./hooks.js";
import { privacyErase, privacyExport } from "./privacy.js";
import { calendarFeed, iCalFeed } from "./routes.js";

export { adminHandlers } from "./admin.js";
export { collections, eventFields } from "./collections.js";
export { afterSave, beforeDelete, beforeSave } from "./hooks.js";
export { calendarFeed, iCalFeed, listEvents } from "./routes.js";
export { privacyErase, privacyExport } from "./privacy.js";
export { eventToJsonLd } from "./schema-org.js";
export type { AdminHandlers, CollectionField, CollectionSchema, DatelineEvent } from "./types.js";

const capabilities = ["content:read", "content:write", "media:read"];
const routeNames = ["calendar-feed", "ical", "admin/events", "admin/venues", "admin/organizers", "admin/settings", "privacy/export", "privacy/erase"];

export default function createCorePlugin() {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [...capabilities],
    collections,
    hooks: {
      "content:beforeSave": beforeSave,
      "content:afterSave": afterSave,
      "content:beforeDelete": beforeDelete,
    },
    routes: routeNames,
    routeHandlers: {
      "calendar-feed": calendarFeed,
      ical: iCalFeed,
      "admin/events": adminHandlers.events,
      "admin/venues": adminHandlers.venues,
      "admin/organizers": adminHandlers.organizers,
      "admin/settings": adminHandlers.settings,
      "privacy/export": privacyExport,
      "privacy/erase": privacyErase,
    },
    admin: {
      pages: [
        { path: "/dateline", label: "Events", icon: "calendar" },
        { path: "/dateline/venues", label: "Venues", icon: "map-pin" },
        { path: "/dateline/organizers", label: "Organizers", icon: "users" },
        { path: "/dateline/settings", label: "Settings", icon: "cog" },
      ],
    },
  };
}
