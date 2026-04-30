# eventon-wishlist-add-on — Features & i18n

## Core Features

1. **Bookmark button** — Heart/star icon on each event card; toggle add/remove wishlist.
2. **AJAX persistence** — Add/remove without page reload.
3. **Wishlist manager page** — Dedicated page showing all saved events via `[add_eventon_wishlist_manager]` shortcode.
4. **Language support** — `lang` parameter for multilingual.
5. **Theme override** — `wishlist-manager.php` template overridable from theme.

## Gamification Primitives (per PRD framing)

This is "gamification" only in the loosest sense:
- Save events = bookmark/favorites
- No points, badges, leaderboards, or social sharing
- "Primitives" = the ability to build on top of this (e.g., event recommendations based on wishlist)

## i18n

Minimal. Button labels and page title via `evo_lang()`. No dedicated text domain.

Likely strings:
- `'Add to wishlist'` / `'Remove from wishlist'`
- `'My Wishlist'`
- `'No events saved yet'`

## Known Limitations

- Storage mechanism not confirmed (user meta vs. table).
- No wishlist sharing (private only).
- No reminder notifications (e.g., "your saved event starts tomorrow").
- No anonymous wishlist persistence beyond session/cookie.

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| Bookmark toggle on card | `<BookmarkButton eventId={...} />` component |
| AJAX add/remove | `POST/DELETE /api/bookmarks/{event_id}` |
| Wishlist manager page | `/my/wishlist` route; standard event list filtered by bookmarks |
| User meta storage | `event_bookmarks` table (user_id, event_id, created_at) |
| Anonymous wishlist | Session cookie → merge on sign-in |
| "Gamification" expansion | Future: recommendations, event reminders based on wishlist |

## Notes

P3 priority. Build after core RSVP and ticket flows. The feature is straightforward and adds meaningful user retention value. Consider combining with event reminders (email "your saved event starts in 24 hours") as a natural extension.
