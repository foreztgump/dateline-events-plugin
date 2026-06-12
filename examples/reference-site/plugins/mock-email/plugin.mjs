/**
 * Mock email transport runtime plugin (hooks).
 *
 * Registers the EXCLUSIVE `email:deliver` hook (capability
 * `hooks.email-transport:register`). Every delivered message is appended as a
 * single JSON line to the observation log so dev/e2e flows can assert that an
 * RSVP produced exactly one confirmation email.
 *
 * Observation channel: `examples/reference-site/.emdash-dev/mock-email.log`
 * (one JSON object per line: { sentAt, source, to, subject, text }).
 * Documented in {missionDir}/library/user-testing.md for validators.
 *
 * This file is the plugin DEFINITION ({ hooks }). The matching descriptor
 * (identity + capabilities + entrypoint) is the default export of `index.mjs`.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../.emdash-dev/mock-email.log");

export function captureMessage(event) {
  try {
    const { message, source } = event;
    const entry = {
      sentAt: new Date().toISOString(),
      source,
      to: message.to,
      subject: message.subject,
      text: message.text,
    };
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf-8");
    console.log(`[mock-email] captured delivery to ${message.to} (subject: ${message.subject})`);
  } catch (error) {
    console.error("[mock-email] failed to capture delivery", error);
  }
}

const plugin = {
  hooks: {
    "email:deliver": {
      exclusive: true,
      handler: async (event) => {
        captureMessage(event);
      },
    },
  },
};

export default plugin;
export { LOG_PATH };
