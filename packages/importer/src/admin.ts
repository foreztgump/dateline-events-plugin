import { assertResponse, blocks, elements } from "@dateline/blocks";
import type { AdminHandlers } from "./types.js";

export const adminHandlers: AdminHandlers = {
  settings: () => settingsPage(),
  tec: () => importPage("TEC migration", "Upload a TEC JSON dump and preview Dateline rows before creating content."),
  ical: () => importPage("iCal import", "Import from a whitelisted ICS URL or pasted calendar data."),
  csv: () => csvPage(),
  json: () => importPage("JSON import", "Import a Dateline-shaped JSON array with sourceId values."),
};

function settingsPage() {
  return assertResponse({
    blocks: [
      blocks.header("Dateline Importer Settings"),
      blocks.form({
        fields: [elements.textInput("allowedHosts", "Allowed iCal source hosts", { placeholder: "calendar.example.com" })],
        submit: { text: "Save whitelist", actionId: "dateline.importer.settings.save" },
      }),
    ],
  });
}

function importPage(title: string, description: string) {
  return assertResponse({
    blocks: [
      blocks.header(title),
      blocks.section(description),
      blocks.actions([elements.button("dateline.importer.dryRun", "Run dry-run preview", { style: "primary" })]),
    ],
  });
}

function csvPage() {
  return assertResponse({
    blocks: [
      blocks.header("CSV import"),
      blocks.section("CSV field mapping is required so legacy columns map explicitly into Dateline event fields."),
      blocks.form({
        fields: [
          elements.textInput("titleColumn", "Title column", { initialValue: "title" }),
          elements.textInput("startColumn", "Start column", { initialValue: "start" }),
          elements.textInput("endColumn", "End column", { initialValue: "end" }),
          elements.textInput("timezoneColumn", "Timezone column", { initialValue: "timezone" }),
        ],
        submit: { text: "Preview mapped CSV", actionId: "dateline.importer.csv.preview" },
      }),
    ],
  });
}
