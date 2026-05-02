# UX Pattern Library

Generated from Phase 2 research (`04-admin-ux.md` + `05-frontend-ux.md`) across 14 WordPress event plugins.

**Analyst intent:** This document records UI patterns worth borrowing or improving. Each entry describes the pattern as observed, its interaction model, and how it maps to Dateline's Block Kit + Cloudflare Workers architecture. No PHP — pseudo-code only.

---

## Table of Contents

1. [Calendar Grid Views](#1-calendar-grid-views)
2. [List / Agenda View](#2-list--agenda-view)
3. [Single Event Hero](#3-single-event-hero)
4. [Event Card (Compact / Expandable)](#4-event-card-compact--expandable)
5. [Ticket Selection Flow](#5-ticket-selection-flow)
6. [RSVP Form](#6-rsvp-form)
7. [Seat Map Interaction](#7-seat-map-interaction)
8. [Admin Event Editor](#8-admin-event-editor)
9. [Admin List Tables](#9-admin-list-tables)
10. [Frontend Dashboard / SPA](#10-frontend-dashboard--spa)
11. [Search & Filter Bar](#11-search--filter-bar)
12. [Map & Geolocation Views](#12-map--geolocation-views)
13. [Schedule / Timeline Display](#13-schedule--timeline-display)
14. [Check-In & QR Scanner](#14-check-in--qr-scanner)
15. [Countdown Timer](#15-countdown-timer)
16. [Slider / Carousel](#16-slider--carousel)
17. [Wishlist / Saved Events](#17-wishlist--saved-events)
18. [Import / Bulk Upload](#18-import--bulk-upload)
19. [Virtual Event Embed](#19-virtual-event-embed)
20. [Settings Framework](#20-settings-framework)

---

## 1. Calendar Grid Views

### Observed In
- **EventON** — accordion month (EventTop tiles below date rows)
- **EventON Full Cal add-on** — traditional month grid (Mon–Sun columns, day cells)
- **EventON Weekly View add-on** — week strip (7 day-cards)
- **TEC/ECP** — month grid, week grid (hourly rows), day view
- **Eventin Pro** — FullCalendar-style month grid

### Pattern Anatomy

#### Month Grid (classic)
```
        April 2026
   [prev] [month/year ▾] [next]
  Sun  Mon  Tue  Wed  Thu  Fri  Sat
  29    1    2    3    4    5    6          ← week row
  [●]  [●]                      [●]         ← day cells with event dots
  ...
```

- **Header**: month/year label (clickable date-jump popover), prev/next arrows, "Today" button
- **Grid**: 7 columns × 6 rows (fixed cell count regardless of month length)
- **Day cell**:
  - Day number (top-left, subdued for out-of-month days)
  - Up to N event tiles (default 3) or colored dots (dense mode)
  - Multi-day events span horizontally with continuous bar
  - "+N more" overflow link
- **Navigation**: prev/next month AJAX (EventON) or page-load (TEC); date jumper dropdown

#### Week Grid (hourly)
```
        Week of April 27 – May 3
  [prev] [week range ▾] [next]

       Mon 27   Tue 28   Wed 29   ...
  8am  [conf───]         [ws]
  9am                [meet]
 10am  ...
```

- **Header**: week-range label with week-picker dropdown (EventON: ~101 ranges centered on current week)
- **Body**: 7 vertical day lanes, hourly horizontal grid lines
- **Event block**: positioned by start time, height proportional to duration, colored by category
- **All-day strip**: separate horizontal bar across the top

### Interaction Model

| Action | EventON | TEC/ECP | Eventin |
|---|---|---|---|
| Click day cell | Expands event list below grid | Navigates to Day view | Opens popup list |
| Click event tile | Expands EventCard inline | Navigates to single event | Navigates to single event |
| Prev/next | AJAX re-render | Page reload / AJAX | Page reload |
| Date jumper | Dropdown with ~100 week/month options | Popover calendar picker | Month dropdown |
| Today | Scrolls/hops to current period | Scrolls to current period | Scrolls to current period |

### Key Design Decisions

1. **Server-rendered HTML vs JSON-to-DOM**: EventON sends full HTML on every nav action (~30–40 KB for 20 events); TEC uses partial templates. Dateline should prefer JSON + client-side hydration for sub-200ms nav, falling back to server-rendered for no-JS environments.
2. **Multi-day spanning**: TEC renders a continuous bar; EventON Full Cal uses dots per day. The bar is more readable but complicates click targets. Dateline: render a "ghost" bar in the background with click-to-edit on the start cell.
3. **Occurrence display**: Recurring events can show "Recurring" badge (TEC) or dot-per-occurrence (EventON). Dateline: badge on tile, series expansion on click.
4. **Out-of-month days**: greyed-out cells (TEC) vs empty (Eventin). Greyed maintains visual grid integrity.

### Dateline Block Kit Sketch

```typescript
// Month grid block
const monthGrid = blocks.section(
  { label: 'April 2026' },
  [
    blocks.actionRow([
      blocks.button('prev_month', { label: '◀' }),
      blocks.button('month_jumper', { label: 'April 2026 ▾' }),
      blocks.button('next_month', { label: '▶' }),
      blocks.button('today', { label: 'Today' }),
    ]),
    blocks.calendarGrid({
      columns: 7,
      rows: 6,
      cells: generateCells({
        today: '2026-04-30',
        events: eventOccurrences,
        maxTilesPerCell: 3,
        showOverflow: true,
      }),
      multiDayStyle: 'bar', // 'bar' | 'dot'
      outOfMonthStyle: 'muted',
    }),
  ]
);
```

---

## 2. List / Agenda View

### Observed In
- **TEC/ECP** — vertical stack, date-strip left rail, featured image
- **EventON** — compact event list without calendar header
- **Eventin Pro** — infinite-scroll list with category filter

### Pattern Anatomy

```
   ┌──────────────────────────────────────────┐
   │ [Today]  Upcoming ▾  [List ▾]            │
   ┌──────────────────────────────────────────┐
   │ APR 30                                   │  ← date heading
   │ ┌────┬─────────────────────────────────┐ │
   │ │Apr │ Tech Talk: API Architecture      │ │
   │ │30  │ 8:00 AM – 9:30 AM | Online       │ │
   │ └────┴─────────────────────────────────┘ │
   │ MAY 1                                    │
   │ ┌────┬─────────────────────────────────┐ │
   │ │May │ Community Garden Party           │ │
   │ │ 1  │ 10:00 AM – 2:00 PM | Park        │ │
   │ └────┴─────────────────────────────────┘ │
   └──────────────────────────────────────────┘
   < Previous Events     Next Events >
```

- **Header**: "Today" reset button, date-range label, view-switcher dropdown
- **Date rail** (left): month abbrev + day number for the first event of each date
- **Event card**: featured image thumbnail, title, date/time line, venue line, cost chip, excerpt
- **Badges**: Featured (star), Recurring (icon), Virtual (camera), Cancelled (strikethrough + translucent)
- **Pagination**: prev/next links or infinite scroll

### Dense Variant (Summary View — TEC)

```
   Tuesday, May 12 2026
   8:00 AM  |  Yoga Workshop          | Studio A   | $25
   1:00 PM  |  Panel: Future of AI    | Main Hall  | Free
   4:00 PM  |  Meetup: Rust Lang      | Cafe       | $5
```

Single-line rows; hover expands for description. Suited for high-density event calendars (conferences, venues).

### Dateline Block Kit Sketch

```typescript
const eventList = blocks.section(
  { label: 'Upcoming Events' },
  [
    ...groupByDate(events).flatMap(({ date, events }) => [
      blocks.divider({ title: formatDate(date, 'MMMM d') }),
      ...events.map(event =>
        blocks.eventRow({
          id: event.id,
          title: event.title,
          timeRange: formatTimeRange(event),
          venue: event.location?.name,
          cost: event.price ? formatCents(event.price) : undefined,
          image: event.featuredImage?.small,
          badges: deriveBadges(event),
          onClick: () => navigateToEvent(event.id),
        })
      ),
    ]),
    blocks.actionRow([
      blocks.button('prev_page', { label: '< Previous' }),
      blocks.button('next_page', { label: 'Next >' }),
    ]),
  ]
);
```

---

## 3. Single Event Hero

### Observed In
- **Eventin Pro** — 3 layout variants (hero image, split-screen, full-width banner)
- **TEC/ECP** — featured image + title + status pill + schedule strip
- **EventON** — EventTop pill + EventCard boxes (same as calendar slide-down)

### Pattern Anatomy — Eventin Layout 1 (Default)

```
  ┌────────────────────────────────────────────┐
  │ [Full-width hero image]                    │
  ├────────────────────────────────────────────┤
  │ Home > Events > Tech Talk                  │
  │                                            │
  │ API Architecture Roundtable                │
  │                                            │
  │ 📅 Apr 30, 8:00 AM | 🏷️ Tech | 📍 Online  │
  │                                            │
  │ [Ticket Form / RSVP Form]                  │
  │                                            │
  │ Description...                             │
  │                                            │
  │ Schedule | Speakers | FAQ | Organizer      │
  │                                            │
  │ Social: [FB] [X] [LI] [Email]             │
  │ Tags: #api #architecture                   │
  └────────────────────────────────────────────┘
```

### Pattern Anatomy — Eventin Layout 2 (Split-Screen)

```
  ┌────────────────────┬───────────────────────┐
  │                    │                       │
  │ [Hero image left]  │  Event Title          │
  │                    │  Countdown Timer      │
  │                    │  Date/Time/Location   │
  │                    │  [Ticket Form]        │
  │                    │                       │
  └────────────────────┴───────────────────────┘
```

### TEC Single Event Sections (top-to-bottom)

1. **Title bar**: `h1` + status pill (Cancelled / Postponed / Moved Online)
2. **Schedule strip**: start–end datetime, timezone, all-day indicator
3. **Featured image**: full-width hero
4. **Body content**: event description
5. **Virtual event panel**: embedded iframe or "Join" button (gated)
6. **Details metabox**: Date, Time, Cost, Website, Categories, Tags
7. **Venue card**: name, address, phone, map embed, directions link
8. **Organizer card(s)**: name, contact info
9. **Series card**: "Part of a series" + next 3 occurrences
10. **Related events**: 3-up grid (same category)
11. **Export bar**: Add to Calendar (Google, iCal, Outlook) + Social share
12. **Comments**: optional

### Dateline Block Kit Sketch

```typescript
const singleEvent = blocks.section(
  { label: event.title },
  [
    blocks.image({ src: event.featuredImage?.url, size: 'full' }),
    blocks.breadcrumb({ items: ['Events', event.category, event.title] }),
    blocks.heading({ text: event.title, level: 1 }),
    event.status !== 'published' && blocks.badge({
      label: event.status.toUpperCase(),
      variant: event.status === 'cancelled' ? 'error' : 'warning',
    }),
    blocks.keyValueRow([
      { icon: 'calendar', value: formatDateTimeRange(event) },
      { icon: 'tag', value: event.categories.map(c => c.name).join(', ') },
      { icon: 'location', value: event.location?.name },
    ]),
    event.hasTickets && blocks.ticketForm({ eventId: event.id }),
    event.hasRsvp && blocks.rsvpForm({ eventId: event.id }),
    blocks.markdown(event.description),
    blocks.venueCard({
      name: event.location?.name,
      address: formatAddress(event.location?.address),
      mapEmbed: event.location?.showMap,
      directionsUrl: googleDirectionsUrl(event.location),
    }),
    blocks.organizerCards(event.organizers),
    blocks.relatedEvents({ eventId: event.id, limit: 3 }),
    blocks.actionRow([
      blocks.button('export_ical', { label: 'Add to Calendar ▾' }),
      ...socialPlatforms.map(p => blocks.button(`share_${p}`, { icon: p })),
    ]),
  ]
);
```

---

## 4. Event Card (Compact / Expandable)

### Observed In
- **EventON** — EventTop (compact title bar) + EventCard (slide-down detail)
- **TEC/ECP** — list-view card, month-grid tile
- **Eventin Pro** — calendar popup card

### EventTop (Compact Mode)

```
  ┌────────────────────────────────────────────────┐
  │ [color bar]  Apr 30 | 8:00 AM   API Arch Talk  │
  └────────────────────────────────────────────────┘
```

- **Color bar**: category color or per-event color (EventON's signature look)
- **Date/time**: formatted per locale
- **Title**: truncated to fit
- **Optional pills**: "Cancelled" overlay, "Live Now" blinking badge, "Recurring" icon

### EventCard (Expanded Mode — EventON)

```
  ┌──────────────────────────────────────────────────┐
  │ Apr 30, 2026  |  Category: Tech                  │
  ├──────────────────────────────────────────────────┤
  │ API Architecture Roundtable                      │
  │ ┌──────────────────────────────────────────────┐ │
  │ │ Event Details                                │ │
  │ │ Description text...                          │ │
  │ └──────────────────────────────────────────────┘ │
  │ ┌──────────────────────────────────────────────┐ │
  │ │ Time       8:00 AM – 9:30 AM, PDT            │ │
  │ │ Location   Online                            │ │
  │ │ Organizer  Alex Chen                         │ │
  │ └──────────────────────────────────────────────┘ │
  │ ┌──────────────────────────────────────────────┐ │
  │ │ Add to Calendar  [Google] [iCal] [Outlook]   │ │
  │ └──────────────────────────────────────────────┘ │
  │ ┌──────────────────────────────────────────────┐ │
  │ │ [RSVP]  [Tickets]  [Share]                   │ │
  │ └──────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────┘
```

- **Configurable boxes**: Event Details, Time, Location, Organizer, Map, Tickets, RSVP, Add to Calendar, Social Share, Tags, Wishlist, Repeat Series
- **Box order**: global default + per-event override via Event Options metabox
- **Layout variants**: grid-2, grid-3, single-column (responsive)

### Interaction: Slide-Down (EventON)

1. User clicks EventTop tile in calendar
2. Card slides down inline (jQuery `slideToggle`)
3. All other expanded cards collapse (accordion behavior, one open at a time)
4. Click elsewhere or click same tile to close
5. "View Details" link navigates to single-event page

### Dateline Block Kit Sketch

```typescript
const eventTop = blocks.actionRow({
  blocks.sectionText({
    accessory: blocks.colorBar(event.color || event.categoryColor),
    text: `${formatShortDate(event)} | ${formatShortTime(event)} ${event.title}`,
  }),
  onClick: () => expandEventCard(event.id),
});

const eventCard = blocks.section(
  { label: event.title },
  [
    ...event.boxes.map(box =>
      blocks.eventCardBox({
        title: box.title,
        content: box.render(event),
      })
    ),
    blocks.actionRow([
      blocks.button('view_details', { label: 'View Details' }),
      blocks.button('rsvp', { label: 'RSVP' }),
      blocks.button('tickets', { label: 'Get Tickets' }),
    ]),
  ]
);
```

---


## 5. Ticket Selection Flow

### Observed In
- **Eventin Pro** — native tier selection + WooCommerce checkout
- **EventON Tickets add-on** — WC product-linked with name-your-price + variations
- **EventON Variations add-on** — cartesian matrix of type axes
- **EventON Seats add-on** — interactive canvas seat picker

### Basic Tier Selection (Eventin)

```
  ┌──────────────────────────────────────┐
  │ General Admission    $25.00   [- 0 +]│
  │ VIP                  $75.00   [- 0 +]│
  │                                      │
  │                      [Add to Cart]   │
  └──────────────────────────────────────┘
```

- **Steppers**: quantity per tier, validated against inventory
- **Sold-out state**: label replaces stepper, disabled
- **Min/max per order**: enforced client-side and server-side

### Variation Matrix (EventON Variations)

```
  Section:  [Front ▾] [Back ▾]
  Size:     [Regular ▾] [Large ▾]

  Variation                      Price    Qty
  ┌──────────────────────────────────────────┐
  │ Front + Regular              $50.00   - 0 +│
  │ Front + Large                $55.00   - 0 +│
  │ Back + Regular               $40.00   - 0 +│
  │ Back + Large                 $45.00   - 0 +│
  └──────────────────────────────────────────┘
```

- Admin pre-creates each variation row explicitly (not auto-generated from type axes)
- "All" wildcard: a row can match ANY value of an axis (e.g., "Any Size + Front")
- Real-time client-side price calculation on selection change

### Seat Map Picker (EventON Seats)

```
      Stage
  ┌────────────────────────────────┐
  │ [A1] [A2] [A3] [A4] [A5]      │
  │ [B1] [B2] [B3] [B4] [B5] [B6] │
  │ GA Area (unassigned)            │
  │ [Select GA]                     │
  └────────────────────────────────┘
  Legend: ● Available ○ In Cart ◼ Sold  ♿ Accessible
```

- **Canvas rendering**: seats as divs or SVG shapes, positioned absolutely
- **Pan/zoom**: touch-drag and pinch-zoom (via panzoom.js)
- **Seat states**: available, in-cart (hold), sold, selected (my selection)
- **Seat types**: assigned seat, unassigned area (count-based), booth, area-of-interest
- **Hold mechanism**: seat held in cart for 600s; timer resets on each add
- **One-click add-to-cart**: click seat → auto-adds to WC cart

### Attendee Details (Eventin + EventON)

After ticket selection:
1. Per-ticket attendee form (name, email, phone + custom fields)
2. Multi-ticket orders: one form set per quantity
3. Submits to create `Attendee` content records

### Free Events
- If all tiers have `price: 0`, skip payment
- Attendee created immediately on form submit (Eventin)

### Dateline Block Kit Sketch

```typescript
// Basic tier selection
const ticketForm = blocks.section(
  { label: 'Tickets' },
  [
    ...event.ticketTiers.map(tier =>
      blocks.stepperRow({
        label: tier.name,
        price: formatCents(tier.price),
        value: cart.getQuantity(tier.id),
        min: 0,
        max: Math.min(tier.remaining, tier.maxPerOrder || 10),
        disabled: tier.stockStatus === 'sold_out',
        onChange: (qty) => updateCart(tier.id, qty),
      })
    ),
    blocks.divider(),
    blocks.keyValue({ label: 'Total', value: formatCents(cart.total) }),
    blocks.button('checkout', {
      label: cart.total === 0 ? 'Reserve' : 'Checkout',
      style: 'primary',
      disabled: cart.totalItems === 0,
    }),
  ]
);

// Seat map (canvas-based — pure component, not Block Kit)
function SeatMapCanvas({
  sections,
  selectedSeats,
  onSeatClick,
  onPanZoom,
}: SeatMapProps) {
  return (
    <Canvas>
      {sections.map(section =>
        section.rows.map(row =>
          row.seats.map(seat => (
            <Seat
              key={seat.id}
              status={deriveSeatStatus(seat, selectedSeats)}
              onClick={() => onSeatClick(seat)}
              accessible={seat.isAccessible}
            />
          ))
        )
      )}
      <Legend items={SEAT_LEGEND} />
    </Canvas>
  );
}
```

---


## 6. RSVP Form

### Observed In
- **Eventin Pro** — simple (Going / Not Going) + advanced (multi-field)
- **EventON RSVP add-on** — yes/no/maybe + custom fields + party size + one-click

### Simple RSVP (Eventin)

```
  Will you attend?
  [  Going  ]  [ Not Going ]
```

- Logged-in users: one-click, immediate
- Logged-out: redirect to login or guest form (name + email)

### Advanced RSVP (EventON)

```
  ┌──────────────────────────────────────┐
  │ RSVP to: API Architecture Roundtable │
  ├──────────────────────────────────────┤
  │ Your Name:  [________________]       │
  │ Email:      [________________]       │
  │ Phone:      [________________]       │
  │ Going / Not Going / Maybe            │
  │ Number of Guests: [1 ▾]              │
  │ Additional Notes:                    │
  │ [______________________________]     │
  │                                      │
  │ [Submit RSVP]                        │
  └──────────────────────────────────────┘
```

- **One-click from EventTop**: logged-in users can RSVP directly from the calendar tile without opening the card
- **Guest list display**: initials or full names shown on event card (configurable visibility)
- **Capacity sync**: real-time count displayed; "X spots remaining" label
- **Close timing**: configurable minutes before event start
- **Update existing**: pre-populated form if user already RSVP'd

### RSVP Status After Submit

```
  ✅ Going    |  23 people going
  ❌ Not Going
  💬 Maybe    |  5 people maybe
```

### Waitlist Integration (EventON Waitlist add-on)

When capacity reached:
```
  Event is full. [Join Waitlist]
```

- FIFO space offers on cancellation
- Party-size-aware matching (waitlist entry with 3 guests gets priority over single)
- Self-removal from waitlist
- Waitlist badge on event card

### Invite-Only RSVP (EventON Invitees add-on)

- Token-based invitation URLs
- Invitee-only RSVP gate
- Pre-filled form fields from invitation
- Attendance stats per invitee
- Public/private message wall (out of scope for MVP)

### Dateline Block Kit Sketch

```typescript
const rsvpForm = blocks.section(
  { label: 'RSVP' },
  [
    blocks.statusLine({
      text: rsvpStatusText(event.rsvpSummary),
      status: event.rsvpSummary.remaining > 0 ? 'info' : 'warning',
    }),
    blocks.input('rsvp_name', { label: 'Name', required: true }),
    blocks.input('rsvp_email', { type: 'email', label: 'Email', required: true }),
    blocks.input('rsvp_phone', { type: 'tel', label: 'Phone' }),
    blocks.radioGroup('rsvp_status', {
      label: 'Will you attend?',
      options: ['yes', 'no', 'maybe'],
      required: true,
    }),
    blocks.stepper('rsvp_guests', {
      label: 'Number of Guests',
      value: 1,
      min: 1,
      max: event.maxGuestsPerRsvp || 10,
    }),
    blocks.input('rsvp_notes', { type: 'textarea', label: 'Notes' }),
    blocks.button('submit_rsvp', {
      label: 'Submit RSVP',
      style: 'primary',
    }),
  ]
);

// One-click RSVP from EventTop (logged-in users)
const oneClickRsvp = blocks.sectionText({
  accessory: blocks.button('rsvp_yes', { label: '✓ Going', size: 'sm' }),
  text: `${event.rsvpSummary.yesCount} going`,
});
```

---


## 7. Seat Map Interaction

### Observed In
- **EventON Seats add-on** — drag-and-drop editor + frontend canvas picker

### Admin: Seat Map Editor

```
  ┌────────────────────────────────────────┐
  │ Sections: [Section A ▾] [+ New Sect]  │
  │                                        │
  │ ┌────────────────────────────────────┐ │
  │ │  [seat] [seat] [seat] [seat]      │ │
  │ │  [seat] [seat] [seat] [seat]      │ │
  │ │  [seat] [seat] [seat] [seat]      │ │
  │ │                                    │ │
  │ │  [Drag to add seats]              │ │
  │ └────────────────────────────────────┘ │
  │                                        │
  │ Seat Properties:                        │
  │ Number: [A1]  Price: [$50]  ♿ [ ]    │
  │ Row: [A]                                │
  │ [Save Map] [Preview] [Export JSON]     │
  └────────────────────────────────────────┘
```

- **Drag-and-drop**: seats repositioned via jQuery UI draggable
- **Section types**: assigned rows, unassigned area (polygon), booth, area-of-interest
- **Duplicate section with offset**: clone Section A → Section B shifted by N seats
- **JSON import/export**: `_evost_sections` serialized structure
- **WC stock sync**: on map save, updates WooCommerce product stock

### Frontend: Seat Picker

- Same canvas as admin but read-only layout; seats are clickable
- **Seat status colors**:
  - Green: available
  - Yellow: in my cart
  - Grey: sold / unavailable
  - Blue: selected by me
- **Legend panel**: visible at all times
- **Hold timer**: countdown in cart UI ("Hold expires in 5:23")
- **One-click → cart**: clicking an available seat auto-adds it

### Dateline Sketch

```typescript
interface SeatMap {
  sections: SeatSection[];
}

interface SeatSection {
  id: string;
  name: string;
  type: 'assigned' | 'unassigned' | 'booth' | 'area';
  position: { x: number; y: number };
  rows?: SeatRow[];        // for assigned
  capacity?: number;       // for unassigned
  polygon?: number[][];    // for area-of-interest
}

interface SeatRow {
  id: string;
  index: number;
  seats: Seat[];
}

interface Seat {
  id: string;
  number: string;
  status: 'available' | 'held' | 'sold' | 'selected';
  price?: number;          // cents, overrides section default
  isAccessible: boolean;
}

// Hold in KV
cartHolds: {
  key: `hold:${cartId}`,
  value: { seatSlugs: string[], createdAt: ISO8601 },
  expirationTtl: 600,
}
```

---


## 8. Admin Event Editor

### Observed In
- **EventON** — metabox-heavy classic editor
- **TEC/ECP** — classic + block editor; CT1 recurrence builder
- **Eventin Pro** — custom admin pages with template system

### Common Sections (all three P0 plugins)

| Section | EventON | TEC | Eventin |
|---------|---------|-----|---------|
| Title + content | Classic editor | Classic / block | Classic editor |
| Time & date | Date/time pickers | Date/time pickers | Date + time (split) |
| Timezone | Dropdown (IANA) | Dropdown (IANA) | Dropdown (IANA) |
| All-day toggle | Enum | Boolean | Implicit |
| Recurrence | Simple + custom modes | Block editor RRULE builder | Serialized blob |
| Location | Taxonomy term | Venue CPT | Inline string |
| Organizer | Taxonomy term | Organizer CPT | Inline array |
| Categories | Taxonomy chips | Taxonomy chips | Taxonomy chips |
| Featured image | WP thumbnail | WP thumbnail | WP thumbnail |
| Color | Hex picker | N/A | Hex picker |
| Virtual URL | Text + password | Provider-aware panel | Multiple URL keys |
| Tickets | Metabox (WC product) | N/A (separate plugin) | Native tiers |
| RSVP | Metabox | N/A | Module settings |
| Custom fields | Dynamic metaboxes | Additional fields tab | Extra fields |
| SEO | N/A | Yoast integration | N/A |

### EventON Metabox Layout (classic editor)

```
  ┌────────────────────────────────────────────────────────────┐
  │ Event Details                     │ Event Options          │
  │ ─────────────                      │ ───────────            │
  │ Event Name: [________________]    │ Event Color: [#picker] │
  │ Event Subtitle: [______________]  │ Featured: [ ] Yes      │
  │ Event Date: [picker] [time]       │ Language: [EN ▾]       │
  │ Event End Date: [picker] [time]   │ Hide from cal: [ ]     │
  │ Timezone: [Los Angeles ▾]         │ ...                    │
  │ All-day: [Normal ▾]               │                        │
  │ Location: [San Francisco ▾]       │                        │
  │ Organizer: [Alex Chen ▾]          │                        │
  │ ...                                │                        │
  └────────────────────────────────────────────────────────────┘
```

### TEC Block Editor (CT1 recurrence builder)

```
  ┌────────────────────────────────────────────────────────────┐
  │ ┌────────────────────────────────────────────────────────┐ │
  │ │ Recurrence                                            │ │
  │ │ Repeats: [Weekly ▾]  Every: [1 ▾] week(s)            │ │
  │ │ On: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]       │ │
  │ │ Ends: [Never ▾]  /  After [__] occurrences  / On [__]│ │
  │ │                                                      │ │
  │ │ [What are the dates?] → inline preview of next 5     │ │
  │ └────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────┘
```

- **Inline preview**: computed next-5 dates shown live as user edits rules
- **Exception dates**: per-occurrence editing (EXDATE) via occurrence table

### Eventin Pro Template System

Events have a "Template" publish metabox with 3 layout options.
Templates use Gutenberg blocks (Event Banner, Event Date, Event Description, etc.)
Template preview mode: renders the chosen template with current event data

### Dateline Sketch

```typescript
// Admin event editor — Block Kit form
const eventEditor = blocks.form({
  id: 'event-edit',
  sections: [
    {
      label: 'Event Details',
      fields: [
        blocks.input('title', { label: 'Title', required: true }),
        blocks.input('subtitle', { label: 'Subtitle' }),
        blocks.dateTime('startAt', { label: 'Start', required: true }),
        blocks.dateTime('endAt', { label: 'End', required: true }),
        blocks.select('timezone', {
          label: 'Timezone',
          options: allIANAZoneIds(),
          default: siteDefaultTimezone,
        }),
        blocks.toggle('isAllDay', { label: 'All-day event' }),
      ],
    },
    {
      label: 'Location',
      fields: [
        blocks.select('venueId', {
          label: 'Venue',
          options: venues.map(v => ({ value: v.id, label: v.name })),
          allowCreate: true,
        }),
        // OR inline location editor
        blocks.inlineLocation('location', { label: 'Custom Location' }),
      ],
    },
    {
      label: 'Recurrence',
      fields: [
        blocks.toggle('isRecurring', { label: 'Repeating event' }),
        blocks.rruleBuilder('recurrenceRule', {
          visibleWhen: { field: 'isRecurring', eq: true },
          showPreview: true,
        }),
      ],
    },
    {
      label: 'Tickets & RSVP',
      fields: [
        blocks.toggle('hasTickets', { label: 'Sell tickets' }),
        blocks.ticketTierEditor('ticketTiers', {
          visibleWhen: { field: 'hasTickets', eq: true },
        }),
        blocks.toggle('hasRsvp', { label: 'Enable RSVP' }),
        blocks.numberInput('rsvpCapacity', {
          label: 'RSVP Capacity',
          visibleWhen: { field: 'hasRsvp', eq: true },
        }),
      ],
    },
  ],
});
```

---


## 9. Admin List Tables

### Observed In
- **EventON** — CPT list with taxonomy/date filters, bulk edit, quick edit
- **TEC/ECP** — same + "Manager" CT1 view, import/aggregator
- **Eventin Pro** — custom list with template column, speaker column

### Pattern Anatomy (TEC as reference)

```
  ┌────────────────────────────────────────────────────────────┐
  │ All (7) | Published (5) | Draft (1) | Trash (1)           │
  │                       [+ Add New Event]                    │
  │                                                             │
  │ Search [________]  Filter by date [____ ▾]                │
  │                                                             │
  │ □ | Title        | Author | Categories | Tags | Start      │
  │ ─────────────────────────────────────────────────────────  │
  │ □ | Tech Talk    | alice   | Tech       | api  | Apr 30   │
  │ □ | Garden Party | bob     | Outdoor    | park | May 1    │
  │ □ | ...                                                   │
  │                                                             │
  │ [Bulk actions ▾] [Apply]                                  │
  └────────────────────────────────────────────────────────────┘
```

- **Filter tabs**: All / Published / Draft / Trash counts
- **Search**: title/content keyword
- **Filter dropdowns**: date range, taxonomy, custom fields
- **Sortable columns**: click header to sort
- **Row actions**: Edit | Quick Edit | Trash | View (per row)
- **Bulk actions**: trash, publish, draft, category assign
- **Quick Edit**: inline row editor (title, slug, date, categories, tags, featured, status)

### EventON RSVP / Ticket Admin Tables

- RSVP records: list of `evo-rsvp` CPT with name, email, status, event, date
- Ticket orders: WC order list filtered to ticket products
- Attendees: name, ticket type, check-in status, QR code

### Dateline Sketch

```typescript
const eventsList = blocks.table({
  columns: [
    { key: 'checkbox', width: '30px' },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'author', header: 'Author' },
    { key: 'categories', header: 'Categories' },
    { key: 'tags', header: 'Tags' },
    { key: 'startDate', header: 'Start', sortable: true },
    { key: 'status', header: 'Status' },
  ],
  rows: events.map(e => ({
    checkbox: blocks.checkbox(`select_${e.id}`),
    title: blocks.link(e.title, { href: `/admin/events/${e.id}` }),
    author: e.authorName,
    categories: e.categories.map(c => blocks.chip(c.name)),
    tags: e.tags.map(t => blocks.chip(t.name, { variant: 'outline' })),
    startDate: formatDate(e.startAt),
    status: blocks.badge(e.status, { variant: statusBadgeColor(e.status) }),
    rowActions: ['edit', 'quickEdit', 'trash', 'view'],
  })),
  bulkActions: ['publish', 'draft', 'trash', 'assignCategory'],
  filterTabs: [
    { label: 'All', count: counts.all },
    { label: 'Published', count: counts.published },
    { label: 'Draft', count: counts.draft },
    { label: 'Cancelled', count: counts.cancelled },
  ],
});
```

---


## 10. Frontend Dashboard / SPA

### Observed In
- **Eventin Pro** — React SPA for frontend event management (My Events, My Tickets, My RSVPs)
- **TEC** — Community Events (simpler, not analyzed in depth)

### Eventin Dashboard Structure

```
  ┌────────────────────────────────────────────┐
  │ My Events | My Tickets | My RSVPs | Attendees│
  ├────────────────────────────────────────────┤
  │ [Create New Event]                         │
  │ ┌────────────────────────────────────────┐ │
  │ │ API Architecture Roundtable            │ │
  │ │ Apr 30 | Tech | Online                  │ │
  │ │ [Edit] [Clone] [Trash] [Attendees]     │ │
  │ └────────────────────────────────────────┘ │
  │ ┌────────────────────────────────────────┐ │
  │ │ ...                                     │ │
  │ └────────────────────────────────────────┘ │
  └────────────────────────────────────────────┘
```

**Tabs:**
- **My Events**: events user authored; create, edit, clone, trash, view attendees
- **My Tickets**: purchased tickets with download link
- **My RSVPs**: RSVP'd events with cancel button
- **Attendees**: (for authors) attendee list per event with CSV export + manual check-in

**Frontend Event Creation Form:**
- Mirrors admin edit screen
- Full-featured: title, description, date/time, location, ticket tiers, RSVP, speakers, categories, image upload
- Built with React (+ ~500KB build/js/script.js)

### Dateline Sketch

```typescript
// Frontend dashboard — React component (not Block Kit)
function FrontendDashboard() {
  const [activeTab, setActiveTab] = useState('myEvents');
  const { events, tickets, rsvps } = useDashboardData();

  return (
    <DashboardLayout>
      <TabBar tabs={[
        { id: 'myEvents', label: `My Events (${events.length})` },
        { id: 'myTickets', label: `My Tickets (${tickets.length})` },
        { id: 'myRsvps', label: `My RSVPs (${rsvps.length})` },
        { id: 'attendees', label: 'Attendees' },
      ]} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'myEvents' && (
        <EventGrid events={events} actions={['edit', 'clone', 'trash', 'attendees']} />
      )}
      {activeTab === 'myTickets' && <TicketList tickets={tickets} />}
      {activeTab === 'myRsvps' && <RsvpList rsvps={rsvps} onCancel={cancelRsvp} />}
      {activeTab === 'attendees' && <AttendeeManager />}
    </DashboardLayout>
  );
}
```

---


## 11. Search & Filter Bar

### Observed In
- **EventON** — search input + taxonomy dropdown (shortcode attributes)
- **TEC/ECP** — Tribe Bar: search + date + category + tag + cost + organizer + venue + custom fields
- **Eventin Pro** — category filter above calendar, search in list view

### TEC Tribe Bar (most complete)

```
  ┌────────────────────────────────────────────────────────────┐
  │ [Keyword ______] [Date ▾] [Category ▾] [Tag ▾]           │
  │ [Cost ▾] [Organizer ▾] [Venue ▾] [Other ▾]              │
  │                                                            │
  │ [Find Events]                                              │
  └────────────────────────────────────────────────────────────┘
```

- **Keyword**: free-text search on title + description
- **Date**: preset ranges (Today, This Week, This Weekend, Next Week, etc.) or custom
- **Category / Tag**: multi-select chips
- **Cost**: range slider or preset tiers (Free, Under $25, etc.)
- **Organizer / Venue**: dropdown of existing entities
- **Other**: custom field filters
- **Live filter**: filter chips appear as pills above results; removable individually
- **Clear all**: resets all filters

### EventON Search

- Simpler: keyword + taxonomy dropdown (per shortcode)
- No URL state — filters are not shareable
- No deep-linking support

### Dateline Sketch

```typescript
const filterBar = blocks.section(
  { label: 'Find Events' },
  [
    blocks.actionRow([
      blocks.input('search_keyword', {
        placeholder: 'Search events...',
        onChange: debounce(applyFilters, 300),
      }),
      blocks.select('search_date', {
        options: ['Any', 'Today', 'This Week', 'This Weekend', 'Next Week', 'Custom'],
      }),
      blocks.multiSelect('search_categories', {
        options: categories.map(c => ({ value: c.id, label: c.name })),
      }),
      blocks.select('search_cost', {
        options: ['Any price', 'Free', 'Under $25', '$25–$50', '$50+'],
      }),
      blocks.button('find_events', { label: 'Find Events', style: 'primary' }),
    ]),
    // Active filter chips
    activeFilters.length > 0 && blocks.chipGroup(
      activeFilters.map(f => blocks.chip(f.label, { onRemove: () => removeFilter(f) }))
    ),
  ]
);

// URL sync: filters read from / written to query string
// Shallow routing so back button works
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setFilters(deserializeFilters(params));
}, []);

useEffect(() => {
  const url = `${window.location.pathname}?${serializeFilters(filters)}`;
  window.history.pushState({}, '', url);
}, [filters]);
```

---


## 12. Map & Geolocation Views

### Observed In
- **TEC/ECP** — Map view (geographic scatter + list pane), location search
- **EventON** — Google Maps embed on event card + single page
- **Eventin Pro** — location listing with event counts

### TEC Map View

```
  ┌────────────────────────────────────────────────────────────┐
  │ Search by Location: [__________] [Radius: 25 mi ▾] [Find] │
  ├──────────────┬───────────────────────────────────────────┤
  │ Tech Talk    │                                           │
  │ Apr 30 | $25 │                                           │
  │              │            [Google Map]                   │
  │ Garden Party │              ●  ●    ●                    │
  │ May 1 | Free │                                           │
  │              │                    ●                      │
  │ ...          │                                           │
  └──────────────┴───────────────────────────────────────────┘
```

- **Left pane**: list-view cards, same as standard list
- **Right pane**: Google Maps embed with markers
- **Click card**: pans map to venue + opens info window
- **Cluster markers**: groups when markers overlap
- **Geofence radius**: configurable (miles/km)
- **Empty state**: no map when no geocoded venues

### EventON Map Embed

- Simpler: iframe embed on event card and single page
- No interactive filtering
- Static marker at venue lat/lng

### Dateline Sketch

```typescript
const mapView = blocks.splitLayout({
  left: blocks.section(
    { label: 'Events' },
    events.map(e =>
      blocks.eventRow({
        ...eventRowProps(e),
        onClick: () => map.panTo(e.location.lat, e.location.lng),
      })
    )
  ),
  right: blocks.map({
    markers: events.map(e => ({
      lat: e.location.lat,
      lng: e.location.lng,
      label: e.title,
      onClick: () => selectEvent(e.id),
    })),
    clusters: true,
    onBoundsChange: (bounds) => applyGeoFilter(bounds),
  }),
});
```

---


## 13. Schedule / Timeline Display

### Observed In
- **Eventin Pro** — schedule tabs (day-based) + schedule list
- **EventON** — schedule view shortcode (`[add_eventon_sv]`), single-event schedule section

### Eventin Schedule Tab

```
  ┌────────────────────────────────────────────────────────────┐
  │ [Day 1] [Day 2] [Day 3]                                   │
  ├────────────────────────────────────────────────────────────┤
  │ 9:00 AM  Opening Keynote                                   │
  │          Dr. Sarah Chen       ● Speaker photo              │
  │                                                            │
  │ 10:30 AM  Panel: API Design                                │
  │           Alex Kim, Pat Lee   ● Speaker photos             │
  │                                                            │
  │ 12:00 PM  Lunch Break                                      │
  └────────────────────────────────────────────────────────────┘
```

- **Day tabs**: horizontal tab bar; AJAX content swap
- **Session row**: time range, title, speaker name + photo, venue/room
- **Speaker grid**: separate section below schedule

### EventON Schedule View

- Vertical timeline grouped by date
- Each event: time pill, title, location
- Shortcode configurable: `expanded` (shows EventCard detail on click) or `compact`

### Dateline Sketch

```typescript
const scheduleTabs = blocks.section(
  { label: 'Schedule' },
  [
    blocks.tabBar(
      schedule.days.map(day => ({
        id: day.id,
        label: day.label, // "Day 1" or "Apr 30"
      })),
      activeDay,
      setActiveDay
    ),
    blocks.timeline(
      activeDay.sessions.map(s => ({
        title: s.title,
        time: formatTimeRange(s),
        description: s.speakers.map(sp => `${sp.name} — ${sp.designation}`).join(', '),
        icon: s.speakers[0]?.photo,
      }))
    ),
  ]
);
```

---


## 14. Check-In & QR Scanner

### Observed In
- **EventON QR add-on** — dedicated check-in page + scanner gun mode
- **Eventin Pro** — admin attendee list with manual check-in toggle

### EventON QR Check-In Page

```
  ┌────────────────────────────────────────────────────────────┐
  │ EventON QR Code Checking                                   │
  │                                                            │
  │ [________________________]  [Check In]                    │
  │ (Paste QR code or use scanner gun)                        │
  │                                                            │
  │ Last checked in:                                          │
  │ ● Alex Chen — API Arch Talk — Apr 30, 8:00 AM            │
  │                                                            │
  │ [Scanner Gun Mode]                                        │
  └────────────────────────────────────────────────────────────┘
```

- **Input mode**: paste QR string or type ticket number
- **Scanner gun mode**: auto-focus input field; barcode scanner delivers keystrokes + Return; auto-submits
- **Result**: success toast (name, event, time) or error (already checked in, invalid, refunded)
- **Un-check**: revert check-in status
- **Role gate**: page restricted by `evoqr_001` role

### QR Code Content

- EventON: base64-encoded ticket number (not cryptographic)
- Contains: `{rsvp_id}` or `{ticket_number}`
- Optional AES-256 helper exists but is NOT called in main flow

### Dateline Sketch

```typescript
// Check-in PWA
const checkinPage = blocks.section(
  { label: 'Event Check-In' },
  [
    blocks.input('qr_input', {
      placeholder: 'Scan or paste QR code...',
      autoFocus: true,
      onEnter: checkIn,
    }),
    blocks.button('check_in', { label: 'Check In', onClick: checkIn }),
    blocks.toggle('gun_mode', {
      label: 'Scanner Gun Mode',
      description: 'Auto-submit on scan',
    }),
    blocks.divider({ title: 'Last Checked In' }),
    blocks.list(
      recentCheckins.map(c => `${c.name} — ${c.eventTitle} — ${formatTime(c.checkedInAt)}`)
    ),
  ]
);

// Backend check-in handler
async function checkIn(qrString: string, ctx: PluginContext) {
  const token = parseJwt(qrString);
  const { eventId, attendeeId } = verifyToken(token, ctx.env.CHECKIN_SECRET);

  const attendee = await ctx.content.get('attendee', attendeeId);
  if (attendee.checkInStatus === 'checked_in') {
    return { toast: { type: 'warning', text: 'Already checked in' } };
  }

  await ctx.content.update('attendee', attendeeId, {
    checkInStatus: 'checked_in',
    checkInAt: new Date().toISOString(),
  });

  // Fire webhook / notification inside waitUntil
  ctx.waitUntil(sendCheckinNotification(attendee));

  return { toast: { type: 'success', text: `Checked in: ${attendee.firstName} ${attendee.lastName}` } };
}
```

---


## 15. Countdown Timer

### Observed In
- **Eventin Pro** — real-time JS countdown (days/hours/minutes/seconds)
- **TEC/ECP** — Event Countdown widget

### Eventin Countdown

```
  ┌────────────────────────────────────────────┐
  │ Days    Hours   Minutes   Seconds          │
  │  02      14       37        22             │
  └────────────────────────────────────────────┘
```

- **Real-time**: JavaScript interval, updates every second
- **On expiry**: text changes to "Event has started" or custom message
- **Placement**: overlay on banner image, standalone widget, or inline
- **Parameters**: event ID, custom labels, end text

### Dateline Sketch

```typescript
// React component (Block Kit is static; this needs client-side JS)
function CountdownTimer({ targetDate, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate);
      setTimeLeft(remaining);
      if (remaining.total <= 0) onExpire?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown">
      {['days', 'hours', 'minutes', 'seconds'].map(unit => (
        <div key={unit} className="countdown-unit">
          <span className="countdown-value">{timeLeft[unit]}</span>
          <span className="countdown-label">{unit}</span>
        </div>
      ))}
    </div>
  );
}
```

---


## 16. Slider / Carousel

### Observed In
- **EventON Slider add-on** — horizontal event carousel
- **Eventin Pro** — speakers slider, events slider

### EventON Slider

```
  ┌────────────────────────────────────────────────────────────┐
  │ ◀  [slide: event image + title + date]  ▶                 │
  │                                                            │
  │               ● ○ ○ ○  (dots)                             │
  └────────────────────────────────────────────────────────────┘
```

- **Slide types**: single-event, multi-event (1–5 visible), mini (200px/slide), micro (120px/slide), vertical
- **Controls**: prev/next arrows, dot navigation
- **Auto-advance**: configurable interval + pause-on-hover
- **Image style**: image-top (default) or image-left (forced to 1 visible)

### Dateline Sketch

```typescript
// React component
function EventSlider({ events, visibleCount = 1, autoPlay = false }: SliderProps) {
  return (
    <Carousel
      items={events.map(e => (
        <EventSlide
          image={e.featuredImage}
          title={e.title}
          date={formatShortDate(e)}
          onClick={() => navigateToEvent(e.id)}
        />
      ))}
      visibleCount={visibleCount}
      autoPlay={autoPlay}
      pauseOnHover={true}
      showDots={true}
      showArrows={true}
    />
  );
}
```

---


## 17. Wishlist / Saved Events

### Observed In
- **EventON Wishlist add-on** — heart toggle on event cards + wishlist manager page
- No equivalent in TEC or Eventin (very low adoption)

### Pattern

```
  [♡ 12]  → click →  [♥ 13]  "In your wishlist"
```

- **Heart toggle**: outline (not saved) / filled (saved)
- **Count**: total wishlists for this event (public)
- **AJAX**: add/remove without page reload
- **Login gate**: unauthenticated users see login lightbox
- **Wishlist manager page**: list of saved events for logged-in user

### Dateline Sketch

```typescript
const wishlistButton = blocks.sectionText({
  accessory: blocks.button('toggle_wishlist', {
    icon: isWishlisted ? 'heart-filled' : 'heart-outline',
    size: 'sm',
    onClick: toggleWishlist,
  }),
  text: `${wishlistCount} saved`,
});

// In KV (if user-scoped)
userWishlists: {
  key: `wishlist:${userId}`,
  value: { eventIds: string[], updatedAt: ISO8601 },
}
```

---


## 18. Import / Bulk Upload

### Observed In
- **EventON CSV Importer** — file upload → verify → import
- **TEC/ECP** — Aggregator (Facebook, iCal, Google Calendar, CSV via add-on)

### EventON CSV Import Flow

**Step 1 — Upload:**
```
  [Choose File]  [Upload CSV file]
  -- CSV file guidelines --
  [Guide for CSV file] (opens popup with column reference)
```

**Step 2 — Verify:**
```
  Verify Processed Events & Import
  ┌────────────────────────────────────────────────────┐
  │ □ | Status | Post Status | Event Name | ...       │
  │ ☑ | ⚫ss   | publish    | Cacao ...   | ...      │
  │ ☐ | ⚫ss   | draft      | Hatha ...   | ...      │
  │                                                    │
  │ [Deselect All] [Select All]          [IMPORT]     │
  └────────────────────────────────────────────────────┘
```

- **Status icons**: green (pass), red (fail), yellow (partial)
- **Row-level validation**: missing required fields highlighted
- **No dry-run**: import is atomic per selected row
- **Chunked AJAX**: large files processed in batches

### Dateline Sketch

```typescript
const csvImportFlow = [
  // Step 1
  blocks.section(
    { label: 'Import Events from CSV' },
    [
      blocks.fileUpload('csv_file', {
        accept: '.csv',
        maxSize: '10MB',
      }),
      blocks.button('upload', { label: 'Upload & Preview', style: 'primary' }),
    ]
  ),

  // Step 2
  blocks.section(
    { label: 'Preview' },
    [
      blocks.table({
        columns: ['status', 'title', 'start', 'end', 'errors'],
        rows: previewRows.map(row => ({
          status: row.valid
            ? blocks.badge('Ready', { variant: 'success' })
            : blocks.badge(`${row.errors.length} issues`, { variant: 'error' }),
          ...row.data,
        })),
      }),
      blocks.button('import_all', { label: 'Import Selected', style: 'primary' }),
      blocks.button('download_report', { label: 'Download Report' }),
    ]
  ),
];
```

---


## 19. Virtual Event Embed

### Observed In
- **TEC/ECP** — richest implementation: provider-aware panels, embed vs. link-out, gating
- **EventON** — simple URL + password
- **Eventin Pro** — Zoom join URL, Google Meet link

### TEC Virtual Event Panel

```
  ┌────────────────────────────────────────────────────────────┐
  │ Virtual Event                                             │
  ├────────────────────────────────────────────────────────────┤
  │                                                          │
  │ [Join Meeting]  (or embedded video iframe)              │
  │                                                          │
  │ Link visible to: [Everyone ▾]                            │
  │ Show embed at: [Event start ▾]                           │
  │ Provider: [Zoom ▾]                                       │
  └────────────────────────────────────────────────────────────┘
```

- **Embed**: iframe with meeting URL (Zoom, Google Meet, Teams, YouTube, Facebook)
- **Link-out**: "Join" button opening in new tab
- **Gating**: visible to everyone, logged-in, ticket-holders
- **Timing**: show at event start or specific datetime
- **Provider-specific renderers**: per-provider UI (Zoom account picker, YouTube channel ID, etc.)

### EventON Virtual Event

- Simple: URL text field + password field
- Visibility: after RSVP / after ticket purchase (two separate booleans)

### Dateline Sketch

```typescript
const virtualEventPanel = blocks.section(
  { label: 'Virtual Event' },
  [
    blocks.select('virtual_access', {
      label: 'Link visible to',
      options: ['Everyone', 'Logged-in users', 'RSVP holders', 'Ticket holders'],
    }),
    blocks.select('virtual_provider', {
      label: 'Meeting provider',
      options: ['Zoom', 'Google Meet', 'Microsoft Teams', 'Webex', 'Custom'],
    }),
    blocks.input('virtual_url', { label: 'Meeting URL', type: 'url' }),
    blocks.input('virtual_password', { label: 'Password', type: 'password' }),
    blocks.toggle('virtual_embed', { label: 'Embed video on event page' }),
    blocks.dateTime('virtual_show_at', {
      label: 'Show link at',
      default: 'event_start',
    }),
    blocks.button('join_meeting', {
      label: 'Join Meeting',
      style: 'primary',
      disabled: !canAccessVirtual(user, event),
      onClick: () => window.open(event.virtualUrl, '_blank'),
    }),
  ]
);
```

---


## 20. Settings Framework

### Observed In
- **EventON** — top-rail tabs + left-rail sub-nav; 200+ keys in one serialized blob
- **TEC/ECP** — same pattern: Settings → tabs → sub-sections
- **Eventin Pro** — horizontal tabs per category

### Pattern

```
  ┌────────────────────────────────────────────────────────────┐
  │ General | Language | Styles | Addons | Support            │
  ├────────────────────────────────────────────────────────────┤
  │                                                            │
  │  Appearance          Events               Frontend         │
  │  ─────────           ──────               ────────         │
  │  [Color picker]      [Default view ▾]    [Items per page] │
  │  [Font dropdown]     [Week start ▾]      [Show search]    │
  │                      ...                   ...             │
  │                                                            │
  │ [Save Changes]                                            │
  └────────────────────────────────────────────────────────────┘
```

- **Top rail**: high-level categories (General, Display, Integrations, etc.)
- **Left rail / column groups**: sub-sections within a tab
- **Field types**: text, textarea, dropdown, checkbox, color picker, yes/no toggle
- **Inline help**: tooltip or small text under each field
- **Monolithic save**: all settings in one form, POST to same endpoint

### Dateline Sketch

```typescript
const settingsPage = blocks.form({
  id: 'plugin-settings',
  tabs: [
    {
      label: 'General',
      sections: [
        {
          label: 'Appearance',
          fields: [
            blocks.colorPicker('primary_color', { label: 'Primary Color' }),
            blocks.select('font_family', {
              label: 'Font',
              options: ['Inter', 'Roboto', 'Open Sans', 'System'],
            }),
          ],
        },
        {
          label: 'Events',
          fields: [
            blocks.select('default_view', {
              label: 'Default Calendar View',
              options: ['month', 'list', 'week', 'day'],
            }),
            blocks.select('week_start', {
              label: 'Week Starts On',
              options: ['Sunday', 'Monday'],
            }),
          ],
        },
      ],
    },
    {
      label: 'Integrations',
      sections: [
        {
          label: 'Zoom',
          fields: [
            blocks.input('zoom_api_key', { label: 'API Key', type: 'password' }),
            blocks.input('zoom_api_secret', { label: 'API Secret', type: 'password' }),
          ],
        },
      ],
    },
  ],
});

// Storage: typed KV, one key per setting — no monolithic blob
await ctx.kv.put('settings:primary_color', values.primary_color);
await ctx.kv.put('settings:default_view', values.default_view);
// etc.
```

---

## Cross-Pattern Design Principles

### 1. Mobile-First Defaults
All patterns observed degrade to a single-column stack below 768px. Dateline should build mobile first and layer desktop enhancements.

### 2. Progressive Disclosure
- Calendar → event card → single event → action (RSVP / ticket / check-in)
- Each level reveals more detail; no level overwhelms

### 3. Consistent Color Language
- Category colors are the primary visual taxonomy across all plugins
- EventON's "color bar per event" is the most distinctive; TEC uses category chips
- Dateline: support per-event color override with auto-contrast

### 4. Unified Action Model
EventON and Eventin suffer from parallel RSVP/ticket paths. Dateline's unified attendee model means:
- One registration form regardless of free/paid
- One check-in flow for all attendances
- One admin list table for all registrations

### 5. URL State for Shareability
EventON's lack of URL-synced filters is a major UX gap. TEC's approach (query params) is correct and should be baseline.

### 6. Accessibility
- Keyboard-navigible calendars (arrow keys between cells, Enter to select)
- Screen-reader announcements for AJAX updates (`aria-live` regions)
- High-contrast mode support (avoid low-contrast category colors)
- Focus traps in modals (event card lightboxes, seat picker)

---

## License Reminder

This document was authored via clean-room analysis of 14 GPL-licensed WordPress plugins. No PHP source code was copied. UI patterns, interaction models, and pseudo-code are independently derived from screenshots, live walkthroughs, and static analysis of rendered HTML/CSS/JS. The Block Kit sketches and TypeScript interfaces are original work.
