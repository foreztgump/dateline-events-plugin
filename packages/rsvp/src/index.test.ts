import { describe, expect, it, vi } from "vitest";
import { validateBlocks } from "@dateline/blocks";
import createRsvpPlugin, {
  activate,
  adminHandlers,
  afterSave,
  rsvpSubmit,
  waitlistJoin,
} from "./index.js";
import { CAPACITY_FULL_MESSAGE } from "./constants.js";
import type { RsvpContext } from "./types.js";

type TestRsvpContext = RsvpContext & {
  mocks: {
    contentUpdate: ReturnType<typeof vi.fn>;
    emailSend: ReturnType<typeof vi.fn>;
    waitUntil: ReturnType<typeof vi.fn>;
  };
};

describe("@dateline/rsvp", () => {
  it("declares the RSVP sandbox manifest", () => {
    const manifest = createRsvpPlugin();

    expect(manifest.id).toBe("dateline-rsvp");
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.capabilities).toEqual(["content:read", "content:write", "email:send"]);
    expect(manifest.routes).toEqual(expect.arrayContaining(["rsvp-submit", "waitlist", "admin/attendees", "admin/waitlist"]));
    expect(Object.keys(manifest.hooks)).toEqual(expect.arrayContaining(["content:afterSave", "plugin:activate", "cron"]));
  });

  it("allows exactly one concurrent RSVP for capacity-one events", async () => {
    const ctx = memoryContext({ "capacity:evt_1": 1 });
    const submissions = Array.from({ length: 10 }, (_, index) => submitRsvp(ctx, `guest-${index}@example.com`, `203.0.113.${index}`));

    const responses = await Promise.all(submissions);
    const successCount = responses.filter((response) => response.status === 200).length;
    const capacityErrors = await Promise.all(responses.filter((response) => response.status === 409).map(readErrorBody));

    expect(successCount).toBe(1);
    expect(capacityErrors).toHaveLength(9);
    expect(capacityErrors.every((body) => body.error === CAPACITY_FULL_MESSAGE)).toBe(true);
  });

  it("promotes the next waitlisted attendee when a confirmed attendee cancels", async () => {
    const ctx = memoryContext({ "waitlist:evt_1": JSON.stringify([{ attendeeId: "att_wait", joinedAt: "2026-05-01T00:00:00.000Z" }]) });

    await afterSave({ collection: "dateline_attendees", content: { id: "att_cancel", event: "evt_1", rsvpStatus: "cancelled" } }, ctx);

    expect(ctx.mocks.contentUpdate).toHaveBeenCalledWith("dateline_attendees", "att_wait", { rsvpStatus: "confirmed" });
    expect(ctx.mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });

  it("defers confirmation email through ctx.waitUntil", async () => {
    const ctx = memoryContext();

    await afterSave({
      collection: "dateline_attendees",
      content: { id: "att_1", event: "evt_1", email: "a@example.com", name: "A Guest", rsvpStatus: "confirmed" },
    }, ctx);

    expect(ctx.mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "a@example.com", subject: "RSVP confirmed" }));
    expect(ctx.mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });

  it("registers cron schedule and fails loudly if cron is unavailable", async () => {
    const ctx = memoryContext();
    const scheduleMock = vi.fn().mockResolvedValue(undefined);
    ctx.cron = { schedule: scheduleMock };

    await activate({}, ctx);

    expect(scheduleMock).toHaveBeenCalledWith("dateline-rsvp-waitlist-sweep", { schedule: "*/5 * * * *" });
    await expect(activate({}, { ...ctx, cron: undefined })).rejects.toThrow("CRON_UNAVAILABLE");
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

function memoryContext(initialKv: Record<string, unknown> = {}): TestRsvpContext {
  const kvStore = new Map(Object.entries(initialKv).map(([key, value]) => [key, String(value)]));
  const contentUpdate = vi.fn((collection: string, id: string, content: unknown) => Promise.resolve({ collection, id, content }));
  const emailSend = vi.fn((message: unknown) => Promise.resolve(message));
  const waitUntil = vi.fn((promise: Promise<unknown>) => { void promise.catch(() => undefined); });
  const ctx: TestRsvpContext = {
    kv: {
      get: vi.fn((key: string) => Promise.resolve(kvStore.get(key) ?? null)),
      put: vi.fn((key: string, value: string) => {
        kvStore.set(key, value);
        return Promise.resolve();
      }),
      delete: vi.fn((key: string) => {
        kvStore.delete(key);
        return Promise.resolve();
      }),
      atomicDecrement: vi.fn((key: string) => {
        const nextValue = Number(kvStore.get(key) ?? "0") - 1;
        kvStore.set(key, String(nextValue));
        return Promise.resolve(nextValue);
      }),
      atomicIncrement: vi.fn((key: string) => {
        const nextValue = Number(kvStore.get(key) ?? "0") + 1;
        kvStore.set(key, String(nextValue));
        return Promise.resolve(nextValue);
      }),
    },
    content: {
      create: vi.fn((collection: string, content: unknown) => Promise.resolve({ collection, content, id: "att_created" })),
      update: contentUpdate,
      list: vi.fn(() => Promise.resolve({ items: [] })),
    },
    email: { send: emailSend },
    waitUntil,
    mocks: { contentUpdate, emailSend, waitUntil },
  };
  return ctx;
}
