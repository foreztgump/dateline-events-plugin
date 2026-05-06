import { ATTENDEES_COLLECTION } from "./constants.js";

export const attendeeFields = [
  { name: "event", type: "reference", required: true },
  { name: "email", type: "email", required: true },
  { name: "name", type: "string", required: true },
  { name: "rsvpStatus", type: "enum", required: true, enum: ["confirmed", "waitlisted", "cancelled"] },
  { name: "ticketTierId", type: "string", required: false },
  { name: "checkedInAt", type: "datetime", required: false },
] as const;

export const collections = {
  [ATTENDEES_COLLECTION]: {
    slug: ATTENDEES_COLLECTION,
    label: "Dateline Attendees",
    fields: attendeeFields,
  },
};
