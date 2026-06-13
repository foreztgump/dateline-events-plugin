#!/usr/bin/env node
// Bundle a sandboxed plugin's runtime entry (dist/plugin.mjs) into a single
// self-contained module.
//
// WHY: `emdash-plugin build` runs the entry through tsdown with `external: []`,
// but tsdown still auto-externalizes the package's own `dependencies`. That
// leaves bare specifiers (e.g. `@dateline/blocks`, `@dateline/recurring`,
// `zod`, `ical.js`) in dist/plugin.mjs. The workerd sandbox runner embeds ONLY
// that single file plus an `emdash` shim as worker modules, so any surviving
// bare import fails at isolate startup with `No such module "..."` — which
// surfaces as a transient Astro UnhandledRejection overlay on the first core
// admin/Block Kit route invocation. Re-bundling here inlines every dependency
// except `emdash` (provided by the runner shim) and Node builtins.
//
// Usage: run from a plugin package directory (cwd) after `emdash-plugin build`.
//   node ../../tools/bundle-sandbox-plugin.mjs

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ENTRY = resolve(process.cwd(), "dist/plugin.mjs");

if (!existsSync(ENTRY)) {
  console.error(`[bundle-sandbox-plugin] No dist/plugin.mjs in ${process.cwd()}. Run \`emdash-plugin build\` first.`);
  process.exit(1);
}

// Resolve esbuild from the plugin package's own dependency tree.
const require = createRequire(`${process.cwd()}/`);
const { build } = await import(require.resolve("esbuild"));

await build({
  entryPoints: [ENTRY],
  outfile: ENTRY,
  allowOverwrite: true,
  bundle: true,
  format: "esm",
  // workerd is a browser-like Worker runtime; resolve package "module"/"main"
  // fields under the worker/import conditions so deps like rrule resolve.
  platform: "browser",
  conditions: ["worker", "import", "default"],
  mainFields: ["module", "main"],
  // `emdash` is injected by the sandbox runner as an embedded worker module;
  // node: builtins are provided via the runner's nodejs_compat flag.
  external: ["emdash", "node:*"],
  minify: true,
  legalComments: "none",
});

console.log(`[bundle-sandbox-plugin] Bundled ${ENTRY} (self-contained for workerd).`);
