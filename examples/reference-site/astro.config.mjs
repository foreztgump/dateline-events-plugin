import node from "@astrojs/node";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Sandboxed Dateline plugins are passed as DEFAULT IMPORTS (auto-generated
// descriptors from `emdash-plugin build`), NOT factory calls. See
// architecture.md §Reference site and VERIFIED-PLATFORM-0.18.md.
import core from "@dateline/core";
import importer from "@dateline/importer";
import rsvp from "@dateline/rsvp";

// Trusted dev-only mock email transport: registers the exclusive
// `email:deliver` hook and captures every message to an observable log file.
import mockEmail from "./plugins/mock-email/index.mjs";

const isVitest = process.env.VITEST === "true";

export default defineConfig({
  output: isVitest ? "static" : "server",
  adapter: isVitest ? undefined : node({ mode: "standalone" }),
  integrations: isVitest
    ? []
    : [
        emdash({
          database: sqlite({ url: "file:./data.db" }),
          storage: local({
            directory: "./uploads",
            baseUrl: "/_emdash/api/media/file",
          }),
          // Trusted in-process dev plugins (mock email transport for RSVP).
          plugins: [mockEmail],
          // Sandboxed Dateline plugins (default imports, run via workerd).
          sandboxed: [core, rsvp, importer],
          sandboxRunner: "@emdash-cms/sandbox-workerd",
        }),
      ],
  vite: {
    ssr: {
      noExternal: ["@dateline/views", "@dateline/core"],
    },
  },
});
