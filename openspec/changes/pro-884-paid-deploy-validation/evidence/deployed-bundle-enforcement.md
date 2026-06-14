# Deployed-bundle enforcement evidence — PRO-884

All excerpts below are from the **actually-deployed worker artifact**, not `node_modules`:

```
examples/reference-site/dist/server/virtual_astro_middleware.mjs
```

This is the file `wrangler deploy` uploaded (Version `c90cb134-35df-4abc-a739-fb488c26eeb4`,
`https://dateline-reference-site.networkreef-dev.workers.dev`). The Cloudflare sandbox runner
(`@emdash-cms/cloudflare@0.18.0`) is inlined into it, so these are the exact code paths that run
on the Paid account.

> **On line numbers:** the runner code is vendored verbatim from
> `@emdash-cms/cloudflare@0.18.0`, so its excerpts and line numbers are **byte-stable** across
> rebuilds (the runner section sits at the same offsets whether or not the temporary probe was
> bundled). The line numbers below were re-confirmed against the current reproducible build (after
> the temporary probe wiring was reverted — see `tasks.md` 9.3). Two references are explicitly
> annotated where the as-deployed (probe-included) build differed: the sandbox bail-out and the
> probe-code location.

Reproduce (current tree):
```bash
cd examples/reference-site/dist/server
grep -n "globalOutbound\|BRIDGE: bridgeBinding\|subRequests\|isAvailable() {\|PluginBridge not available" \
  virtual_astro_middleware.mjs
```

---

## 1. Per-isolate construction — the only binding is BRIDGE; direct egress is blocked

`CloudflareSandboxedPlugin.createWorker()` (deployed bundle lines 483–502):

```js
const loaderLimits = {
  cpuMs: this.limits.cpuMs,
  subRequests: this.limits.subrequests
};
return this.loader.get(this.id, () => ({
  compatibilityDate: "2026-04-01",
  mainModule: "plugin.js",
  modules: {
    "plugin.js": { js: this.wrapperCode },
    "sandbox-plugin.js": { js: this.code }
  },
  globalOutbound: null,                 // ← no direct network egress from the isolate
  limits: loaderLimits,                 // ← cpuMs + subRequests passed to Worker Loader
  env: {
    PLUGIN_ID: this.manifest.id,
    PLUGIN_VERSION: this.manifest.version || "0.0.0",
    BRIDGE: bridgeBinding               // ← the ONLY binding; no DB / R2 / KV reach the isolate
  }
}));
```

**Boundary proven by construction:** a sandboxed plugin's V8 isolate receives no DB, R2, or KV
binding — only `BRIDGE` (a loopback to the host-side `PluginBridge`). `globalOutbound: null`
means the isolate cannot make arbitrary outbound fetches; all network goes through the bridge,
which enforces `network:request` + host allowlist.

## 2. Resource limits — default values and where each is enforced

`DEFAULT_LIMITS` (deployed bundle lines 369–374):

```js
const DEFAULT_LIMITS = {
  cpuMs: 50,
  memoryMb: 128,
  subrequests: 10,
  wallTimeMs: 3e4          // 30s
};
```

Enforcement points (deployed bundle):
- **cpuMs (50ms)** and **subrequests (10)** → passed into `loader.get(... limits ...)`; enforced by
  Worker Loader at the V8 isolate level (lines 483–485, 494–495).
- **wallTimeMs (30s)** → enforced by the runner via `withWallTimeLimit(...)` wrapping every
  hook/route invocation (lines 528–545: *"CPU and subrequest limits are enforced by Worker
  Loader. Wall-time is enforced here."*).
- **memoryMb (128)** → present in `DEFAULT_LIMITS` and merged by `resolveLimits()` (lines 381–388)
  but **never passed to `loader.get`** (only `cpuMs` + `subRequests` are). Worker Loader exposes
  no per-worker memory option. The ~128MB ceiling is a V8 platform limit, not a configured,
  per-plugin enforced limit. **This is the headline gap vs. the documented spec and is identical
  to the local-workerd gap.**

## 3. Capability boundary — undeclared capabilities are absent from `ctx`

`generatePluginWrapper()` (deployed bundle lines 173–174, 286–294) bakes capability presence into
the generated wrapper **at load time**:

```js
const hasReadUsers = capabilities.includes("users:read");
const hasEmailSend = capabilities.includes("email:send");
// ...
// User access - proxies to bridge (capability enforced by bridge)
const users = ${hasReadUsers} ? { get, getByEmail, list } : undefined;

// Email access - proxies to bridge (capability enforced by bridge)
const email = ${hasEmailSend} ? { send } : undefined;
```

So a plugin that does not declare `users:read` literally gets `ctx.users === undefined`; one that
does not declare `email:send` gets `ctx.email === undefined`. `content`, `media`, and `http` are
always wired as bridge proxies, but the **host-side bridge** re-checks the capability and throws
`Missing capability: <cap>` before touching DB/R2/network (see `node_modules` source
`@emdash-cms/cloudflare/dist/sandbox/index.mjs` lines 167–168, 406–521 — the `PluginBridge`
methods each begin with `if (!capabilities.includes("..."))  throw new Error("Missing capability: ...")`).

> Note: in the deployed artifact the `PluginBridge` class body (and its `Missing capability:` throws)
> is **tree-shaken out** — see §4 — precisely because nothing exports/wires it. The capability
> checks therefore live in the runner source under `node_modules`; on a correctly-wired deploy they
> would be present in the bundle. Two-layer boundary: (1) `ctx` surface omits undeclared optional
> capabilities at wrapper-gen time; (2) the host bridge enforces every capability at call time.

## 4. Why live plugin routes return 404 on this deploy (root cause → PRO-909)

`isAvailable()` and the load guard (deployed bundle lines 375–432):

```js
function getLoader()       { return env.LOADER; }
function getPluginBridge() { return _exports.PluginBridge; }
// ...
isAvailable() {
  return !!getLoader() && !!getPluginBridge();
}
// ...
if (!loader)       throw new Error("Worker Loader not available. Add worker_loaders binding to wrangler config.");
if (!pluginBridge) throw new Error("PluginBridge not available. Export PluginBridge from your worker entrypoint.");
```

Sandbox load is skipped silently when the runner isn't available (current build line 1186; line
1199 in the as-deployed probe-included build — the guard text is identical):

```js
if (!sandboxRunner || !sandboxRunner.isAvailable()) return;
```

The deployed `entry.mjs` exports **only `default`** — no `PluginBridge`:

```bash
$ tail -6 examples/reference-site/dist/server/entry.mjs
import { w } from "./chunks/worker-entry_CFLMCcS_.mjs";
export {
  w as default
};

$ grep -c "class PluginBridge\|Missing capability:" examples/reference-site/dist/server/virtual_astro_middleware.mjs
0      # PluginBridge tree-shaken out — confirms it is never wired/exported
```

(This count is `0` in both the as-deployed probe-included build and the current probe-reverted
build: `PluginBridge` is dropped because nothing imports/exports it, independent of the probe.)

So `getPluginBridge()` returns `undefined` → `isAvailable()` is false → the sandbox never loads →
`sandboxedPlugins` is empty → `getPluginRouteMeta` returns null → the catch-all route responds
**404** (a loaded-but-private route would respond 403). Verified live:

```
POST /_emdash/api/plugins/dateline-rsvp/submit            → HTTP 404
POST /_emdash/api/plugins/dateline-platform-probe/dump-ctx → HTTP 404
```

The fix (re-export `PluginBridge` DO from a custom worker entrypoint + add `durable_objects`
binding + `new_sqlite_classes` migration) is tracked in **PRO-909**. Live probe calls
(`dump-ctx`, `limits`) are therefore **blocked pending PRO-909** and will be exercised on the
upcoming production website deploy.
