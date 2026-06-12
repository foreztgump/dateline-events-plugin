import { describe, expect, it, vi } from "vitest";
import { validateBlocks } from "@dateline/blocks";
import plugin from "./plugin.js";
import {
  activate,
  adminHandlers,
  afterSave,
  cron,
  install,
  rsvpSubmit,
  waitlistJoin,
} from "./index.js";
import { MAX_CRON_HOLD_EXPIRATIONS } from "./constants.js";
import { CAPACITY_FULL_MESSAGE } from "./constants.js";
import type { RsvpContext } from "./types.js";

type TestRsvpContext = RsvpContext & {
  mocks: {
    contentUpdate: ReturnType<typeof vi.fn>;
    emailSend: ReturnType<typeof vi.fn>;
  };
};

describe("@dateline/rsvp", () => {
  it("declares the RSVP sandbox manifest", () => {
    expect(Object.keys(plugin.routes ?? {})).toEqual(expect.arrayContaining(["rsvp-submit", "waitlist", "admin/attendees", "admin/waitlist"]));
    expect(Object.keys(plugin.hooks ?? {})).toEqual(expect.arrayContaining(["content:afterSave", "plugin:install", "plugin:activate", "cron"]));
  });

  it("allows exactly one concurrent RSVP for capacity-one events", async () => {
    const ctx = storageContext("evt_1", 1);
    const submissions = Array.from({ length: 10 }, (_, index) => submitRsvp(ctx, `guest-${index}@example.com`, `203.0.113.${index}`));

    const responses = await Promise.all(submissions);
    const successCount = responses.filter((response) => response.status === 200).length;
    const capacityErrors = await Promise.all(responses.filter((response) => response.status === 409).map(readErrorBody));

    expect(successCount).toBe(1);
    expect(capacityErrors).toHaveLength(9);
    expect(capacityErrors.every((body) => body.error === CAPACITY_FULL_MESSAGE)).toBe(true);
  });

  it("admits exactly configured capacity under concurrent storage-backed oversell pressure", async () => {
    const ctx = storageContext("evt_1", 3);
    const submissions = Array.from({ length: 12 }, (_, index) => submitRsvp(ctx, `guest-${index}@example.com`, `203.0.113.${index}`));

    const responses = await Promise.all(submissions);
    const successCount = responses.filter((response) => response.status === 200).length;
    const capacityErrors = await Promise.all(responses.filter((response) => response.status === 409).map(readErrorBody));

    expect(successCount).toBe(3);
    expect(capacityErrors).toHaveLength(9);
    expect(capacityErrors.every((body) => body.error === CAPACITY_FULL_MESSAGE)).toBe(true);
  });

  it("rejects duplicate event and email RSVPs without relying on storage unique indexes", async () => {
    const ctx = storageContext("evt_1", 2);

    const firstResponse = await submitRsvp(ctx, "same@example.com", "203.0.113.11");
    const duplicateResponse = await submitRsvp(ctx, "same@example.com", "203.0.113.12");

    expect(firstResponse.status).toBe(200);
    expect(duplicateResponse.status).toBe(409);
    expect(await readErrorBody(duplicateResponse)).toEqual({ error: "duplicate RSVP" });
  });

  it("promotes the next waitlisted attendee when a confirmed attendee cancels", async () => {
    const ctx = memoryContext({
      "claim:evt_1:cancel%40example.com": { kind: "claim", eventId: "evt_1", email: "cancel@example.com", status: "confirmed" },
      "waitlist:evt_1": {
        kind: "waitlist",
        eventId: "evt_1",
        entries: [{ attendeeId: "att_wait", email: "wait@example.com", name: "Wait Guest", joinedAt: "2026-05-01T00:00:00.000Z" }],
      },
    });

    await afterSave({ collection: "dateline_attendees", content: { id: "att_cancel", event: "evt_1", email: "cancel@example.com", rsvpStatus: "cancelled" } }, ctx);

    expect(ctx.mocks.contentUpdate).toHaveBeenCalledWith("dateline_attendees", "att_wait", { rsvpStatus: "confirmed" });
    expect(ctx.mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "wait@example.com" }));
  });

  it("does not release capacity twice when a cancelled attendee is saved again", async () => {
    const ctx = memoryContext({
      "capacity:evt_1": { kind: "capacity", eventId: "evt_1", capacity: 1, remaining: 0 },
      "claim:evt_1:cancel%40example.com": { kind: "claim", eventId: "evt_1", email: "cancel@example.com", status: "confirmed" },
    });
    const cancelledContent = { id: "att_cancel", event: "evt_1", email: "cancel@example.com", rsvpStatus: "cancelled" };

    await afterSave({ collection: "dateline_attendees", content: cancelledContent }, ctx);
    await afterSave({ collection: "dateline_attendees", content: cancelledContent }, ctx);

    await expect(ctx.storage?.rsvps?.get("capacity:evt_1")).resolves.toMatchObject({ remaining: 1 });
    expect(ctx.mocks.contentUpdate).not.toHaveBeenCalled();
  });

  it("does not release capacity when a waitlisted attendee is cancelled", async () => {
    const ctx = memoryContext({
      "capacity:evt_1": { kind: "capacity", eventId: "evt_1", capacity: 1, remaining: 0 },
      "claim:evt_1:wait%40example.com": { kind: "claim", eventId: "evt_1", email: "wait@example.com", status: "waitlisted" },
    });

    await afterSave({ collection: "dateline_attendees", content: { id: "att_wait", event: "evt_1", email: "wait@example.com", rsvpStatus: "cancelled" } }, ctx);

    await expect(ctx.storage?.rsvps?.get("capacity:evt_1")).resolves.toMatchObject({ remaining: 0 });
    expect(ctx.mocks.contentUpdate).not.toHaveBeenCalled();
  });

  it("sends confirmation email through ctx.email.send from the save hook", async () => {
    const ctx = memoryContext();

    await afterSave({
      collection: "dateline_attendees",
      content: { id: "att_1", event: "evt_1", email: "a@example.com", name: "A Guest", rsvpStatus: "confirmed" },
    }, ctx);

    expect(ctx.mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "a@example.com", subject: "RSVP confirmed" }));
  });

  it("registers cron schedule during install and activation when cron is available", async () => {
    const ctx = memoryContext();
    const scheduleMock = vi.fn().mockResolvedValue(undefined);
    ctx.cron = { schedule: scheduleMock };

    await install({}, ctx);
    await activate({}, ctx);

    expect(scheduleMock).toHaveBeenCalledTimes(4);
    expect(scheduleMock).toHaveBeenCalledWith("dateline-rsvp-waitlist-sweep", { schedule: "*/5 * * * *" });
    expect(scheduleMock).toHaveBeenCalledWith("dateline-rsvp-hold-expiry", { schedule: "*/5 * * * *" });
    await expect(activate({}, { ...ctx, cron: undefined })).resolves.toBeUndefined();
  });

  it("caps hold expirations per cron invocation to stay within the subrequest budget", async () => {
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    const holds = Object.fromEntries(
      Array.from({ length: MAX_CRON_HOLD_EXPIRATIONS + 2 }, (_, index) => [
        `hold:evt_1:guest-${index}@example.com`,
        { kind: "hold", eventId: "evt_1", email: `guest-${index}@example.com`, expiresAt: expiredAt, status: "active" },
      ]),
    );
    const ctx = memoryContext(holds);

    await cron({ name: "dateline-rsvp-hold-expiry" }, ctx);

    const resolved = await Promise.all(
      Object.keys(holds).map(async (id) => (await ctx.storage?.rsvps?.get(id) as { status?: string } | null)?.status),
    );
    expect(resolved.filter((status) => status === "expired")).toHaveLength(MAX_CRON_HOLD_EXPIRATIONS);
  });

  it("renders valid Block Kit admin pages and accepts waitlist joins", async () => {
    const ctx = memoryContext();
    const response = await waitlistJoin({ request: jsonRequest("/waitlist", { eventId: "evt_1", email: "wait@example.com", name: "Wait" }), ctx });

    expect(response.status).toBe(200);
    expect(validateBlocks(adminHandlers.attendees().blocks).valid).toBe(true);
    expect(validateBlocks(adminHandlers.waitlist().blocks).valid).toBe(true);
  });
});

function submitRsvp(ctx: RsvpContext, email: string, ipAddress: string): Promise<Response> {
  return rsvpSubmit({ request: jsonRequest("/rsvp-submit", { eventId: "evt_1", email, name: "Guest" }, ipAddress), ctx });
}

function jsonRequest(path: string, body: unknown, ip = "198.51.100.7"): Request {
  return new Request(`https://example.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  });
}

async function readErrorBody(response: Response): Promise<{ error: string }> {
  return response.json() as Promise<{ error: string }>;
}

function memoryContext(initialRecords: Record<string, Record<string, unknown>> = {}): TestRsvpContext {
  const records = new Map<string, { id: string; data: unknown }>([
    ["capacity:evt_1", { id: "capacity:evt_1", data: { kind: "capacity", eventId: "evt_1", remaining: 100 } }],
    ...Object.entries(initialRecords).map(([id, data]) => [id, { id, data }] as const),
  ]);
  const contentUpdate = vi.fn((collection: string, id: string, content: unknown) => Promise.resolve({ collection, id, content }));
  const emailSend = vi.fn((message: unknown) => Promise.resolve(message));
  const ctx: TestRsvpContext = {
    storage: {
      rsvps: {
        get: vi.fn((id: string) => yieldThen(() => records.get(id)?.data ?? null)),
        put: vi.fn((id: string, data: unknown) => yieldThen(() => {
          records.set(id, { id, data });
        })),
        query: vi.fn((options?: { where?: { kind?: string } }) => yieldThen(() => ({
          items: Array.from(records.values()).filter((entry) => matchesKind(entry.data, options?.where?.kind)),
        }))),
        count: vi.fn(() => yieldThen(() => records.size)),
      },
    },
    content: {
      create: vi.fn((collection: string, content: Record<string, unknown>) => Promise.resolve({ collection, content, id: "att_created" })),
      update: contentUpdate,
      list: vi.fn(() => Promise.resolve({ items: [] })),
    },
    email: { send: emailSend },
    mocks: { contentUpdate, emailSend },
  };
  return ctx;
}

function storageContext(eventId: string, capacity: number): TestRsvpContext {
  return memoryContext({ [`capacity:${eventId}`]: { kind: "capacity", eventId, remaining: capacity } });
}

function matchesKind(data: unknown, kind?: string): boolean {
  if (!kind) return true;
  return typeof data === "object" && data !== null && "kind" in data && (data as { kind?: unknown }).kind === kind;
}

function yieldThen<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(() => Promise.resolve().then(operation));
}
