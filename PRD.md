# PRD: Dateline — Events, Calendar & Ticketing for EmDash

> **Status:** Draft v0.3 (EmDash 0.9.0 lock-in) · **Owner:** Claudeflare
> **Last updated:** 2026-05-02
> **EmDash target:** ^0.9.0 (locked per `research/synthesis/emdash-platform-research.md`)
> **Companion docs:** `PRD-WP-Events-Plugin-Analysis.md`
> **Replaces:** Dateline PRD v0.1 (contained invented capability names — superseded)

---

## Why this rewrite

The prior PRD used invented EmDash primitives (`mcp:register-tools`, `webhook:receive`, `admin:panel`, `x402:facilitate`, `schedule:cron`, arbitrary React admin UIs). EmDash does not have those. This rewrite is grounded in:

- **Cloudflare's launch post** ([blog.cloudflare.com/emdash-wordpress](https://blog.cloudflare.com/emdash-wordpress/))
- **EmDash GitHub `skills/creating-plugins/SKILL.md`** (canonical capability list and `ctx` bindings)
- **EmDash docs site** ([emdashcms.org/docs/contributors](https://emdashcms.org/docs/contributors))
- **A real-world plugin postmortem** ([Dashstro: EmDash Plugin Pitfalls](https://dashstro.com/learn/emdash-plugin-pitfalls)) — Block Kit gotchas
- **Issue #710** — `ctx.waitUntil` / `after()` requirement for async-after-response work

Capability naming is **locked**: emdash@0.9.0 (PR #816) unified under `<resource>[:<sub-resource>]:<verb>[:<qualifier>]` (`content:read`, `content:write`, `network:request`, `network:request:unrestricted`). Old forms (`read:content`, `network:fetch`) are deprecated — `emdash plugin publish` rejects manifests using them. Source: `research/synthesis/emdash-platform-research.md` Q1.

---

## Overview

Dateline is the events, calendar, and ticketing system for EmDash. It manages everything from a single recurring meetup with free RSVPs to a 1,500-seat theater with assigned seating, dynamic pricing, and box-office check-in. It ships modular: a small open-source MIT core (`@dateline/core`) plus a curated set of add-ons. Each add-on is its own plugin with its own capability manifest.

Dateline is the first events plugin designed for AI-native workflows. Through EmDash's built-in MCP server, every Dateline operation — create event, move date, refund ticket, 86 a sold-out tier — is reachable from Claude Desktop, Cursor, or any MCP client. A native-format admin AI chat panel turns event management into conversation.

## Problem Statement

EmDash has no events solution. Users coming from WordPress expect The Events Calendar (800K+ installs) or EventON (Codecanyon's #1 events plugin). [WPPoland's 2026 EmDash comparison](https://wppoland.com/en/emdash-vs-wordpress-feature-comparison-2026/) explicitly flags "no events plugin" as an adoption blocker.

Beyond filling the gap, four chronic WordPress events problems are solvable at the EmDash architecture level:

1. **Performance.** [Gravity Booking benchmarks](https://gravitybooking.com/best-wordpress-events-plugins/) show The Events Calendar runs 85+ DB queries per list view. EmDash's structured-content model (Portable Text + Kysely + edge cache) lets us hit single-digit-query list views.
2. **AI is bolted on.** Eventin Pro and EventON have one-line AI assists. Neither exposes their event surface to MCP. Dateline ships with an MCP integration as a first-class feature.
3. **Modularity but no isolation.** EventON's add-on model is great, but every add-on shares the same PHP process. EmDash's Dynamic Worker isolates each add-on per V8 isolate with declared capabilities.
4. **Ticketing as a separate plugin family.** TEC + Event Tickets Plus + Filter Bar + Aggregator is four plugins, four bug surfaces. Dateline keeps a coherent versioning story under one core.

## Target Users

- **Independent organizers** — meetups, conferences, classes, workshops
- **Small venues** — comedy clubs, music venues, theaters under 500 seats
- **Restaurants & hospitality** — overlap with the future Carte plugin
- **Religious & community organizations** — recurring services, fundraisers, classes
- **Education** — courses, lectures, workshop series
- **Hybrid event operators** — in-person + virtual mix

Out of scope for v1: enterprise festivals (>10K attendees), multi-venue ticketing networks, white-label resale platforms.

---

## EmDash Architecture Constraints (READ FIRST)

These are non-negotiable runtime realities that shape every decision below.

### 1. Two plugin formats

EmDash plugins ship in one of two formats:

- **Standard format** — `definePlugin({ hooks, routes })`. Backend-only logic. Runs in a Dynamic Worker sandbox on Cloudflare. Admin UI is **Block Kit JSON** returned from plugin routes (no arbitrary HTML/React).
- **Native format** — adds `admin.entry` (React), `admin.portableTextBlocks`, and Astro components alongside backend hooks. Runs locally-registered (trusted), not sandboxed. Required when the admin UI exceeds Block Kit's expressive range (canvas editors, streaming chat, complex state).

**Implication:** Dateline ships *both kinds*. We split the family along sandbox suitability. See "Plugin Family" below.

### 2. Sandboxed runtime limits

Per [Dashstro's plugin postmortem](https://dashstro.com/learn/emdash-plugin-pitfalls):

- **50ms CPU per invocation** for sandboxed plugins
- **10 subrequests per invocation**
- Locally-registered (trusted) plugins are not capped this way

**Implication:** Sandboxed plugins must keep handlers small, use `ctx.waitUntil` / `after()` to defer work past the response, and batch external API calls aggressively. Work that exceeds limits must live in a trusted plugin.

### 3. Async-after-response pattern

Per [Issue #710](https://github.com/emdash-cms/emdash/issues/710): on Cloudflare Workers, any in-flight Promise not registered with `ctx.waitUntil` (or scheduled via the `after()` helper added in 0.6.0) is silently cancelled when the request context tears down. This breaks fire-and-forget patterns that work fine on Node.

**Implication:** Every webhook handler, every "send confirmation email after RSVP" path uses `ctx.waitUntil(promise)` or `after(() => promise)`. We document this prominently in Dateline's plugin patterns.

### 4. Block Kit gotchas

Per EmDash 0.9.0 `block-kit.md` reference (supersedes Dashstro):
- Stats block uses `stats` key (NOT `items`)
- Buttons use `text` (NOT `label`)
- Section `text` accepts plain string for simple text; use `children` with marks for rich content
- Plugin routes return `BlockResponse = { blocks, toast? }` — no redirect support, no raw `Response`
- Authoring guard: ship `validateBlocks()` against typed builders in CI

**Implication:** Dateline maintains a small internal `@dateline/blocks` builder library for safe Block Kit construction.

### 5. Free vs paid Cloudflare plan

Per [emdashcmseverything.com FAQ](https://emdashcmseverything.com/faq/emdash-cms-cloudflare-free-plan-limitations-faq): Cloudflare Free plan does not run Dynamic Workers. **On Free plan, sandboxed plugins do not get isolation** — they must run as trusted (locally registered).

**Implication:** Dateline's commercial add-ons require paid Cloudflare plan to deliver their security pitch. Documented at install time.

### 6. Self-hosted Node mode

EmDash also runs on Node.js (any host). On Node, plugins run in-process. The sandbox isolation pitch applies in full only on Cloudflare.

**Implication:** Dateline supports both deployment modes; security messaging accurately reflects the deployment.

### 7. Plugin route mounting

All plugin routes mount at `/_emdash/api/plugins/<plugin-id>/<route>`. Path is fixed, not configurable.

### 8. Database access

Plugins do not get raw SQL. All content access goes through `ctx.content.*`. The CMS internally uses Kysely against D1 / SQLite / Postgres / Turso, but plugins never see this.

### 9. KV is plugin-scoped

`ctx.kv.*` is automatically scoped per plugin. No declaration required (contrary to my prior PRD). One plugin's KV is invisible to another.

### 10. MCP server is core

EmDash's MCP server is built into core. Every plugin's `ctx.content` operations are reachable through MCP automatically. **We do not ship a separate "MCP integration" — content operations are MCP-exposed by virtue of using `ctx.content`.** What we *do* ship: custom MCP tools for Dateline-specific verbs (`tickets.refund`, `seats.release`, etc.) — pattern TBD; verify whether a plugin hook for tool registration exists or whether we expose via plugin API routes that an MCP wrapper consumes.

> **Open question for finalization:** confirm the exact API for plugins to register custom MCP tools. If none exists in 0.6.x, file an upstream feature request and use REST routes as the interim interface.

### 11. x402 is core

x402 micropayments are built into EmDash core ([Cloudflare blog](https://blog.cloudflare.com/emdash-wordpress/)): "configure which content should require payment, set how much to charge, provide a Wallet address." There is no `x402:facilitate` plugin capability. Dateline integrates by setting price metadata on events and ticket tiers — core handles the 402 flow.

**Implication:** No separate `dateline-x402` plugin. x402 support is a feature of the core `@dateline/core`, configured per event/tier.

---

## Capability Manifest System

Per emdash@0.9.0 canonical capability list (PR #816 — `<resource>[:<sub-resource>]:<verb>[:<qualifier>]`):

| Capability | Grants | `ctx` binding |
|---|---|---|
| `content:read` | `ctx.content.get()`, `ctx.content.list()` | `ctx.content` |
| `content:write` | `ctx.content.create()`, `ctx.content.update()`, `ctx.content.delete()` | `ctx.content` |
| `media:read` | `ctx.media.get()`, `ctx.media.list()` | `ctx.media` |
| `media:write` | `ctx.media.getUploadUrl()`, `ctx.media.delete()` | `ctx.media` |
| `network:request` | `ctx.http.fetch()` restricted to `allowedHosts` | `ctx.http` |
| `network:request:unrestricted` | `ctx.http.fetch()` unrestricted (caution flag) | `ctx.http` |
| `users:read` | `ctx.users.get()`, `ctx.users.list()`, `ctx.users.getByEmail()` | `ctx.users` |
| `email:send` | `ctx.email.send()` via core mail pipeline | `ctx.email` |
| `hooks.email-transport:register` | Register an email transport for the site | hooks |
| `hooks.email-events:register` | Hook `email:beforeSend` / `email:afterSend` | hooks |
| `hooks.page-fragments:register` | Register page fragments injected into rendered pages | hooks |

Always granted (no capability declaration needed): `ctx.kv`, `ctx.log`. Hooks and routes are declared in the manifest but not capability-gated. Verify names before shipping — `emdash plugin publish` rejects deprecated forms.

> **Note for plugin authors:** declare the minimum needed. `network:request:unrestricted`, `users:read`, and `hooks.email-events:register` add a caution signal in the marketplace. Source: `research/synthesis/emdash-platform-research.md` Q1.

---

## Plugin Family

Restructured along the standard-vs-native axis after EmDash constraint review.

### Standard format (sandboxed, distributable through marketplace)

| Plugin | License | Pricing | Notes |
|---|---|---|---|
| `@dateline/core` | MIT | Free | Events, venues, organizers, basic Block Kit admin, iCal output, schema.org, x402 config |
| `@dateline/rsvp` | MIT | Free | Free-RSVP flow, capacity, waitlist, email confirmations |
| `@dateline/recurring` | MIT | Free | RFC 5545 RRULE, exceptions, lazy occurrence materialization |
| `@dateline/importer` | MIT | Free | CSV, iCal, JSON import; one-shot TEC migrator |
| `@dateline/tickets-backend` | Commercial | $99/yr | Stripe webhooks, ticket inventory, refund engine — backend only |
| `@dateline/virtual` | Commercial | $59/yr | Zoom, Meet, Jitsi backend integrations (admin = Block Kit settings) |
| `@dateline/pricing` | Commercial | $49/yr | Promo codes, dynamic pricing rules — backend logic |

### Native format (locally-registered, requires trust grant)

| Plugin | License | Pricing | Notes |
|---|---|---|---|
| `@dateline/views` | MIT | Free | Astro components for theme integration: month, week, day, list views |
| `@dateline/tickets-admin` | Commercial | bundled with `tickets-backend` | React admin: tier editor, order management, refund UI |
| `@dateline/seats` | Commercial | $79/yr | React canvas seat-map designer + frontend seat picker component |
| `@dateline/checkin` | Commercial | $39/yr | PWA scanner for door staff (offline-capable) |
| `@dateline/ai` | Commercial | $99/yr | Streaming chat panel, MCP tool wrappers, inline AI actions |

### Bundles

- **Dateline Suite** — all commercial plugins, $399/yr or $999 lifetime
- **Dateline Theater** — core + recurring + tickets + seats + checkin, $249/yr
- **Dateline Community** — core + rsvp + recurring + virtual, free (all MIT)

Dependency rules: every add-on declares `requires: ["@dateline/core"]`. Tickets-admin depends on tickets-backend. Seats depends on tickets-backend. Pricing depends on tickets-backend. EmDash plugin manager resolves the graph.

---

## Per-plugin manifests (verified primitives)

### `@dateline/core` (standard)
```typescript
import { definePlugin } from "emdash";

export default () => definePlugin({
  id: "dateline-core",
  version: "0.1.0",
  capabilities: ["content:read", "content:write", "media:read"],
  // No external network: core is fully self-contained
  hooks: {
    "content:beforeSave": async (event, ctx) => {
      if (event.collection !== "dateline_events") return;
      // Validate timezone, normalize start/end to UTC, validate RRULE
    },
    "content:afterSave": async (event, ctx) => {
      if (event.collection !== "dateline_events") return;
      ctx.waitUntil(invalidateEventCaches(ctx, event.content.id));
    },
    "content:beforeDelete": async (event, ctx) => {
      // Block delete if attendees exist; require explicit cancel flow
    },
  },
  routes: ["admin", "calendar-feed", "ical"],
  storage: { settings: { defaultTimezone: "UTC", currency: "USD", weekStart: 1 } },
  admin: {
    pages: [
      { path: "/dateline", label: "Events", icon: "calendar" },
      { path: "/dateline/venues", label: "Venues", icon: "map-pin" },
      { path: "/dateline/settings", label: "Settings", icon: "cog" },
    ],
  },
});
```

### `@dateline/rsvp` (standard)
```typescript
export default () => definePlugin({
  id: "dateline-rsvp",
  version: "0.1.0",
  capabilities: ["content:read", "content:write", "email:send"],
  hooks: {
    "content:afterSave": async (event, ctx) => {
      if (event.collection !== "dateline_attendees") return;
      // Defer confirmation email past response — critical pattern on Workers
      ctx.waitUntil(sendRsvpConfirmation(ctx, event.content));
    },
  },
  routes: ["admin", "rsvp-submit", "waitlist"],
  storage: { settings: { confirmationFromAddress: "noreply@example.com" } },
  admin: {
    pages: [
      { path: "/dateline-rsvp/attendees", label: "Attendees", icon: "users" },
      { path: "/dateline-rsvp/waitlist", label: "Waitlist", icon: "clock" },
    ],
  },
});
```

### `@dateline/tickets-backend` (standard)
```typescript
export default () => definePlugin({
  id: "dateline-tickets-backend",
  version: "0.1.0",
  capabilities: ["content:read", "content:write", "email:send", "network:request"],
  allowedHosts: ["api.stripe.com", "checkout.stripe.com"],
  hooks: {
    "content:afterSave": async (event, ctx) => {
      if (event.collection !== "dateline_orders") return;
      // Order created; nothing to do (Stripe Checkout completes via webhook)
    },
  },
  routes: [
    "checkout",         // create Stripe Checkout session, return URL
    "webhook-stripe",   // receive Stripe webhook (verifies signature)
    "refund",           // admin-only refund initiation
    "admin",            // Block Kit admin UI
  ],
  storage: {
    settings: {
      stripePublicKey: "",
      stripeSecretKey: "",        // marked as secret in admin UI
      stripeWebhookSecret: "",    // marked as secret
      currency: "USD",
      holdTtlSeconds: 600,
    },
  },
});
```

### `@dateline/virtual` (standard)
```typescript
export default () => definePlugin({
  id: "dateline-virtual",
  version: "0.1.0",
  capabilities: ["content:read", "content:write", "network:request"],
  allowedHosts: ["api.zoom.us", "meet.googleapis.com"],
  hooks: {
    "content:afterSave": async (event, ctx) => {
      if (event.collection !== "dateline_events") return;
      if (event.content.locationType !== "virtual" && event.content.locationType !== "hybrid") return;
      ctx.waitUntil(provisionVirtualMeeting(ctx, event.content));
    },
  },
  routes: ["admin", "join-link"],
  storage: { settings: { provider: "zoom", apiKey: "", apiSecret: "" } },
});
```

### `@dateline/ai` (NATIVE — must be locally registered)
```typescript
export default () => definePlugin({
  id: "dateline-ai",
  version: "0.1.0",
  capabilities: ["content:read", "content:write", "network:request"],
  allowedHosts: [
    "api.anthropic.com",
    "api.openai.com",
    "generativelanguage.googleapis.com",
  ],
  hooks: {},  // Reads/writes via routes from React admin
  routes: ["chat-stream", "tool-call", "history"],
  storage: { settings: { provider: "anthropic", model: "claude-opus-4-7", apiKey: "" } },
  admin: {
    entry: "admin/index.js",            // React entry
    portableTextBlocks: [],              // None for v0.1
    pages: [{ path: "/dateline-ai", label: "AI Chat", icon: "sparkles" }],
  },
});
```

> Native format requires the `@dateline/ai` package to be a workspace dependency in the user's EmDash project, not installed via marketplace. Ships with install instructions and a CLI helper: `npx dateline-ai install`.

---

## Data Model (Portable Text + EmDash Collections)

EmDash content types are **collections**, defined either in the admin UI or via a seed file. Dateline ships seed definitions; users can extend fields through the admin UI.

### Collection: `dateline_events`

```ts
{
  // Standard EmDash fields
  id: string,                            // ulid
  slug: string,                          // unique
  status: "draft" | "scheduled" | "live" | "past" | "cancelled",
  publishedAt: ISO8601 | null,

  // Dateline fields
  title: string,
  shortDescription: string,              // for cards, search snippets
  description: PortableTextBlock[],      // structured rich content

  // Time (always store UTC; display per timezone)
  startsAt: ISO8601,
  endsAt: ISO8601,
  timezone: string,                      // IANA, "America/Los_Angeles"
  allDay: boolean,
  recurrenceRule?: string,               // RFC 5545 RRULE (handled by @dateline/recurring)
  recurrenceExceptions?: ISO8601[],      // EXDATE
  parentSeries?: string,                 // event id for occurrences
  recurrenceId?: ISO8601,                // for series overrides

  // Location
  locationType: "physical" | "virtual" | "hybrid",
  venue?: string,                        // ref → dateline_venues
  virtualProvider?: "zoom" | "meet" | "jitsi" | "custom",
  virtualJoinUrl?: string,               // hidden until ticket validated
  virtualMeetingId?: string,
  virtualAccessCode?: string,

  // People (refs)
  organizers: string[],                  // → dateline_organizers
  speakers?: string[],                   // → dateline_speakers (optional schema)

  // Media
  featuredImage?: string,                // media id
  gallery?: string[],

  // Categorization
  categories: string[],
  tags: string[],

  // Capacity & pricing
  capacity?: number | null,              // null = unlimited
  rsvpRequired: boolean,
  x402Price?: { amount: number, currency: string },  // x402 micropayment gate

  // SEO (delegated to first-party SEO plugin if installed)
  seo?: { title?: string, description?: string, ogImage?: string },

  createdAt: ISO8601,
  updatedAt: ISO8601,
  createdBy: string,                     // user id
}
```

### Collection: `dateline_venues`
```ts
{
  id, slug, name,
  address: { line1, line2?, city, region, postalCode, country },
  geo?: { lat, lng },
  phone?, website?,
  description?: PortableTextBlock[],
  capacity?: number,
  amenities?: string[],
  accessibility?: string[],
  featuredImage?: string,
}
```

### Collection: `dateline_organizers`
```ts
{
  id, slug, name,
  email?, phone?, website?,
  bio?: PortableTextBlock[],
  avatar?: string,                       // media id
}
```

### Collection: `dateline_ticket_tiers` (from `@dateline/tickets-backend`)
```ts
{
  id, event,                             // → dateline_events
  name, description?,
  price: { amount, currency },
  quantity: number,                      // total inventory
  // sold and held are computed from KV inventory, not stored
  saleStart?: ISO8601, saleEnd?: ISO8601,
  minPerOrder: number, maxPerOrder: number,
  hidden: boolean,
  requiresCode?: string,                 // promo code gate
  seatMapSection?: string,               // optional ref into seat map
}
```

### Collection: `dateline_orders`
```ts
{
  id, event,
  status: "pending" | "paid" | "refunded" | "cancelled",
  buyerName, buyerEmail, buyerPhone?,
  items: [{ tierId, qty, unitPrice, seats? }],
  total: { amount, currency },
  paymentRef?: string,                   // Stripe PaymentIntent or x402 tx
  paymentProvider: "stripe" | "x402",
  createdAt, updatedAt,
}
```

### Collection: `dateline_attendees`
```ts
{
  id, event,
  order?: string,                        // for paid; null for free RSVP
  ticketTier?: string,
  status: "confirmed" | "pending" | "cancelled" | "checked_in" | "waitlisted",
  name, email, phone?,
  customFields?: Record<string, unknown>,
  qrToken: string,                       // unique check-in token
  checkedInAt?: ISO8601,
  seat?: { section, row, number },       // when seats add-on used
  createdAt: ISO8601,
}
```

### Collection: `dateline_seat_maps` (from `@dateline/seats`)
```ts
{
  id, venue, name,
  layout: SeatMapLayout,                 // structured grid + objects
  seats: Seat[],                         // section, row, number, tier
}
```

### KV (plugin-scoped, automatic)

Examples — Dateline's KV usage patterns:

| Plugin | Key pattern | Purpose | TTL |
|---|---|---|---|
| `@dateline/core` | `event-cache:{eventId}:{view}` | Pre-rendered fragments | 5 min |
| `@dateline/recurring` | `occurrences:{seriesId}:{rangeHash}` | Materialized occurrences | 1 hr |
| `@dateline/rsvp` | `capacity:{eventId}` | Atomic counter | none |
| `@dateline/rsvp` | `waitlist:{eventId}` | Sorted set (JSON) | none |
| `@dateline/tickets-backend` | `inventory:{tierId}` | Atomic counter | none |
| `@dateline/tickets-backend` | `hold:{cartId}` | Reservation hold | 10 min |
| `@dateline/tickets-backend` | `idempotency:{stripeEventId}` | Webhook dedup | 7 days |
| `@dateline/seats` | `seat-hold:{seatId}` | Per-seat lock | 10 min |
| `@dateline/ai` | `chat:{userId}` | Chat history (capped) | 30 days |

---

## Hooks Used

Dateline subscribes only to canonical EmDash hooks. The 20-hook list is fixed; we use a subset.

### Core (`@dateline/core`)
- `content:beforeSave` — validate event time/timezone, normalize, validate RRULE
- `content:afterSave` — invalidate caches via `ctx.waitUntil`
- `content:beforeDelete` — block if attendees exist

### `@dateline/rsvp`
- `content:afterSave` — fire confirmation email via `ctx.waitUntil`

### `@dateline/tickets-backend`
- `content:afterSave` — fire receipt + ticket email via `ctx.waitUntil`
- (Stripe webhook handled in routes, not hooks)

### `@dateline/virtual`
- `content:afterSave` — provision Zoom/Meet meeting, store join URL/ID/passcode

### Status transitions (scheduled → live → past)
**Locked.** EmDash 0.8.x+ exposes the `cron` hook and `ctx.cron.schedule()` (confirmed in hooks.md). Two paths remain valid:
1. Use `ctx.cron.schedule()` for time-based status transitions and hold-expiry sweeps.
2. Compute status at read time (`status = startsAt > now ? "scheduled" : endsAt < now ? "past" : "live"`) for simpler views that don't need indexed status.

**Recommend:** Path 2 for rendering; use `cron` hook for hold-expiry sweeps and scheduled batch operations (e.g. promoting waitlist entries when a tier opens). Source: `research/synthesis/emdash-platform-research.md` Q3.

---

## Routes

All plugin routes auto-mount at `/_emdash/api/plugins/<plugin-id>/<route>`.

### `@dateline/core`
- `GET .../calendar-feed?range=...` — JSON list view (cached at edge)
- `GET .../ical?...` — full calendar iCal feed
- `POST .../admin/...` — Block Kit admin pages (returns `BlockResponse`)

### `@dateline/rsvp`
- `POST .../rsvp-submit` — public RSVP form submission (rate-limited per IP via KV)
- `POST .../waitlist` — join waitlist when capacity full
- `POST .../admin/...` — Block Kit admin

### `@dateline/tickets-backend`
- `POST .../checkout` — create Stripe Checkout session, return URL
- `POST .../webhook-stripe` — Stripe webhook receiver (verifies signature; uses idempotency KV)
- `POST .../refund` — admin-authenticated refund (capability check on session)
- `POST .../admin/...` — Block Kit admin

### `@dateline/checkin` (native)
- React PWA app served from native admin entry; calls REST routes for scan/lookup/mark

### `@dateline/ai` (native)
- `POST .../chat-stream` — proxies to declared LLM provider (server-sent events)
- `POST .../tool-call` — executes a Dateline operation after user confirmation
- `GET .../history` — returns chat history for current user

---

## Frontend Integration (`@dateline/views`)

Frontend rendering does NOT happen in plugin sandboxes. EmDash themes are Astro projects. `@dateline/views` ships as a peer-dependency npm package providing Astro components and helpers.

```astro
---
import { getEmDashCollection } from "emdash";
import { CalendarMonth, EventCard } from "@dateline/views";

const { entries: events } = await getEmDashCollection("dateline_events", {
  filter: { startsAt: { gte: new Date() } },
  sort: { startsAt: "asc" },
  limit: 50,
});
---

<CalendarMonth events={events} />

{events.map(e => <EventCard event={e} />)}
```

Components shipped:
- `<CalendarMonth>`, `<CalendarWeek>`, `<CalendarDay>`, `<CalendarList>`, `<CalendarAgenda>`
- `<EventCard>`, `<EventDetail>`, `<EventHero>`
- `<RsvpForm>` (when `@dateline/rsvp` installed)
- `<TicketSelector>`, `<SeatPicker>` (when relevant add-ons installed)
- `<VenueMap>`, `<OrganizerCard>`

All components use Tailwind by default but expose unstyled "headless" variants for theme customization.

### Live Collections

Per the EmDash docs site, content can also be wired through Astro live collections:

```ts
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  events: defineLiveCollection({
    loader: emdashLoader({ collection: "dateline_events" }),
  }),
};
```

This gives editors content-preview behavior matching EmDash's first-class workflow.

---

## Critical Technical Designs

### Time & Timezone

- Always store UTC. Display in viewer's TZ by default with one-click "show in event time."
- Recurring rules respect IANA database; DST-aware.
- Past events preserve their original computed times even if zone rules later update.
- All datetime fields validated server-side in `content:beforeSave`.

### Recurring Events

- RFC 5545 RRULE stored as a string on the parent event.
- EXDATE for exceptions.
- Lazy materialization: compute occurrences on read with a max-window cap (default 2 years forward) and cache to KV (TTL 1 hr).
- Single occurrence override creates a child event with `parentSeries` and `recurrenceId` set.
- Bulk operations: "edit this and all future" splits the series at the edit point.

### Inventory & Holds (race-safe)

The hardest correctness problem in ticketing. Pattern adapted to EmDash's KV + Workers model:

```
1. User submits cart → POST /checkout
2. Backend (sandboxed):
   a. For each line, atomically decrement KV `inventory:{tierId}` by qty
      (if would go negative → reject, restore decrements made so far)
   b. Write KV `hold:{cartId}` = { items, expiresAt: now+10min, ttl: 600s }
   c. Create Stripe Checkout session
   d. Return checkout URL
3. User completes payment in Stripe Checkout
4. Stripe webhook → POST /webhook-stripe:
   a. Verify signature (HMAC; fast)
   b. Check KV `idempotency:{stripeEventId}` — if exists, return 200 immediately (re-delivery safety)
   c. Set idempotency key (TTL 7 days)
   d. ctx.waitUntil(promote-hold-to-attendees(...))   ← critical: don't block 200 response
   e. Return 200
5. waitUntil work:
   a. Read hold from KV
   b. Create dateline_orders entry
   c. Create dateline_attendees per ticket
   d. Send confirmation email + tickets via ctx.email.send
   e. Delete hold
6. On hold expiry (no webhook within 10 min):
   - Hold's TTL expires automatically
   - Dedicated cron OR opportunistic check on next purchase to that tier:
     verify hold absent, restore inventory if not yet promoted
```

This pattern matches [Stripe's recommended inventory practice](https://stackoverflow.com/questions/65779944/stripe-paymentintent-best-practice-for-ensuring-inventory) and avoids the [duplicate-webhook race](https://dev.to/belazy/the-race-condition-youre-probably-shipping-right-now-with-stripe-webhooks-mj4).

**Subrequest budget:** Stripe webhook handler has 10 subrequests. We use ~1 for signature verify, ~3 for KV read/write, ~1 for content create, ~2 for email. Stays under budget. If sites need richer webhook processing, ship the heavy work as a deferred queue job — not yet supported in plugin runtime; **open question** for v0.2 (does EmDash expose Cloudflare Queues to plugins?).

### Seat picker concurrency

`@dateline/seats` adds a per-seat hold pattern:

- Frontend picker: user clicks seat → POST `/seats/hold` → server writes `seat-hold:{seatId} = { cartId, expiresAt }` with 10-min TTL only if no existing hold; returns 409 if held.
- Polling/SSE: picker subscribes to `/seats/state?map={mapId}` to learn other users' holds in near-real-time. (SSE if EmDash supports it; otherwise short-poll every 5s.)
- On checkout completion: holds promote to seat assignments on the attendee record.

### Schema.org JSON-LD

Generated server-side on event detail pages from structured event data:
- `Event` with subtypes (`MusicEvent`, `TheaterEvent`, `EducationEvent`, etc., user-selectable)
- `Place` for venue
- `Person` / `Organization` for organizers/speakers
- `Offer` for ticket tiers
- `eventStatus`, `eventAttendanceMode`, `previousStartDate` for postponed events
- `Performer` for speakers

Critical for Google Events listings + AI-agent ingestion.

### x402 micropayment integration

EmDash core handles x402. Dateline contributes:
- Optional `x402Price` field on `dateline_events` and `dateline_ticket_tiers`
- When set, frontend `<EventDetail>` component is rendered behind core's x402 gate (configured in user's EmDash settings, not in Dateline)
- Use case: AI-agent-purchasable conference recordings, micropayment livestream access, pay-per-ticket-listing for AI scraping

This is the genuinely net-new EmDash advantage — no WordPress events plugin can offer it.

### Performance targets

EmDash's structured-content layer + Cloudflare edge caching means:
- Calendar list view: <10 D1 queries cold, <100ms response
- Event detail: <5 queries, <50ms cold, <10ms warm
- iCal feed: pre-generated, edge-cached 5 min

Roughly **10x better than TEC's 85+ queries per list view**.

---

## AI Layer (`@dateline/ai`)

Native plugin. Three surfaces, all routing through the same operations.

### Surface 1: Operations as MCP tools (TBD exact API)

EmDash's MCP server already exposes `ctx.content.*` operations on Dateline collections. To add Dateline-specific verbs (`tickets.refund`, `events.move`, `seats.release`), we need to confirm the EmDash plugin API for registering custom MCP tools. **Open question for finalization.**

Interim approach if no native API exists in 0.6.x: ship REST routes under `@dateline/ai` and a thin standalone MCP wrapper (`npm i -g @dateline/mcp`) that the user installs into their MCP client. Less elegant but ships now.

Tools to expose (stable list):

```
events.list(filter?)
events.get(idOrSlug)
events.create(eventDraft)
events.update(id, patch)
events.move(id, newDateTime, options?)
events.duplicate(id, newDate, count?)
events.cancel(id, options?)

rsvp.list(eventId)
rsvp.create(eventId, attendee)
rsvp.cancel(attendeeId)
rsvp.promote_from_waitlist(eventId, count?)

tickets.tiers.list(eventId)
tickets.tiers.create(eventId, tierDraft)
tickets.tiers.update(tierId, patch)
tickets.86(tierId)                  // mark sold-out manually
tickets.orders.list(eventId, filter?)
tickets.refund(orderId, options?)

seats.map.get(eventId)
seats.holds.release(seatId)

checkin.lookup(qrTokenOrEmail)
checkin.mark(attendeeId)
checkin.stats(eventId)

venues.list()
venues.create(venue)
venues.update(id, patch)
```

Each tool ships with JSON Schema, examples, and natural-language descriptions.

### Surface 2: In-admin AI chat panel (native React)

A persistent panel inside the EmDash admin (when `@dateline/ai` installed):
- BYO API key per workspace (Anthropic, OpenAI, Gemini)
- Calls go through `network:request` allowlist to declared LLM hostnames
- Chat history in plugin KV scoped per user, retention-capped (default 30 days)
- All write actions show diff preview + confirm UI before execution
- Per-tool "auto-approve" flag for trusted users

**Example transcript:**

> User: shift the conference from oct 12 to oct 19. keep all sessions and speakers. email everyone with rsvp=yes.
>
> Dateline AI: Two changes ready:
> - Move event "AnnualConf 2026" → Oct 19
> - Shift 12 sessions by 7 days
> - Notify 47 attendees with RSVP=yes
>
> [Confirm all] [Cancel]

> User: we sold out VIP. promote top 5 from waitlist.
>
> Dateline AI: 5 attendees will be promoted. Preview:
> - alice@example.com (joined 4/12)
> - bob@example.com (joined 4/13)
> - ...
>
> [Confirm] [Cancel]

> User: create 8 weekly yoga classes starting next monday at 7pm, 90 min each, capacity 20.
>
> Dateline AI: 8-event series ready. Diff preview:
> [Confirm] [Cancel]

### Surface 3: Inline AI actions

Per-field "✨ AI" buttons in the event editor:
- Description: "Generate from title and category"
- Image alt text: auto-generated
- SEO meta: auto-suggest from event content
- Translate (when EmDash i18n active): one-click
- Email template: "Write a polite cancellation email"

### Trust model (non-negotiable)

- **Read-by-default, write-on-confirm**
- **Diff preview before any update**
- **Audit log of every AI action** (uses EmDash's first-party audit log if installed; standalone if not)
- **Reversible writes** — every destructive action returns an undo token (10-min validity)
- **PII protection** — attendee names/emails never sent to LLM unless user explicitly confirms
- **Rate & spend caps** per workspace

---

## External Dependencies

| Plugin | External services | `allowedHosts` |
|---|---|---|
| `@dateline/core` | none | (none) |
| `@dateline/rsvp` | core mail pipeline only | (none — uses `email:send`) |
| `@dateline/recurring` | none | (none) |
| `@dateline/importer` | iCal source URLs | user-configured (caution: `network:request:unrestricted` candidate) |
| `@dateline/tickets-backend` | Stripe | `api.stripe.com`, `checkout.stripe.com` |
| `@dateline/virtual` | Zoom / Meet / Jitsi | per-provider |
| `@dateline/ai` | LLM provider | `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com` |

x402 facilitator hostnames are configured in EmDash core, not in Dateline plugin manifests.

---

## Security Considerations

What Dateline plugins cannot do, by EmDash design:

- No filesystem access
- No raw SQL
- No reaching arbitrary network hosts (only `allowedHosts`)
- No reading other plugins' KV
- No executing system commands
- No injecting arbitrary HTML/JS into admin (Block Kit JSON only, for sandboxed)
- No bypassing admin auth (capability check on session)

Plugin-to-plugin isolation: a vulnerability in `@dateline/virtual` (talks to Zoom) cannot exfiltrate Stripe data from `@dateline/tickets-backend`. Distinct V8 isolates with distinct capability bindings.

**Native-format plugins** (`@dateline/ai`, `@dateline/seats`, `@dateline/checkin`, `@dateline/tickets-admin`) are NOT sandboxed. They're trusted code. Users install them with explicit trust grant. We document this clearly at install time.

**On Cloudflare Free plan,** Dynamic Workers (the sandbox layer) is unavailable. Standard-format plugins run as trusted there too. Dateline marketing must accurately reflect this.

---

## Content Model Impact

- Event content uses Portable Text for descriptions (same as core EmDash content)
- Custom Portable Text blocks shipped (require native format):
  - `dateline:speaker-card`
  - `dateline:schedule-block`
  - `dateline:ticket-cta`
  - `dateline:seat-picker`
- These register via `admin.portableTextBlocks` in native plugin manifests
- Existing EmDash FTS5 search indexes event title, short description, venue, organizer
- i18n: events translate per EmDash's built-in i18n. Recurring events translate at series level

---

## Competitive Analysis

| Plugin | Installs / Sales | Strengths | Weaknesses (vs Dateline) |
|---|---|---|---|
| **The Events Calendar** | 800K+ active | Mature, vast docs, large dev community | 85+ queries/list view; no AI; ticketing as separate plugins |
| **EventON** | Codecanyon #1 | Best UX, modular, beautiful | No isolation between add-ons; AI only in FAQ generation |
| **Eventin Pro** | Growing rapidly | Modern UX, AI for event creation | Younger, fewer integrations; AI = creation only |
| **Modern Events Calendar** | 500K+ active | Visual variety, custom views | Heavy frontend assets; complex license tiers |
| **Sugar Calendar** | 70K+ | Simple, fast, lightweight | Limited; no ticketing in free tier |

**Dateline's positioning:** *"The Events Calendar's depth, EventON's modularity, with native AI workflow and Cloudflare-edge speed."*

Out of scope:
- Tessitura/Spektrix (enterprise box office)
- Eventbrite alternative (we power user sites; don't host events)
- Festival platform (>10K attendees)

---

## Roadmap

### v0.1 — Public preview (MVP, 8 weeks)
- `@dateline/core` — events, venues, organizers, Block Kit admin, iCal, schema.org, x402 config
- `@dateline/rsvp` — free RSVPs with capacity
- `@dateline/recurring` — RRULE basics
- `@dateline/importer` — TEC migrator + iCal/CSV import
- `@dateline/views` (native) — month/list/day Astro components
- One reference theme integration

### v0.2 — Ticketing (8 weeks after v0.1)
- `@dateline/tickets-backend` (sandboxed) + `@dateline/tickets-admin` (native)
- Stripe Checkout, refunds, idempotent webhook handling
- Recurring rule UX polish, exceptions, "edit this and all future"

### v0.3 — Theater-grade (8 weeks after v0.2)
- `@dateline/seats` (native) — visual seat-map designer + frontend picker
- `@dateline/pricing` — promo codes, dynamic pricing
- `@dateline/checkin` (native) — door-staff PWA

### v0.4 — Hybrid & AI (8 weeks after v0.3)
- `@dateline/virtual` — Zoom, Meet, Jitsi
- `@dateline/ai` (native) — chat panel + MCP tool registration

### v1.0 — Stable (3 months after v0.4)
- Performance benchmarks, security audit, full docs site, ecosystem launch

---

## Success Metrics

**Adoption (12 months post-v1.0):**
- 5,000 EmDash sites with `@dateline/core` installed
- 500 paying customers across commercial add-ons
- $250K ARR

**Performance:**
- Calendar list view: <10 D1 queries, <100ms cold response
- 50 concurrent ticket purchases without inventory race conditions
- Edge cache hit rate >85% on event detail pages
- All sandboxed handlers complete within EmDash's 50ms CPU / 10 subrequest limits

**Quality:**
- <5 confirmed P1 bugs at any time
- <24h response on GitHub issues
- 4.5+ avg rating in EmDash plugin marketplace

**AI:**
- 30% of admin actions on installs with `@dateline/ai` come through chat panel within 6 months
- All Dateline operations exposed via MCP (or REST + standalone wrapper if MCP-tool registration unavailable)

---

## Decisions Locked (2026-05-02)

All answers sourced from `research/synthesis/emdash-platform-research.md`. Each locks a prior open question.

1. **Capability naming (Q1).** `content:read` (resource:verb) is canonical. emdash@0.9.0 PR #816 unified naming; `emdash plugin publish` rejects old forms. All Dateline manifests must ship with resource:verb naming.
2. **Custom MCP tool registration (Q2).** Does NOT exist. Issue #41 is open and unassigned — no upstream ETA. **Interim:** REST routes + standalone `@dateline/mcp` wrapper. Monitor issue #41; migrate if upstream ships before v1.0.
3. **Cron scheduling (Q3).** CONFIRMED. `cron` hook + `ctx.cron.schedule()` available since 0.6.0, documented in hooks.md. Use for hold-expiry sweeps and time-based status transitions.
4. **Cloudflare Queues (Q4).** No `ctx.queue` binding exists. Plugins cannot enqueue to Worker queues. For >50ms work: use `ctx.waitUntil` (within same invocation), or call a separate Worker via `ctx.http.fetch()`. **Document this in every webhook handler.**
5. **Free tier messaging (Q5).** Dynamic Workers require paid Cloudflare plan. On Free, plugins run as trusted (in-process). Document in: install dialog, marketplace listing, README, and marketing. Source: Issue #149.
6. **Native plugin distribution (Q6).** Confirmed: npm + `astro.config.mjs` registration. No official CLI installer pattern exists in EmDash; `npx dateline-<name> install` is a convention we can adopt but is not upstream-supported.
7. **Tickets backend/admin split (Q7).** Decision stands: split with bundled price. Backend (sandboxed) is the SKU; admin (native React) ships as a workspace dependency.
8. **Pricing tiers (Q8).** No research update — retain $399/yr suite / $999 lifetime / EventON-import discount.
9. **Recurring event materialization (Q9).** Lazy compute with KV cache (TTL 1hr) stays. 2-year forward cap confirmed correct.
10. **`network:request:unrestricted` for importer (Q10).** Recommendation stays: whitelist user-configured iCal sources. Only escalate to unrestricted if friction data says so.
11. **GDPR / right-to-erasure (Q11).** No core privacy hooks exist in EmDash. Dateline MUST build its own GDPR primitives using `content:beforeDelete` / `content:afterDelete`. Plugin-owned; no upstream feature to wait on.
12. **Plugin name (Q12).** "Dateline" — no conflicts found. Locked.

---

## Definition of Done (v1.0)

- All planned plugins shipping (sandboxed via marketplace, native via npm + CLI)
- Migration importer takes a TEC site to Dateline with >95% data fidelity
- AI chat panel handles all common event operations end-to-end
- Public docs site at `dateline.dev` with quickstart, recipe library, MCP tool reference
- Showcase: 3+ production sites running Dateline (your two clients + one community case study)
- All sandboxed handlers verified within 50ms CPU / 10 subrequest limits
- All `ctx.waitUntil` / `after()` patterns documented and enforced via lint rule
