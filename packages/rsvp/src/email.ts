import { boundaryError, DatelineRsvpError } from "./errors.js";
import type { Attendee, RsvpContext } from "./types.js";

export function queueConfirmationEmail(ctx: RsvpContext, attendee: Attendee): void {
  if (!ctx.waitUntil) throw new DatelineRsvpError("WAIT_UNTIL_MISSING", "ctx.waitUntil is required for RSVP email.");
  ctx.waitUntil(sendConfirmationEmail(ctx, attendee).catch((error: unknown) => {
    ctx.log?.warn("RSVP confirmation email failed", { error: String(error) });
  }));
}

async function sendConfirmationEmail(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  try {
    await ctx.email?.send({
      to: attendee.email,
      subject: "RSVP confirmed",
      body: `Hi ${attendee.name}, your RSVP is confirmed.`,
    });
  } catch (error) {
    throw boundaryError("ctx.email.send(rsvp-confirmation)", error);
  }
}
