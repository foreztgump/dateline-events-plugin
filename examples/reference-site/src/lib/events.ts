import { materializeOccurrences } from "@dateline/recurring";
import type { DatelineOrganizer, DatelineVenue, DatelineViewEvent } from "@dateline/views";
import { getEmDashCollection, getEmDashEntry, PluginStorageRepository } from "emdash";
import { getDb } from "emdash/runtime";

const EVENTS_COLLECTION = "dateline_events";
const VENUES_COLLECTION = "dateline_venues";
const ORGANIZERS_COLLECTION = "dateline_organizers";
const RSVP_PLUGIN_ID = "dateline-rsvp";
const RSVP_STORAGE_COLLECTION = "rsvps";
const RSVP_STORAGE_INDEXES = ["kind", "eventId", "email", "status", "expiresAt"];
const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_EVENT_STATUS = "published";
const LOCATION_TYPE_VIRTUAL = "virtual";
const LOCATION_TYPE_HYBRID = "hybrid";
const LOCATION_TYPE_PHYSICAL = "physical";

/** Calendar anchor dates centred on the seeded May 2026 dataset. */
export const referenceMonth = "2026-05";
export const referenceWeekStart = "2026-05-25";
export const referenceDay = "2026-05-27";

const RECURRENCE_RANGE_YEARS = 2;
const MILLISECONDS_PER_YEAR = 31_536_000_000;

/** A single content entry as returned by the EmDash live loader. */
interface EmDashEntry<TData extends object = object> {
  id: string;
  data: TData;
}

/**
 * Load every published event from the live EmDash database, expanding recurring
 * series into individual occurrences for calendar rendering. The series itself
 * is retained so its detail page (and base metadata) stays reachable.
 */
export async function loadDisplayEvents(events?: DatelineViewEvent[]): Promise<DatelineViewEvent[]> {
  const sourceEvents = events ?? (await loadSeedEvents());
  const expanded = await Promise.all(
    sourceEvents.map(async (event) => (event.recurrenceRule ? [event, ...(await expandOccurrences(event))] : [event])),
  );
  return expanded.flat();
}

/** Load the source events (no recurrence expansion), sorted by start time. */
export async function loadSeedEvents(): Promise<DatelineViewEvent[]> {
  const { entries, error } = await getEmDashCollection(EVENTS_COLLECTION);
  if (error) throw new Error(`Failed to load events: ${String(error)}`);
  const events = await Promise.all(entries.map(toViewEvent));
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Load a single event by slug, or undefined when it does not exist. */
export async function loadEventBySlug(slug: string): Promise<DatelineViewEvent | undefined> {
  const entry = await loadEntry(EVENTS_COLLECTION, slug);
  return entry ? toViewEvent(entry) : undefined;
}

/** Resolve the venue referenced by an event, if any. */
export async function loadVenueForEvent(event: DatelineViewEvent): Promise<DatelineVenue | undefined> {
  if (!event.venue) return undefined;
  const entry = await loadEntry(VENUES_COLLECTION, event.venue);
  return entry ? toViewVenue(entry) : undefined;
}

/** Resolve every organizer referenced by an event, preserving order. */
export async function loadOrganizersForEvent(event: DatelineViewEvent): Promise<DatelineOrganizer[]> {
  const resolved = await Promise.all(event.organizers.map((slug) => loadOrganizerBySlug(slug)));
  return resolved.filter((organizer): organizer is DatelineOrganizer => Boolean(organizer));
}

async function loadOrganizerBySlug(slug: string): Promise<DatelineOrganizer | undefined> {
  const entry = await loadEntry(ORGANIZERS_COLLECTION, slug);
  return entry ? toViewOrganizer(entry) : undefined;
}

async function loadEntry(collection: string, slug: string): Promise<EmDashEntry | undefined> {
  const { entry, error } = await getEmDashEntry(collection, slug);
  if (error) throw new Error(`Failed to load ${collection} entry "${slug}": ${String(error)}`);
  return entry ?? undefined;
}

async function toViewEvent(entry: EmDashEntry): Promise<DatelineViewEvent> {
  const eventData = entry.data;
  const event: DatelineViewEvent = {
    id: entry.id,
    slug: entry.id,
    title: str(field(eventData, "title")),
    startsAt: str(field(eventData, "starts_at")),
    endsAt: str(field(eventData, "ends_at")),
    timezone: str(field(eventData, "timezone")) || DEFAULT_TIMEZONE,
    allDay: Boolean(field(eventData, "all_day")),
    status: str(field(eventData, "status")) || DEFAULT_EVENT_STATUS,
    locationType: locationType(field(eventData, "location_type")),
    organizers: stringArray(field(eventData, "organizers")),
    categories: stringArray(field(eventData, "categories")),
    shortDescription: optionalStr(field(eventData, "short_description")),
    description: array(field(eventData, "description")),
    venue: optionalStr(field(eventData, "venue")),
    recurrenceRule: optionalStr(field(eventData, "recurrence_rule")),
    rsvpRequired: Boolean(field(eventData, "rsvp_required")),
    rsvpCapacity: optionalInteger(field(eventData, "capacity")),
    x402Price: x402Price(field(eventData, "x402_price")),
  };
  return event.rsvpRequired ? withRsvpCapacity(event) : event;
}

async function withRsvpCapacity(event: DatelineViewEvent): Promise<DatelineViewEvent> {
  const fallbackCapacity = event.rsvpCapacity;
  if (fallbackCapacity === undefined) return event;
  const capacity = await loadRsvpCapacity(event.id, fallbackCapacity);
  return { ...event, rsvpCapacity: capacity.capacity, rsvpRemaining: capacity.remaining };
}

async function loadRsvpCapacity(eventId: string, fallbackCapacity: number): Promise<{ capacity: number; remaining: number }> {
  try {
    const db = await getDb();
    const storage = new PluginStorageRepository(db, RSVP_PLUGIN_ID, RSVP_STORAGE_COLLECTION, RSVP_STORAGE_INDEXES);
    const record = await storage.get(`capacity:${eventId}`);
    if (isCapacityRecord(record)) return { capacity: record.capacity ?? fallbackCapacity, remaining: record.remaining };
  } catch (error) {
    console.warn("Failed to load RSVP capacity; using seeded fallback", { eventId, error: String(error) });
  }
  return { capacity: fallbackCapacity, remaining: fallbackCapacity };
}

async function expandOccurrences(event: DatelineViewEvent): Promise<DatelineViewEvent[]> {
  try {
    const startsAtTimestamp = eventTimestamp(event, event.startsAt, "startsAt");
    const endsAtTimestamp = eventTimestamp(event, event.endsAt, "endsAt");
    const durationMs = endsAtTimestamp - startsAtTimestamp;
    const rangeStart = new Date(event.startsAt);
    const rangeEnd = new Date(rangeStart.getTime() + RECURRENCE_RANGE_YEARS * MILLISECONDS_PER_YEAR);
    const occurrences = await materializeOccurrences({
      rule: event.recurrenceRule ?? "",
      dtstart: event.startsAt,
      tzid: event.timezone,
      range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    });
    return occurrences
      .filter((occurrence) => occurrence.startsAt !== event.startsAt)
      .map((occurrence, index) => ({
        ...event,
        id: `${event.id}-occurrence-${index + 1}`,
        slug: event.slug,
        startsAt: occurrence.startsAt,
        endsAt: new Date(eventTimestamp(event, occurrence.startsAt, "occurrence.startsAt") + durationMs).toISOString(),
        recurrenceRule: undefined,
        parentSeries: event.id,
      }));
  } catch (error) {
    console.warn("Failed to expand recurring event; rendering source event only", { eventId: event.id, error: String(error) });
    return [];
  }
}

function eventTimestamp(event: DatelineViewEvent, isoValue: string, fieldName: string): number {
  const timestamp = Date.parse(isoValue);
  if (Number.isNaN(timestamp)) throw new Error(`Invalid ${fieldName} value for event "${event.id}": ${isoValue}`);
  return timestamp;
}

function toViewVenue(entry: EmDashEntry): DatelineVenue {
  const venueData = entry.data;
  const lat = num(field(venueData, "lat"));
  const lng = num(field(venueData, "lng"));
  return {
    id: entry.id,
    name: str(field(venueData, "name")),
    address: address(field(venueData, "address")),
    geo: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    website: optionalStr(field(venueData, "website")),
  };
}

function toViewOrganizer(entry: EmDashEntry): DatelineOrganizer {
  const organizerData = entry.data;
  return {
    id: entry.id,
    name: str(field(organizerData, "name")),
    email: optionalStr(field(organizerData, "email")),
    website: optionalStr(field(organizerData, "website")),
  };
}

function field(data: object, key: string): unknown {
  return Object.hasOwn(data, key) ? data[key as keyof typeof data] : undefined;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function array(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function locationType(value: unknown): DatelineViewEvent["locationType"] {
  return value === LOCATION_TYPE_VIRTUAL || value === LOCATION_TYPE_HYBRID ? value : LOCATION_TYPE_PHYSICAL;
}

function x402Price(value: unknown): DatelineViewEvent["x402Price"] {
  if (!isRecord(value)) return undefined;
  const amount = num(value.amount);
  const currency = optionalStr(value.currency);
  return amount !== undefined && currency !== undefined ? { amount, currency } : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCapacityRecord(value: unknown): value is { capacity?: number; remaining: number } {
  return isRecord(value) && value.kind === "capacity" && typeof value.remaining === "number";
}

function address(value: unknown): Record<string, string | undefined> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | undefined] => entry[1] === undefined || typeof entry[1] === "string"),
  );
}
