import fixtureData from "../../seed/events.json";
const REFERENCE_MONTH = "2026-05";
const REFERENCE_WEEK_START = "2026-05-25";
const REFERENCE_DAY = "2026-05-27";
const RECURRING_OCCURRENCE_DATES = [
  "2027-03-01T17:00:00.000Z",
  "2027-03-08T16:00:00.000Z",
  "2027-03-15T16:00:00.000Z",
  "2027-03-22T16:00:00.000Z",
  "2027-03-29T16:00:00.000Z",
  "2027-04-05T16:00:00.000Z",
] as const;
const ONE_HOUR_MILLISECONDS = 3_600_000;

export interface DatelineViewEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay: boolean;
  status: string;
  locationType: "physical" | "virtual" | "hybrid";
  organizers: string[];
  categories: string[];
  slug?: string;
  shortDescription?: string;
  description?: unknown[];
  venue?: string;
  recurrenceRule?: string;
  x402Price?: { amount: number; currency: string };
  rsvpRequired?: boolean;
  [key: string]: unknown;
}

interface DatelineVenue {
  id: string;
  name: string;
  address?: Record<string, string | undefined>;
  geo?: { lat: number; lng: number };
  website?: string;
}

interface DatelineOrganizer {
  id: string;
  name: string;
  email?: string;
  website?: string;
}

interface FixtureData {
  events: DatelineViewEvent[];
  venues: DatelineVenue[];
  organizers: DatelineOrganizer[];
}

const typedFixture = fixtureData as FixtureData;

export const referenceMonth = REFERENCE_MONTH;
export const referenceWeekStart = REFERENCE_WEEK_START;
export const referenceDay = REFERENCE_DAY;
export const seedEvents = typedFixture.events;
export const seedVenues = typedFixture.venues;
export const seedOrganizers = typedFixture.organizers;
export const displayEvents = [...seedEvents, ...weeklyYogaOccurrences()];

export function eventBySlug(slug: string): DatelineViewEvent | undefined {
  return seedEvents.find((event) => event.slug === slug);
}

export function venueForEvent(event: DatelineViewEvent): DatelineVenue | undefined {
  if (!event.venue) return undefined;
  return seedVenues.find((venue) => venue.id === event.venue);
}

export function organizersForEvent(event: DatelineViewEvent): DatelineOrganizer[] {
  return event.organizers
    .map((organizerId) => seedOrganizers.find((organizer) => organizer.id === organizerId))
    .filter((organizer): organizer is DatelineOrganizer => Boolean(organizer));
}

function weeklyYogaOccurrences(): DatelineViewEvent[] {
  const series = eventBySlug("weekly-yoga-dst");
  if (!series) return [];
  return RECURRING_OCCURRENCE_DATES.map((startsAt, index) => occurrenceEvent(series, startsAt, index));
}

function occurrenceEvent(series: DatelineViewEvent, startsAt: string, index: number): DatelineViewEvent {
  const endsAt = new Date(Date.parse(startsAt) + ONE_HOUR_MILLISECONDS).toISOString();
  return { ...series, id: `${series.id}-occurrence-${index + 1}`, slug: `${series.slug}-${index + 1}`, startsAt, endsAt, parentSeries: series.id };
}
