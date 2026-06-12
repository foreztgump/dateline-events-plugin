import type { DatelineOrganizer, DatelineVenue, DatelineViewEvent } from "../lib/types.js";

export interface CalendarMonthProps { events: DatelineViewEvent[]; month: string }
export interface CalendarWeekProps { events: DatelineViewEvent[]; weekStart: string }
export interface CalendarDayProps { events: DatelineViewEvent[]; date: string }
export interface CalendarListProps { events: DatelineViewEvent[] }
export interface CalendarAgendaProps { events: DatelineViewEvent[]; limit?: number }
export interface EventCardProps { event: DatelineViewEvent; expanded?: boolean; venue?: DatelineVenue; organizers?: DatelineOrganizer[] }
export interface EventDetailProps { event: DatelineViewEvent; venue?: DatelineVenue; organizers?: DatelineOrganizer[]; rsvpAction?: string }
export interface EventHeroProps { event: DatelineViewEvent }
export interface RsvpFormProps { event: DatelineViewEvent; action?: string }
export interface VenueMapProps { venue?: DatelineVenue }
export interface OrganizerCardProps { organizer: DatelineOrganizer }
