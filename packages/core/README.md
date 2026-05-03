# @dateline/core

The foundational sandboxed plugin for Dateline, providing event creation, editing, listing, and detail views within EmDash CMS. Defines the canonical event content type, hooks into EmDash's entry lifecycle, and exposes the primary routes and Block Kit admin UIs that all other Dateline packages build on. Depends on EmDash 0.9.x and targets Cloudflare Workers with a 50ms CPU / 10-subrequest budget.
