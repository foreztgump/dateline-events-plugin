import { assertResponse, blocks, elements } from "@dateline/blocks";
import type { AdminHandlers } from "./types.js";

export const adminHandlers: AdminHandlers = {
  events: () => adminPage("Events", "Manage events, recurrences, status, and x402 metadata."),
  venues: () => adminPage("Venues", "Manage reusable physical locations and map settings."),
  organizers: () => adminPage("Organizers", "Manage organizer profiles, bios, and social links."),
  settings: () => settingsPage(),
};

function adminPage(title: string, description: string) {
  return assertResponse({
    blocks: [
      blocks.header(`Dateline ${title}`),
      blocks.section(description),
      blocks.actions([elements.button(`dateline.${title.toLowerCase()}.create`, `Create ${title.slice(0, -1)}`, { style: "primary" })]),
    ],
  });
}

function settingsPage() {
  return assertResponse({
    blocks: [
      blocks.header("Dateline Settings"),
      blocks.form({
        fields: [
          elements.textInput("defaultTimezone", "Default timezone", { initialValue: "UTC" }),
          elements.textInput("currency", "Currency", { initialValue: "USD" }),
          elements.secretInput("x402Wallet", "x402 wallet address"),
        ],
        submit: { label: "Save settings", actionId: "dateline.settings.save" },
      }),
    ],
  });
}
