# Design

## Package format

`@dateline/views` is a native Astro package. The TypeScript entry point exports `.astro` component defaults and prop types; build copies `.astro` files into `dist/components` after `tsc -b` emits JS and declarations. Astro remains a peer dependency so host themes own their Astro runtime.

## Components

Each component receives plain Dateline event, venue, and organizer objects. Render-only logic (date grouping, month-grid cells, text extraction, live loader shape) lives in `src/lib/` so Astro templates remain small. Styled components use Tailwind utility defaults; headless components emit semantic structure and `data-dateline-component` hooks without `class` attributes.

## JSON-LD

`EventDetail` imports `eventToJsonLd` from `@dateline/core`, adapts venue/organizer fields to the helper shape, and emits one `<script type="application/ld+json">` block.

## Live collections

`emdashLoader` wraps EmDash `getEmDashCollection()` and returns a minimal live-collection-compatible object with `load()` producing `{ entries, totalCount }`. Tests inject a fetcher to avoid runtime CMS dependence.
