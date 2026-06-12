# VERIFIED-PLATFORM-0.18.md

EmDash platform probe for Dateline M0. All findings below are **VERIFIED-EMPIRICALLY** on Node `v22.21.0` with `emdash@0.18.0`, `@emdash-cms/plugin-cli@0.5.1`, and `@emdash-cms/sandbox-workerd@0.1.6`.

Probe code and raw evidence live in `tools/platform-probe/`. The probe package is nested at `tools/platform-probe/plugin`, so the root `tools/*` workspace glob does not include it in root recursive gates.

## Evidence commands

- **VERIFIED-EMPIRICALLY** `pnpm --dir tools/platform-probe/plugin build` exited `0`; exact output is in `tools/platform-probe/evidence/offline-build.log`.
- **VERIFIED-EMPIRICALLY** `pnpm --dir tools/platform-probe/plugin probe tools/platform-probe/evidence/probe-results.json` exited `0`; measured output is in `tools/platform-probe/evidence/probe-results.json`.
- **VERIFIED-EMPIRICALLY** `npm_config_offline=true ./node_modules/.bin/emdash-plugin init ... --yes --force` exited `0`; exact output is in `tools/platform-probe/evidence/offline-init.log`.
- **VERIFIED-EMPIRICALLY** `npm_config_offline=true ./node_modules/.bin/emdash-plugin validate` exited `0`; exact output is in `tools/platform-probe/evidence/offline-validate.log`.
- **VERIFIED-EMPIRICALLY** `npm_config_offline=true TMPDIR=./tmp ./node_modules/.bin/emdash-plugin build` exited `0`; exact output is in `tools/platform-probe/evidence/offline-build.log`.

## CLI init, validate, and build

- **VERIFIED-EMPIRICALLY** `emdash-plugin init` scaffolds seven files offline when run from an already installed local CLI:

```text
+ emdash-plugin.jsonc
+ package.json
+ tsconfig.json
+ .gitignore
+ README.md
+ src/plugin.ts
+ tests/plugin.test.ts
✔ Scaffolded 7 files in /home/cownose/projects/Dateline/tools/platform-probe/evidence/offline-init
[exit-code] 0
```

- **VERIFIED-EMPIRICALLY** `emdash-plugin validate` runs offline and accepts the probe manifest:

```text
✔ Manifest is valid: /home/cownose/projects/Dateline/tools/platform-probe/plugin/emdash-plugin.jsonc
[exit-code] 0
```

- **VERIFIED-EMPIRICALLY** `emdash-plugin build` runs offline when `TMPDIR=./tmp` keeps the probe import under the package directory. Without this tempdir, the CLI's probe import was emitted under `/tmp` and could not resolve package dependencies such as `zod`.

```text
Hooks: plugin:install, plugin:activate, content:beforeSave, content:afterSave, cron
Routes: dump-ctx, echo-zod, storage-kv, limits
✔ Plugin built: dateline-platform-probe@0.1.0
[exit-code] 0
```

## Type declaration shapes

- **VERIFIED-EMPIRICALLY** `node_modules/emdash/dist/plugin-types.d.mts` defines the sandboxed source export shape as:

```ts
interface HookHandlers {
  "plugin:install": LifecycleHandler;
  "plugin:activate": LifecycleHandler;
  "plugin:deactivate": LifecycleHandler;
  "plugin:uninstall": UninstallHandler;
  "content:beforeSave": ContentBeforeSaveHandler;
  "content:afterSave": ContentAfterSaveHandler;
  "content:beforeDelete": ContentBeforeDeleteHandler;
  "content:afterDelete": ContentAfterDeleteHandler;
  cron: CronHandler;
  "email:beforeSend": EmailBeforeSendHandler;
  "email:deliver": EmailDeliverHandler;
  "email:afterSend": EmailAfterSendHandler;
}
interface SandboxedPlugin {
  hooks?: { [K in keyof HookHandlers]?: HookEntry<K> };
  routes?: Record<string, RouteEntry>;
}
type RouteEntry = RouteHandler | {
  handler: RouteHandler;
  public?: boolean;
  input?: unknown;
};
```

- **VERIFIED-EMPIRICALLY** `node_modules/emdash/dist/types-DMwSpvcw.d.mts` defines storage, kv, cron, and route limits as:

```ts
interface StorageCollection<T = unknown> {
  get(id: string): Promise<T | null>;
  put(id: string, data: T): Promise<void>;
  query(options?: QueryOptions): Promise<PaginatedResult<{ id: string; data: T }>>;
  count(where?: WhereClause): Promise<number>;
}
interface KVAccess {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<Array<{ key: string; value: unknown }>>;
}
interface CronAccess {
  schedule(name: string, opts: { schedule: string; data?: Record<string, unknown> }): Promise<void>;
  cancel(name: string): Promise<void>;
  list(): Promise<CronTaskInfo[]>;
}
interface ResourceLimits {
  cpuMs?: number;      // default 50ms
  memoryMb?: number;   // default 128MB
  subrequests?: number; // default 10
  wallTimeMs?: number; // default 30000ms
}
```

## Runtime ctx surface

- **VERIFIED-EMPIRICALLY** the workerd route `dump-ctx` returned ctx keys:

```json
["content","email","http","kv","log","media","plugin","site","storage","url","users"]
```

- **VERIFIED-EMPIRICALLY** `ctx.kv` methods are exactly `delete`, `get`, `list`, `set`.
- **VERIFIED-EMPIRICALLY** `ctx.http.fetch` is present when the manifest declares `network:request:unrestricted`.
- **VERIFIED-EMPIRICALLY** `ctx.cron` was not present inside the sandbox-workerd route or hook ctx even though the d.ts marks `cron?: CronAccess`; `plugin:install` and `plugin:activate` still invoked successfully, but `ctx.cron?.schedule(...)` did not create `_emdash_cron_tasks` rows in this harness.
- **VERIFIED-EMPIRICALLY** `ctx.storage` existed but had no enumerable collection keys inside the workerd bridge. The declared `probe_records` collection was still callable through property access and storage operations succeeded.

## Hooks, lifecycle, cron, and routes

- **VERIFIED-EMPIRICALLY** `emdash-plugin build` probed and registered these hook ids from the real source: `plugin:install`, `plugin:activate`, `content:beforeSave`, `content:afterSave`, and `cron`.
- **VERIFIED-EMPIRICALLY** `content:beforeSave` received event keys `collection`, `content`, `isNew` and returned the modified content record shape accepted by the d.ts.
- **VERIFIED-EMPIRICALLY** `content:afterSave` received event keys `collection`, `content`, `isNew`.
- **VERIFIED-EMPIRICALLY** `cron` received event keys `name`, `data`, `scheduledAt`.
- **VERIFIED-EMPIRICALLY** the route with `zod` input (`echo-zod`) parsed `{ "message": "zod input parsed", "count": 2 }` and returned the parsed object.
- **VERIFIED-EMPIRICALLY** direct workerd loading of the CLI-built `dist/plugin.mjs` fails when that file imports `zod`; the probe harness bundled `src/plugin.ts` with `esbuild` so zod was embedded. `dist/plugin.mjs` contains `from"zod"`.

## Storage and KV semantics

- **VERIFIED-EMPIRICALLY** storage `put`, `get`, indexed `query`, non-indexed query rejection, and KV `get`/`set`/`delete`/`list` were exercised by the `storage-kv` route.
- **VERIFIED-EMPIRICALLY** indexed storage query on `kind` returned the inserted `primary-m0` record.
- **VERIFIED-EMPIRICALLY** non-indexed query failed with exact error:

```text
Bridge call storage/query failed: {"error":"Cannot query on non-indexed field 'note'."}
```

- **VERIFIED-EMPIRICALLY** `uniqueIndexes` conflict behavior in `@emdash-cms/sandbox-workerd@0.1.6` is not a conflict. Inserting a second document with the same `eventId` and `email` but a different document id succeeded:

```json
{
  "ok": true,
  "operation": "duplicate-unique-index-put",
  "details": {
    "message": "duplicate insert succeeded",
    "duplicate": {
      "eventId": "event-m0",
      "email": "dupe@example.com",
      "sequence": 2
    }
  }
}
```

- **VERIFIED-EMPIRICALLY** SQLite had no unique JSON-field index for `uniqueIndexes`; `sqlite_master` showed only `idx_plugin_storage_list` and `sqlite_autoindex__plugin_storage_1` for the primary key. `_plugin_indexes` was empty.
- **VERIFIED-EMPIRICALLY** M2 capacity design must not rely on `storage.uniqueIndexes` for event+attendee dedupe under the local workerd runner. Use explicit counter rows or application-level conflict checks with a concurrency test.

## workerd-runner limits

- **VERIFIED-EMPIRICALLY** `@emdash-cms/sandbox-workerd@0.1.6` prints this warning on startup:

```text
[emdash:workerd] cpuMs, memoryMb, and subrequests limits are not enforced by standalone workerd. Only wallTimeMs is enforced on the Node path. For full resource isolation, deploy on Cloudflare Workers.
```

| Resource | Cloudflare documented | workerd-runner measured | Evidence |
|---|---:|---:|---|
| CPU | 50 ms | No failure through 2000 ms busy loop | `limits.cpu.lastOkMs = 2000`, `firstFailure = null` |
| Subrequests | 10 | No failure through 15 public `ctx.http.fetch` calls | `limits.subrequests["15"].ok = true` |
| Wall clock | 30000 ms | 31000 ms rejected | `Plugin dateline-platform-probe exceeded wall-time limit of 30000ms during route:limits` |
| Memory | about 128 MB | No failure through 192 MB allocation | `limits.memory["192mb"].ok = true` |

- **VERIFIED-EMPIRICALLY** local listener fetches were blocked before counting: `Plugin "dateline-platform-probe": blocked fetch to "127.0.0.1": URLs targeting private IP addresses are not allowed`.
- **VERIFIED-EMPIRICALLY** `@emdash-cms/sandbox-workerd@0.1.6` bridge still checks the deprecated `network:fetch:any` capability for `http/fetch`; `plugin-cli@0.5.1` rejects that same capability as deprecated and tells authors to use `network:request:unrestricted`. The measurement harness added `network:fetch:any` only to the in-memory runtime manifest to measure subrequests.

## Capability names

- **VERIFIED-EMPIRICALLY** `@emdash-cms/plugin-cli@0.5.1` accepts current manifest capability `network:request:unrestricted` and rejects deprecated `network:fetch:any` with:

```text
capabilities[3]: capability "network:fetch:any" is deprecated. Use "network:request:unrestricted" instead.
```

- **VERIFIED-EMPIRICALLY** `@emdash-cms/plugin-types@0.0.1` maps deprecated aliases to current names:

```js
"network:fetch" -> "network:request"
"network:fetch:any" -> "network:request:unrestricted"
"read:content" -> "content:read"
"write:content" -> "content:write"
```

## TS declaration workaround

- **VERIFIED-EMPIRICALLY** the CLI scaffold's `export default { ... } satisfies SandboxedPlugin` default export failed declaration generation under TypeScript 6.0.3. The current error code is TS2883, the same portability class as the TS2742 workaround named in the mission:

```text
RollupError: src/plugin.ts(9,1): error TS2883: The inferred type of 'default' cannot be named without a reference to 'PluginStorageConfig' from '.pnpm/@emdash-cms+plugin-types@0.0.1/node_modules/@emdash-cms/plugin-types'. This is likely not portable. A type annotation is necessary.
```

- **VERIFIED-EMPIRICALLY** this fixed the build:

```ts
import type { SandboxedPlugin } from "emdash/plugin";

const plugin: SandboxedPlugin = {
  hooks: {},
  routes: {},
};

export default plugin;
```

## Operational conclusions for Dateline

- **VERIFIED-EMPIRICALLY** M2 profiler budgets must continue to enforce Cloudflare's 50 ms CPU, 10 subrequests, 30000 ms wall, and 128 MB memory budgets; local workerd only enforces wall time.
- **VERIFIED-EMPIRICALLY** M2 RSVP capacity must not treat `uniqueIndexes` as a duplicate-insert guard in local runner tests.
- **VERIFIED-EMPIRICALLY** Dateline plugin manifests should use current capability names (`content:read`, `content:write`, `network:request:unrestricted`) even though the 0.1.6 workerd bridge has an internal deprecated-name check for outbound fetch.
- **VERIFIED-EMPIRICALLY** sandboxed plugin default exports should use `const plugin: SandboxedPlugin = ...; export default plugin;` until the CLI d.ts generator no longer emits the portability error.
