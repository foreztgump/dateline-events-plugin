import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
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
// DEPLOY_TARGET=cloudflare swaps the host adapter and EmDash backends to the
// Cloudflare path (Workers + D1 + R2 + Dynamic Worker Loader sandbox). The
// default path is Node + sqlite + local storage + the workerd local sandbox
// runner, used for `astro dev`, the Playwright e2e suite, and `wrangler dev`
// preview of the node build. Bindings (DB/MEDIA/LOADER) live in wrangler.jsonc.
const isCloudflare = process.env.DEPLOY_TARGET === "cloudflare";

// EmDash integration config differs only in its database/storage/sandbox
// backends; plugins and the trusted mock-email transport are identical.
const emdashConfig = isCloudflare
  ? {
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      // The mock-email transport is a TRUSTED Node-fs plugin for dev/e2e only
      // (it writes a capture log via node:fs and import.meta.url). It cannot run
      // under the Cloudflare Workers runtime, so it is omitted here; a real
      // email:deliver transport is wired separately for production.
      plugins: [],
      sandboxed: [core, rsvp, importer],
      sandboxRunner: sandbox(),
    }
  : {
      database: sqlite({ url: "file:./data.db" }),
      storage: local({
        directory: "./uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
      plugins: [mockEmail],
      sandboxed: [core, rsvp, importer],
      sandboxRunner: "@emdash-cms/sandbox-workerd",
    };

function adapter() {
  if (isVitest) return undefined;
  return isCloudflare ? cloudflare() : node({ mode: "standalone" });
}

export default defineConfig({
  output: isVitest ? "static" : "server",
  adapter: adapter(),
  integrations: isVitest ? [] : [emdash(emdashConfig)],
  vite: {
    ssr: {
      noExternal: ["@dateline/views", "@dateline/core"],
    },
  },
});
