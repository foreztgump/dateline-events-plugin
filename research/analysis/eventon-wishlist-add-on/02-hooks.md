# eventon-wishlist-add-on — Hooks

## Actions/Filters Consumed (inferred from frontend class)

Based on pattern seen in other EventON add-ons and the `evowi_frontend` class:

- EventON event card hooks (likely `eventon_event_card_footer` or equivalent) to inject the bookmark button.
- `wp_enqueue_scripts` / `eventon_enqueue_scripts` for wishlist.js.
- `wp_ajax_evowi_*` and `wp_ajax_nopriv_evowi_*` for add/remove/load AJAX handlers.

## Shortcode

```
[add_eventon_wishlist_manager]  → EVOWI_Wishlist_Manager::wishlist_manager_content()
```

Template loaded from `templates/wishlist-manager.php` with theme override support.

## No REST Endpoints

AJAX-based (WordPress admin-ajax.php).

## Dateline Design Implications

- **Bookmark table**: `event_bookmarks (user_id, event_id, created_at)` — simple join table.
- **Anonymous wishlist**: Use `user_id` from session/cookie; merge into account on signup if needed.
- **API endpoints**: `POST /api/bookmarks`, `DELETE /api/bookmarks/{event_id}`, `GET /api/bookmarks` (paginated).
- **Wishlist page**: Frontend route `/my/wishlist` rendering saved events using the standard event list component.
- **No gamification beyond saving** — no sharing, no social features, no notifications.
