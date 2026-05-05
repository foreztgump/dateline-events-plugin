import type { DatelineEvent } from "./types.js";

interface VenueInput {
  name?: string;
  address?: Record<string, string>;
  lat?: number;
  lng?: number;
}

interface OrganizerInput {
  name?: string;
  url?: string;
}

const CENTS_PER_MAJOR_UNIT = 100;

export function eventToJsonLd(event: DatelineEvent, venue?: VenueInput, organizers: OrganizerInput[] = []) {
  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: schemaStatus(event.status),
    eventAttendanceMode: attendanceMode(event.locationType),
    location: venue ? placeJsonLd(venue) : undefined,
    organizer: organizers.map(organizerJsonLd),
    offers: event.x402Price ? offerJsonLd(event.x402Price) : undefined,
  });
}

function placeJsonLd(venue: VenueInput) {
  return stripUndefined({
    "@type": "Place",
    name: venue.name,
    address: venue.address ? { "@type": "PostalAddress", ...venue.address } : undefined,
    geo: typeof venue.lat === "number" && typeof venue.lng === "number" ? { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng } : undefined,
  });
}

function organizerJsonLd(organizer: OrganizerInput) {
  return stripUndefined({ "@type": "Organization", name: organizer.name, url: organizer.url });
}

function offerJsonLd(price: { amount: number; currency: string }) {
  return { "@type": "Offer", price: (price.amount / CENTS_PER_MAJOR_UNIT).toFixed(2), priceCurrency: price.currency, availability: "https://schema.org/InStock" };
}

function schemaStatus(status: string): string {
  if (status === "cancelled") return "https://schema.org/EventCancelled";
  if (status === "postponed") return "https://schema.org/EventPostponed";
  return "https://schema.org/EventScheduled";
}

function attendanceMode(locationType: DatelineEvent["locationType"]): string {
  if (locationType === "virtual") return "https://schema.org/OnlineEventAttendanceMode";
  if (locationType === "hybrid") return "https://schema.org/MixedEventAttendanceMode";
  return "https://schema.org/OfflineEventAttendanceMode";
}

function stripUndefined<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter((entry) => entry[1] !== undefined)) as T;
}
