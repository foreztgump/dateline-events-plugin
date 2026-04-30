# eventon-slider — Features & i18n

## Core Features

1. **Event carousel** — Horizontal sliding/scrolling display of upcoming events.
2. **Configurable display** — Admin controls which fields show (title, date, location, image).
3. **Autoplay** — Automatic slide advancement.
4. **Standard EventON filters** — Category, date range, number of events — same as list view.

## i18n

No user-facing text strings beyond EventON standard labels. Settings labels only.

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| jQuery slider | React `<EventCarousel />` component (e.g., Embla Carousel or CSS scroll-snap) |
| Shortcode args | Component props: `limit`, `category`, `startDate` |
| Autoplay | CSS animation or JS timer; respect `prefers-reduced-motion` |

## Notes

P3 priority — implement last. Zero backend work. Single frontend component reusing existing event data API. Useful for landing pages and marketing pages; not core calendar functionality.
