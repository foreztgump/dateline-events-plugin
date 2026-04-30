# eventon-full-cal — Features & i18n

## Core Features

1. **Month-grid calendar** — Traditional month grid overlay on EventON's list view.
2. **Two UX modes** — Standard (grid + list below) and lightbox (events open in modal on day click).
3. **Heat map** — Optional day coloring based on event density (more events = darker cell).
4. **Next-to-grid** — Optional side-by-side layout (grid left, list right).
5. **View switcher** — Adds "Month" tab to EventON's view switcher (alongside existing views).
6. **Fixed day / day increment** — Can set which day the month view focuses on.
7. **Widget** — Sidebar widget support.
8. **Timezone-aware** — Passes UTC offset to JS for correct day assignment.
9. **PHP helper** — `add_eventon_fc($args)` for direct PHP template inclusion.

## i18n Strings

| Key | Default English |
|-----|----------------|
| `evo_lang_more` | `'More'` (day overflow indicator) |
| View switcher label | `'Month'` (via `evo_lang()`) |

Minimal i18n surface — mostly visual, no complex text.

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| Handlebars month grid | React `MonthGrid` component |
| Heat map | `event_count` per day → CSS variable / opacity |
| Lightbox mode | Modal/drawer showing event list for selected day |
| View switcher | Tab bar: List / Week / Month |
| Widget | Dashboard widget or embeddable component |
| `add_eventon_fc()` | JSX component `<MonthGrid events={...} />` |

## Notes

This plugin is the simplest of the P2/P3 set — pure rendering, no data model changes. Month-grid view is a standard calendar UX pattern and should be built natively in Dateline regardless of this plugin's specific implementation.
