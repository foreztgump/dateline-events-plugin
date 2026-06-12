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
  featuredImage?: string;
  venue?: string;
  recurrenceRule?: string;
  x402Price?: { amount: number; currency: string };
  rsvpRequired?: boolean;
  rsvpCapacity?: number;
  rsvpRemaining?: number;
  [key: string]: unknown;
}

export interface DatelineVenue {
  id: string;
  name: string;
  address?: Record<string, string | undefined>;
  geo?: { lat: number; lng: number };
  phone?: string;
  website?: string;
  description?: unknown[];
}

export interface DatelineOrganizer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  bio?: unknown[];
  avatar?: string;
}

export interface CalendarDayCell {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  events: CalendarEventPlacement[];
  hiddenCount: number;
}

export interface CalendarEventPlacement {
  event: DatelineViewEvent;
  spanDays: number;
}
