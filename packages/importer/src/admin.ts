import { assertResponse, blocks, elements } from "@dateline/blocks";
import type { AdminHandlers } from "./types.js";

export const adminHandlers: AdminHandlers = {
  settings: () => settingsPage(),
  tec: () => importPage("TEC migration", "Upload a TEC JSON dump or remote export URL and import Dateline rows.", "dateline.importer.tec.import"),
  ical: () => importPage("iCal import", "Import feeds now from an operator-provided ICS URL or pasted calendar data.", "dateline.importer.ical.import"),
  csv: () => csvPage(),
  json: () => importPage("JSON import", "Import feeds now from a Dateline-shaped JSON array or remote JSON URL with sourceId values.", "dateline.importer.json.import"),
};

function settingsPage() {
  return assertResponse({
    blocks: [
      blocks.header("Dateline Importer Settings"),
      blocks.section("Remote imports use unrestricted network access so operators can enter feed URLs that are not known at install time. Only grant this plugin to trusted site administrators."),
      blocks.form({
        fields: [elements.textInput("operatorConsent", "Unrestricted network consent note", { placeholder: "Document your internal approval or runbook link" })],
        submit: { text: "Save consent note", actionId: "dateline.importer.settings.save" },
      }),
    ],
  });
}

function importPage(title: string, description: string, actionId: string) {
  return assertResponse({
    blocks: [
      blocks.header(title),
      blocks.section(description),
      blocks.actions([elements.button(actionId, "Import feeds now", { style: "primary" })]),
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
        submit: { text: "Import mapped CSV", actionId: "dateline.importer.csv.import" },
      }),
    ],
  });
}
