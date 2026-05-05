import { assertResponse, blocks, elements } from "@dateline/blocks";
import type { AdminHandlers } from "./types.js";

export const adminHandlers: AdminHandlers = {
  attendees: () => attendeesPage(),
  waitlist: () => waitlistPage(),
};

function attendeesPage() {
  return assertResponse({
    blocks: [
      blocks.header("Dateline RSVP Attendees"),
      blocks.section("Review confirmed, waitlisted, cancelled, and checked-in attendees."),
      blocks.table({
        columns: [
          { key: "name", text: "Name" },
          { key: "email", text: "Email" },
          { key: "status", text: "Status", format: "badge" },
        ],
        rows: [],
        pageActionId: "dateline.rsvp.attendees.page",
        emptyText: "No attendees match the current filters.",
      }),
      blocks.actions([elements.button("dateline.rsvp.cancel", "Cancel attendee", { style: "danger" })]),
    ],
  });
}

function waitlistPage() {
  return assertResponse({
    blocks: [
      blocks.header("Dateline RSVP Waitlist"),
      blocks.section("View queued attendees and manually promote the next guest when capacity opens."),
      blocks.table({
        columns: [
          { key: "name", text: "Name" },
          { key: "email", text: "Email" },
          { key: "joinedAt", text: "Joined", format: "relative_time" },
        ],
        rows: [],
        pageActionId: "dateline.rsvp.waitlist.page",
        emptyText: "The waitlist is empty.",
      }),
      blocks.actions([elements.button("dateline.rsvp.promote", "Promote next", { style: "primary" })]),
    ],
  });
}
