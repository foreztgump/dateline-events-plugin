import { boundaryError } from "./errors.js";
import type { Attendee, RsvpContext } from "./types.js";

export async function sendConfirmationEmail(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  if (!ctx.email?.send) throw new Error("ctx.email.send is required for RSVP confirmation email.");
  const eventName = attendee.eventTitle || attendee.event;
  try {
    await ctx.email.send({
      to: attendee.email,
      subject: "RSVP confirmed",
      text: `Hi ${attendee.name}, your RSVP for ${eventName} is confirmed.`,
    });
  } catch (error) {
    throw boundaryError("ctx.email.send(rsvp-confirmation)", error);
  }
}
