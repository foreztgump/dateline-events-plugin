import { EVENTS_COLLECTION, ORGANIZERS_COLLECTION, VENUES_COLLECTION } from "./constants.js";
import type { CollectionField, CollectionSchema } from "./types.js";

const STATUS_VALUES = ["draft", "published", "cancelled", "rescheduled", "postponed", "completed"];
const LOCATION_VALUES = ["physical", "virtual", "hybrid"];
const ACCESS_VALUES = ["public", "rsvped", "ticket_holder", "logged_in"];
interface FieldOptions {
  required?: boolean;
  enumValues?: string[];
}

export const eventFields: CollectionField[] = [
  field("title", "string", { required: true }),
  field("description", "portableText"),
  field("status", "enum", { required: true, enumValues: STATUS_VALUES }),
  field("startsAt", "datetime", { required: true }),
  field("endsAt", "datetime", { required: true }),
  field("timezone", "string", { required: true }),
  field("allDay", "boolean", { required: true }),
  field("isFeatured", "boolean"),
  field("featuredAt", "datetime"),
  field("categories", "taxonomy[]", { required: true }),
  field("tags", "taxonomy[]"),
  field("featuredImage", "asset"),
  field("externalUrl", "url"),
  field("externalUrlTarget", "enum", { enumValues: ["_blank", "_self"] }),
  field("color", "string"),
  field("locale", "string"),
  field("hideEndTime", "boolean"),
  field("spanUntilEnd", "boolean"),
  field("venue", "reference"),
  field("location", "object"),
  field("locationType", "enum", { required: true, enumValues: LOCATION_VALUES }),
  field("organizers", "reference[]", { required: true }),
  field("showMap", "boolean"),
  field("isRecurring", "boolean"),
  field("recurrenceRule", "string"),
  field("showSeries", "boolean"),
  field("virtualUrl", "url"),
  field("meetingProvider", "string"),
  field("capacity", "number"),
  field("rsvpRequired", "boolean"),
  field("customFields", "object[]"),
  field("contactEmail", "string"),
  field("virtualAccess", "enum", { enumValues: ACCESS_VALUES }),
  field("x402Price", "object"),
];

export const collections = {
  [EVENTS_COLLECTION]: collection(EVENTS_COLLECTION, "Dateline Events", eventFields),
  [VENUES_COLLECTION]: collection(VENUES_COLLECTION, "Dateline Venues", venueFields()),
  [ORGANIZERS_COLLECTION]: collection(ORGANIZERS_COLLECTION, "Dateline Organizers", organizerFields()),
};

function field(name: string, type: string, options: FieldOptions = {}): CollectionField {
  return { name, type, required: options.required, enum: options.enumValues };
}

function collection(slug: string, label: string, fields: CollectionField[]): CollectionSchema {
  return { slug, label, fields };
}

function venueFields(): CollectionField[] {
  return [field("name", "string", { required: true }), field("address", "object"), field("lat", "number"), field("lng", "number"), field("showMap", "boolean")];
}

function organizerFields(): CollectionField[] {
  return [field("name", "string", { required: true }), field("bio", "portableText"), field("email", "string"), field("website", "url"), field("socials", "object[]")];
}
