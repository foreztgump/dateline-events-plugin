/**
 * Mock email transport plugin descriptor (default export).
 *
 * Passed into `emdash({ plugins: [mockEmail] })` as a default import (NOT a
 * factory call), matching the Dateline sandboxed-plugin convention. Runs
 * TRUSTED in-process (needs Node fs to write the capture log), so it lives in
 * `plugins: []`, not `sandboxed: []`.
 *
 * `format: "standard"` so EmDash wraps the `{ hooks }` definition via
 * `adaptSandboxEntry`. The `entrypoint` resolves to the sibling runtime file.
 */
import { fileURLToPath } from "node:url";

export const MOCK_EMAIL_PLUGIN_ID = "dateline-mock-email";

const descriptor = {
  id: MOCK_EMAIL_PLUGIN_ID,
  version: "0.1.0",
  format: "standard",
  entrypoint: fileURLToPath(new URL("./plugin.mjs", import.meta.url)),
  capabilities: ["hooks.email-transport:register"],
  allowedHosts: [],
  storage: {},
};

export default descriptor;
