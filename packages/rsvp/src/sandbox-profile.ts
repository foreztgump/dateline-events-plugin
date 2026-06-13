import { activate, afterSave } from "./hooks.js";
import { rsvpSubmit, waitlistJoin } from "./routes.js";
import type { RsvpContext } from "./types.js";

const PROFILE_EVENT = "evt_profile";
const PROFILE_EMAIL = "profile@example.com";

export async function profileRsvpSubmit(ctx: RsvpContext): Promise<void> {
  await rsvpSubmit({ request: profileRequest("rsvp-submit"), ctx: profileContext(ctx) });
}

export async function profileWaitlist(ctx: RsvpContext): Promise<void> {
  await waitlistJoin({ request: profileRequest("waitlist"), ctx: profileContext(ctx) });
}

export async function profileAfterSave(ctx: RsvpContext): Promise<void> {
  await afterSave({
    collection: "dateline_attendees",
    content: { id: "att_profile", event: PROFILE_EVENT, email: PROFILE_EMAIL, name: "Profile Guest", rsvpStatus: "confirmed" },
  }, profileContext(ctx));
}

export async function profileActivate(ctx: RsvpContext): Promise<void> {
  await activate({}, { ...ctx, cron: { schedule: () => Promise.resolve(undefined) } });
}

function profileRequest(route: string): Request {
  return new Request(`https://example.com/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
    body: JSON.stringify({ eventId: PROFILE_EVENT, email: PROFILE_EMAIL, name: "Profile Guest" }),
  });
}

function profileContext(ctx: RsvpContext): RsvpContext {
  const records = new Map<string, { id: string; data: unknown }>([
    [`capacity:${PROFILE_EVENT}`, { id: `capacity:${PROFILE_EVENT}`, data: { kind: "capacity", eventId: PROFILE_EVENT, remaining: 1 } }],
  ]);
  return {
    ...ctx,
    storage: ctx.storage ?? {
      rsvps: {
        get: (id) => Promise.resolve(records.get(id)?.data ?? null),
        put: (id, data) => {
          records.set(id, { id, data });
          return Promise.resolve();
        },
        delete: (id) => Promise.resolve(records.delete(id)),
        query: () => Promise.resolve({ items: Array.from(records.values()) }),
        count: () => Promise.resolve(records.size),
      },
    },
  };
}
