import { adminHandlers } from "./admin.js";
import { PLUGIN_ID, PLUGIN_VERSION } from "./constants.js";
import { afterSave } from "./hooks.js";
import { importCsv, importICal, importJson, importTec } from "./routes.js";

export { adminHandlers } from "./admin.js";
export { parseCsv } from "./csv.js";
export { parseICal } from "./ical.js";
export { importRows, mergeParseResults } from "./importer.js";
export { parseJsonEvents } from "./json.js";
export { migrateTecExport } from "./tec.js";
export type {
  AdminHandlers,
  CsvFieldMapping,
  DatelineEventDraft,
  ImportError,
  ImportParseResult,
  ImportRow,
  ImportSummary,
  ImporterContext,
  TecMigrationResult,
} from "./types.js";

const capabilities = ["content:read", "content:write", "network:request"];
const routeNames = ["admin/import/tec", "admin/import/ical", "admin/import/csv", "admin/import/json", "admin/import/settings"];

export default function createImporterPlugin() {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [...capabilities],
    allowedHosts: [],
    storage: {
      settings: {
        allowedHosts: [],
      },
    },
    hooks: {
      "content:afterSave": afterSave,
    },
    routes: routeNames,
    routeHandlers: {
      "admin/import/tec": importTec,
      "admin/import/ical": importICal,
      "admin/import/csv": importCsv,
      "admin/import/json": importJson,
      "admin/import/settings": adminHandlers.settings,
    },
    admin: {
      pages: [
        { path: "/dateline/import/tec", label: "TEC Import", icon: "download" },
        { path: "/dateline/import/ical", label: "iCal Import", icon: "calendar" },
        { path: "/dateline/import/csv", label: "CSV Import", icon: "table" },
      ],
    },
  };
}
