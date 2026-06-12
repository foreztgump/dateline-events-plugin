#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PROFILER_BASE_URL,
  runWithProfiling,
  type ProfileResult,
  type ProfiledHandler,
  type StorageSeedRecords,
} from "../src/index.js";

const MANIFEST_FILE = "profiler.config.json";
const PACKAGE_FILE = "package.json";
const PNPM_WORKSPACE_FILE = "pnpm-workspace.yaml";
const DEFAULT_EXPORT = "default";
const PACKAGE_FLAG = "--pkg";
const ARG_SEPARATOR = "--";

interface HandlerEntry {
  id: string;
  module: string;
  export?: string;
  pluginHook?: string;
  pluginRoute?: string;
  event?: unknown;
  input?: unknown;
  seedRecords?: StorageSeedRecords;
  request?: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

interface HandlerReport extends ProfileResult {
  id: string;
  manifestPath: string;
}

type PluginEntryHandler = (...args: unknown[]) => unknown;

interface PluginEntryLookup {
  property: "hooks" | "routes";
  key: string | undefined;
  id: string;
}

export async function main(cwd?: string, args = process.argv.slice(2)): Promise<number> {
  const workspaceRoot = await resolveDiscoveryRoot(cwd ?? process.cwd(), cwd === undefined);
  const packageName = parsePackageFilter(args);
  const manifests = await findSandboxManifests(workspaceRoot, packageName);
  if (manifests.length === 0) {
    writeOutput(`sandbox-profiler: no ${MANIFEST_FILE} manifests found; skipping sandbox budget gate.`);
    return 0;
  }
  const results = (await Promise.all(manifests.map(profileManifest))).flat();
  writeOutput(JSON.stringify(results, null, 2));
  return results.every((result) => result.ok) ? 0 : 1;
}

function writeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function findSandboxManifests(cwd: string, packageName?: string): Promise<string[]> {
  const entries = await readDirectory(cwd);
  const manifests = entries
    .filter((entry) => entry.endsWith(MANIFEST_FILE))
    .map((entry) => join(cwd, entry))
    .filter((path) => !path.includes("node_modules") && !path.includes("dist"));
  return filterManifestsByPackage(manifests, packageName);
}

async function resolveDiscoveryRoot(cwd: string, useInitCwd: boolean): Promise<string> {
  const initialDirectory = useInitCwd ? process.env.INIT_CWD : undefined;
  const startDirectory = resolve(initialDirectory ?? cwd);
  return await findWorkspaceRoot(startDirectory) ?? resolve(cwd);
}

async function findWorkspaceRoot(startDirectory: string): Promise<string | undefined> {
  let current = startDirectory;
  while (true) {
    if (await fileExists(join(current, PNPM_WORKSPACE_FILE))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function filterManifestsByPackage(manifests: string[], packageName?: string): Promise<string[]> {
  if (!packageName) {
    return manifests;
  }
  const matches = await Promise.all(manifests.map((manifest) => manifestBelongsToPackage(manifest, packageName)));
  return manifests.filter((_, index) => matches[index]);
}

async function manifestBelongsToPackage(manifestPath: string, packageName: string): Promise<boolean> {
  const packagePath = join(dirname(manifestPath), PACKAGE_FILE);
  try {
    const parsed = JSON.parse(await readFile(packagePath, "utf8")) as { name?: string };
    return parsed.name === packageName;
  } catch (error) {
    throw new Error(`Unable to read package metadata ${packagePath}: ${String(error)}`, { cause: error });
  }
}

function parsePackageFilter(args: string[]): string | undefined {
  const normalizedArgs = args.filter((arg) => arg !== ARG_SEPARATOR);
  const flagIndex = normalizedArgs.indexOf(PACKAGE_FLAG);
  return flagIndex >= 0 ? normalizedArgs[flagIndex + 1] : undefined;
}

async function readDirectory(cwd: string): Promise<string[]> {
  try {
    return await readdir(cwd, { recursive: true });
  } catch (error) {
    throw new Error(`Unable to scan sandbox manifests from ${cwd}: ${String(error)}`, { cause: error });
  }
}

async function profileManifest(manifestPath: string): Promise<HandlerReport[]> {
  const entries = await readManifest(manifestPath);
  return Promise.all(entries.map((entry) => profileHandler(manifestPath, entry)));
}

async function readManifest(manifestPath: string): Promise<HandlerEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as { handlers?: HandlerEntry[] };
    return Array.isArray(parsed.handlers) ? parsed.handlers : [];
  } catch (error) {
    throw new Error(`Unable to read sandbox manifest ${manifestPath}: ${String(error)}`);
  }
}

async function profileHandler(manifestPath: string, entry: HandlerEntry): Promise<HandlerReport> {
  try {
    const handler = await importHandler(manifestPath, entry);
    const result = await runWithProfiling(handler, { storageSeedRecords: entry.seedRecords });
    return { id: entry.id, manifestPath, ...result };
  } catch (error) {
    return createFailedReport(manifestPath, entry.id, error);
  }
}

function createFailedReport(manifestPath: string, id: string, error: unknown): HandlerReport {
  return { id, manifestPath, ok: false, cpuMicros: 0, subrequestCount: 0, breaches: [String(error)] };
}

async function importHandler(manifestPath: string, entry: HandlerEntry): Promise<ProfiledHandler> {
  const modulePath = resolve(dirname(manifestPath), entry.module);
  const imported = await importModule(modulePath, entry.id);
  const handler = imported[entry.export ?? DEFAULT_EXPORT];
  if (entry.pluginHook) return pluginHookHandler(handler, entry);
  if (entry.pluginRoute) return pluginRouteHandler(handler, entry);
  if (typeof handler !== "function") {
    throw new Error(`Sandbox handler ${entry.id} does not export a function.`);
  }
  return handler as ProfiledHandler;
}

function pluginHookHandler(pluginExport: unknown, entry: HandlerEntry): ProfiledHandler {
  return async (ctx) => {
    const hook = readPluginEntry(pluginExport, { property: "hooks", key: entry.pluginHook, id: entry.id });
    const hookHandler = isPluginEntryHandler(hook) ? hook : readHandlerProperty(hook, entry.id);
    await hookHandler(entry.event ?? {}, ctx);
  };
}

function pluginRouteHandler(pluginExport: unknown, entry: HandlerEntry): ProfiledHandler {
  return async (ctx) => {
    const route = readPluginEntry(pluginExport, { property: "routes", key: entry.pluginRoute, id: entry.id });
    const routeHandler = isPluginEntryHandler(route) ? route : readHandlerProperty(route, entry.id);
    await routeHandler(createRouteContext(entry), ctx);
  };
}

function readPluginEntry(pluginExport: unknown, lookup: PluginEntryLookup): unknown {
  const { property, key, id } = lookup;
  if (!key) throw new Error(`Sandbox plugin handler ${id} is missing a ${property} key.`);
  if (!isRecord(pluginExport)) throw new Error(`Sandbox plugin handler ${id} default export is not an object.`);
  const entries = pluginExport[property];
  if (!isRecord(entries) || !(key in entries)) throw new Error(`Sandbox plugin handler ${id} does not define ${property}.${key}.`);
  return entries[key];
}

function readHandlerProperty(entry: unknown, id: string): PluginEntryHandler {
  if (!isRecord(entry) || !isPluginEntryHandler(entry.handler)) {
    throw new Error(`Sandbox plugin handler ${id} does not define a callable handler.`);
  }
  return entry.handler;
}

function createRouteContext(entry: HandlerEntry): { input: unknown; request: Request } {
  const request = entry.request ?? { url: `${PROFILER_BASE_URL}/` };
  return {
    input: entry.input,
    request: new Request(request.url, { method: request.method ?? "GET", headers: request.headers }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPluginEntryHandler(value: unknown): value is PluginEntryHandler {
  return typeof value === "function";
}

async function importModule(modulePath: string, handlerId: string): Promise<Record<string, unknown>> {
  try {
    return await import(pathToFileURL(modulePath).href) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Unable to import sandbox handler ${handlerId}: ${String(error)}`, { cause: error });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    writeOutput(String(error));
    process.exitCode = 1;
  }
}
