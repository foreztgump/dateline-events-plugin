# Deploy environment evidence — PRO-884

## Account & plan

| Field | Value |
|---|---|
| Cloudflare account | `b…m@gmail.com` (redacted) |
| Account ID | `a031c4…e806` (redacted) |
| Plan | Workers **Paid** (user-confirmed; Dynamic Worker Loader available, no error 10195) |
| Wrangler | `4.88.0` |
| Node | `v22.21.0` |
| Worker name | `dateline-reference-site` |
| Deployed URL | https://dateline-reference-site.networkreef-dev.workers.dev |
| Live version | `c90cb134-35df-4abc-a739-fb488c26eeb4` |
| Deployed at | 2026-06-14T03:28:16Z (Author: redacted account) |

`wrangler deployments list` (re-confirmed):

```
Version(s):  (100%) c90cb134-35df-4abc-a739-fb488c26eeb4
Author:      <redacted account>
```

## Generated worker bindings (`dist/server/wrangler.json`)

```
worker_loaders:  [{ "binding": "LOADER" }]          ← Dynamic Worker Loader (Paid-only) ACTIVE
d1_databases:    [{ "binding": "DB",   "database_name": "dateline-refsite-db",
                    "database_id": "0a405080-14bd-4ad1-b386-523e8a3585fb" }]
r2_buckets:      [{ "binding": "MEDIA","bucket_name":   "dateline-refsite-media" }]
kv_namespaces:   [{ "binding": "SESSION" }]          (id 853a0572831d42eab3326536155afff6, auto-provisioned)
durable_objects: { "bindings": [] }                  ← EMPTY (PluginBridge not wired → PRO-909)
migrations:      []                                  ← EMPTY (no new_sqlite_classes for PluginBridge → PRO-909)
main:            entry.mjs
```

**`env.LOADER` is present as a Worker Loader binding** — this is the core proof that the deploy
landed on a Paid account with the Dynamic Worker Loader enabled (the Free plan rejects
`worker_loaders` with error 10195 at deploy time; this deploy succeeded).

**`durable_objects.bindings` and `migrations` are empty** — this is the deployment-config gap that
prevents the sandbox from loading (the runner needs `exports.PluginBridge`, a Durable Object). See
`deployed-bundle-enforcement.md` §4 and **PRO-909**.

## Live smoke tests (public, seeded-D1-backed routes)

```
GET  /            → HTTP 200  "<title>Dateline Reference Site</title>"   (root.html)
GET  /events      → HTTP 200  "<title>Dateline Events</title>"           (events.html)
GET  /events.ics  → HTTP 200  text/calendar; valid VEVENTs from seeded D1 (events.ics)
```

`/events.ics` excerpt (served from the remote D1 seed):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dateline//Dateline Core 0.1//EN
BEGIN:VEVENT
UID:friday-meetup@dateline
SUMMARY:Friday Meetup RSVP Night
DTSTART;TZID=America/Los_Angeles:20260507T180000
DTEND;TZID=America/Los_Angeles:20260507T200000
STATUS:PUBLISHED
END:VEVENT
...
```

These confirm: the worker serves SSR Astro pages from the **remote D1** binding, the
Dateline `@dateline/core` iCal generation runs on the deployed worker, and seeded content
round-trips through D1 on the Paid account. (These flows exercise host-side code; the sandboxed
RSVP-submit and importer flows are blocked by the PRO-909 sandbox-load gap — see
`deployed-bundle-enforcement.md` §4.)

## Remote D1 seed

`dateline-refsite-db` was seeded with 44 tables / 800 rows: built a clean local SQLite via the
EmDash seed CLI (41 migrations + seed), added the `email:deliver` option pinned to
`emdash-console-email` + 2 RSVP capacity records, dumped, stripped PRAGMA/BEGIN/COMMIT/
sqlite_sequence, then `wrangler d1 execute dateline-refsite-db --remote --file /tmp/refsite-d1.sql`.
