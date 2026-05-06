# views Specification

## ADDED Requirements

### Requirement: Package exports Astro components

`@dateline/views` SHALL export CalendarMonth, CalendarWeek, CalendarDay, CalendarList, CalendarAgenda, EventCard, EventDetail, EventHero, RsvpForm, VenueMap, and OrganizerCard, plus headless variants for theme integration.

#### Scenario: importing from package root

- **WHEN** a theme imports named exports from `@dateline/views`
- **THEN** all styled and headless component exports are defined

### Requirement: Month calendar grid

`CalendarMonth` SHALL render a fixed 7-by-6 accessible month grid with events placed on matching date cells and multi-day span metadata.

#### Scenario: rendering May 2026

- **WHEN** May 2026 events are rendered
- **THEN** the output includes 42 day cells, accessible calendar labeling, matching event titles, and overflow links

### Requirement: Event detail JSON-LD

`EventDetail` SHALL emit schema.org Event JSON-LD using the `@dateline/core` helper.

#### Scenario: rendering an event with venue and organizer

- **WHEN** EventDetail renders an event, venue, and organizer
- **THEN** the JSON-LD script parses as `@type: Event` with Place and Organization nodes

### Requirement: Headless variants

Headless variants SHALL render semantic structure without `class` attributes.

#### Scenario: rendering CalendarMonthHeadless

- **WHEN** the headless month component renders
- **THEN** the output has no class attributes and includes data hooks for theme authors

### Requirement: EmDash live loader

`emdashLoader({ collection })` SHALL expose a loader whose `load()` returns `{ entries, totalCount }`.

#### Scenario: loading Dateline events

- **WHEN** the loader reads `dateline_events`
- **THEN** it returns entries and a total count matching the collection response
