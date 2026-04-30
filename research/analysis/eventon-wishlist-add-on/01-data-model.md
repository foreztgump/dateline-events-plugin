# eventon-wishlist-add-on — Data Model

## Storage

Not directly visible in the main plugin file. Based on the architecture (user-event bookmark), storage is likely one of:

1. **User meta** (`wp_usermeta`): `_evowi_wishlist` → serialized array of event IDs (common pattern for WP user-preferences).
2. **Custom table**: `{prefix}_evowi_wishlist` with `(user_id, event_id, created_at)` — less likely given plugin size.
3. **Cookies**: For non-logged-in users.

The `evowi_functions` and `class-ajax.php` files contain the definitive storage implementation (not read due to P3 priority).

## Post Meta on `ajde_events`

No new event-level postmeta. Wishlist is a user-side relationship, not an event property.

## Options

Minimal. Admin settings (admin_init.php) likely control:
- Whether wishlist is enabled site-wide
- Display position of bookmark button (above/below event card)
- Language strings

## Shortcode

```
[add_eventon_wishlist_manager lang="L1"]
```

Renders the user's saved events list using `wishlist-manager.php` template. `lang` arg sets the global language for multilingual support.

## Template Variables

`wishlist-manager.php` likely receives:
- Array of saved event IDs or event objects
- Language context
- User identity (WP user or cookie token)
