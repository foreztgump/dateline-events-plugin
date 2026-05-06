const HTTP_BAD_REQUEST = 400;
const HTTP_SEE_OTHER = 303;

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const form = await request.formData();
    const eventId = formValue(form, "event", "unknown-event");
    return redirectToConfirmation(eventId);
  } catch (error) {
    return invalidFormResponse(error);
  }
}

function redirectToConfirmation(eventId: string): Response {
  return new Response(null, {
    status: HTTP_SEE_OTHER,
    headers: { location: `/rsvp-confirmed?event=${encodeURIComponent(eventId)}` },
  });
}

function formValue(form: FormData, key: string, fallback: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : fallback;
}

function invalidFormResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Invalid form data";
  return new Response(message, { status: HTTP_BAD_REQUEST });
}
