import { afterEach, describe, expect, it, vi } from "vitest";

const fridayMeetup = {
  id: "evt-friday",
  slug: "friday-meetup",
  title: "Friday Meetup RSVP Night",
};

vi.mock("../../lib/events.js", () => ({
  loadSeedEvents: () => Promise.resolve([fridayMeetup]),
}));
const { rsvpSubmitMock } = vi.hoisted(() => ({
  rsvpSubmitMock: vi.fn<(input: { request: Request; ctx: unknown }) => Promise<Response>>(),
}));

vi.mock("@dateline/rsvp/routes", () => ({
  rsvpSubmit: rsvpSubmitMock,
}));

vi.mock("emdash", () => ({
  PluginStorageRepository: vi.fn(function PluginStorageRepository() {
    return { get: vi.fn(), put: vi.fn(), query: vi.fn(), count: vi.fn() };
  }),
}));

vi.mock("emdash/runtime", () => ({
  getDb: () => Promise.resolve({}),
}));

vi.mock("../../../plugins/mock-email/plugin.mjs", () => ({
  captureMessage: vi.fn(),
}));

import { POST } from "./rsvp.js";

describe("reference RSVP API proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    rsvpSubmitMock.mockReset();
  });

  it("returns 422 for invalid email before calling the plugin route", async () => {
    const response = await POST({ request: formRequest({ event: "friday-meetup", name: "Guest", email: "not-an-email" }) });

    expect(response.status).toBe(422);
    expect(rsvpSubmitMock).not.toHaveBeenCalled();
  });

  it("posts normalized JSON to the RSVP plugin route and redirects to an event-named confirmation", async () => {
    rsvpSubmitMock.mockResolvedValue(Response.json({ ok: true }));

    const response = await POST({ request: formRequest({ event: "friday-meetup", name: "Guest", email: "guest@example.com" }) });

    expect(rsvpSubmitMock).toHaveBeenCalledTimes(1);
    const routeCall = rsvpSubmitMock.mock.calls[0];
    expect(routeCall).toBeDefined();
    const pluginRequest = routeCall?.[0].request ?? new Request("http://127.0.0.1:4321/unreachable");
    expect(pluginRequest).toBeInstanceOf(Request);
    await expect(pluginRequest.json()).resolves.toEqual({
      eventId: "evt-friday",
      email: "guest@example.com",
      name: "Guest",
      eventTitle: "Friday Meetup RSVP Night",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/rsvp-confirmed?event=friday-meetup&title=Friday+Meetup+RSVP+Night&email=guest%40example.com");
  });

  it("returns the plugin status when capacity is exhausted", async () => {
    rsvpSubmitMock.mockResolvedValue(Response.json({ error: "capacity full" }, { status: 409 }));

    const response = await POST({ request: formRequest({ event: "friday-meetup", name: "Guest", email: "guest@example.com" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "capacity full" });
  });

  it("returns 500 when the plugin route throws an unexpected error (server fault, not 422)", async () => {
    rsvpSubmitMock.mockRejectedValue(new Error("storage offline"));

    const response = await POST({ request: formRequest({ event: "friday-meetup", name: "Guest", email: "guest@example.com" }) });

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error?: unknown };
    expect(typeof body.error).toBe("string");
  });
});

function formRequest(fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields);
  return new Request("http://127.0.0.1:4321/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}
