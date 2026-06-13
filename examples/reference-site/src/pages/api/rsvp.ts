import { PluginStorageRepository } from "emdash";
import { getDb } from "emdash/runtime";
import { rsvpSubmit } from "@dateline/rsvp/routes";
import { captureMessage } from "../../../plugins/mock-email/plugin.mjs";
import { loadSeedEvents } from "../../lib/events.js";

const HTTP_SEE_OTHER = 303;
const HTTP_OK = 200;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const HTTP_INTERNAL_ERROR = 500;
const INTERNAL_ERROR_MESSAGE = "Something went wrong handling your RSVP. Please try again.";

/** Client-side form/validation failure (4xx). Distinct from server faults (5xx). */
class RsvpFormError extends Error {}
const RSVP_PLUGIN_ID = "dateline-rsvp";
const RSVP_STORAGE_COLLECTION = "rsvps";
const RSVP_STORAGE_INDEXES = ["kind", "eventId", "email", "status", "expiresAt"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EventReference {
  id: string;
  slug: string;
  title: string;
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const form = parseRsvpForm(await request.formData());
    const event = await resolveEvent(form.event);
    const pluginResponse = await submitToRsvpPlugin(request, form, event);
    if (pluginResponse.status !== HTTP_OK) return jsonResponse(pluginResponse.status, pluginResponse.body);
    return redirectToConfirmation(event, form.email);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Endpoint choice: keep legacy `/api/rsvp` as a same-origin proxy for stable
 * forms and human-friendly redirects, while all writes go through the live
 * `@dateline/rsvp` route handler (`dateline-rsvp/rsvp-submit`) with the same
 * storage and mock-email context that EmDash provides to the sandboxed plugin.
 */
async function submitToRsvpPlugin(
  request: Request,
  form: RsvpForm,
  event: EventReference,
): Promise<{ status: number; body: unknown }> {
  const pluginRequest = new Request(new URL(`/_emdash/api/plugins/${RSVP_PLUGIN_ID}/rsvp-submit`, request.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": `reference-rsvp:${form.email.toLowerCase()}`,
    },
    body: JSON.stringify({ eventId: event.id, email: form.email, name: form.name, eventTitle: event.title }),
  });
  const response = await rsvpSubmit({ request: pluginRequest, ctx: await createRsvpContext() });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function createRsvpContext() {
  const db = await getDb();
  const storage = new PluginStorageRepository(db, RSVP_PLUGIN_ID, RSVP_STORAGE_COLLECTION, RSVP_STORAGE_INDEXES);
  return {
    storage: { rsvps: storage },
    email: {
      send: (message: { to: string; subject: string; text: string; html?: string }) => {
        captureMessage({ source: RSVP_PLUGIN_ID, message });
        return Promise.resolve();
      },
    },
    log: {
      warn: (message: string, metadata?: Record<string, unknown>) => console.warn(message, metadata),
    },
  };
}

interface RsvpForm {
  event: string;
  name: string;
  email: string;
}

function parseRsvpForm(form: FormData): RsvpForm {
  const event = formValue(form, "event");
  const name = formValue(form, "name");
  const email = formValue(form, "email");
  if (!event || !name || !EMAIL_PATTERN.test(email)) throw new RsvpFormError("Event, name, and a valid email are required.");
  return { event, name, email };
}

function formValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function resolveEvent(eventValue: string): Promise<EventReference> {
  const event = (await loadSeedEvents()).find((candidate) => candidate.id === eventValue || candidate.slug === eventValue);
  if (!event) throw new RsvpFormError(`Unknown RSVP event: ${eventValue}`);
  return { id: event.id, slug: event.slug ?? event.id, title: event.title };
}

function redirectToConfirmation(event: EventReference, email: string): Response {
  const params = new URLSearchParams({ event: event.slug, title: event.title, email });
  return new Response(null, {
    status: HTTP_SEE_OTHER,
    headers: { location: `/rsvp-confirmed?${params.toString()}` },
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

function errorResponse(error: unknown): Response {
  // Validation/form errors are client faults (422); anything else (storage,
  // plugin route, unexpected throw) is a server fault (500) — don't mask it.
  if (error instanceof RsvpFormError) return Response.json({ error: error.message }, { status: HTTP_UNPROCESSABLE_ENTITY });
  console.error("RSVP proxy failed", { error: String(error) });
  return Response.json({ error: INTERNAL_ERROR_MESSAGE }, { status: HTTP_INTERNAL_ERROR });
}
