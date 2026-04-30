# eventon-weekly-view — Features & i18n

## Core Features

1. **7-column week grid** — Events displayed in Mon–Sun (or Sun–Sat) columns.
2. **Week navigation** — Previous/next week navigation (7-day increments).
3. **View switcher** — Adds "Week" tab to EventON's view switcher.
4. **PHP helper** — `add_eventon_wv($args)` for direct PHP template usage.
5. **AJAX-powered** — No full page reload on navigation.

## Comparison to Full-Cal

| Dimension | Full-Cal | Weekly-View |
|-----------|----------|-------------|
| Grid unit | Month (28–31 cols) | Week (7 cols) |
| Navigation | Month +/- | Week +/- |
| Detail density | Day dots / counts | Full event titles per day |
| Use case | High-level overview | Detailed weekly planning |

## i18n

Minimal. View switcher label `'Week'` via `evo_lang()`. No complex text strings.

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| 7-column JS grid | React `WeekGrid` component |
| Multi-day spanning | Event blocks spanning columns based on start/end dates |
| View switcher | Same Tab bar as MonthGrid: List / Week / Month |
| Week start day | User preference (ISO 8601 default: Monday) |

## Notes

Lower priority than month-grid for initial Dateline build. Architecture is straightforward — same data contract as list and month views, different rendering component. Build after `MonthGrid` to reuse the same data layer.
