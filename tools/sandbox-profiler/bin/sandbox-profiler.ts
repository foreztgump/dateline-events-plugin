#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runWithProfiling, type ProfileResult, type ProfiledHandler } from "../src/index.js";

const MANIFEST_FILE = "sandboxed.json";
const DEFAULT_EXPORT = "default";

interface HandlerEntry {
  id: string;
  module: string;
  export?: string;
}

interface HandlerReport extends ProfileResult {
  id: string;
  manifestPath: string;
}

export async function main(cwd = process.cwd()): Promise<number> {
  const manifests = await findSandboxManifests(cwd);
  if (manifests.length === 0) {
    writeOutput("sandbox-profiler: no sandboxed.json manifests found; skipping sandbox budget gate.");
    return 0;
  }
  const results = (await Promise.all(manifests.map(profileManifest))).flat();
  writeOutput(JSON.stringify(results, null, 2));
  return results.every((result) => result.ok) ? 0 : 1;
}

function writeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function findSandboxManifests(cwd: string): Promise<string[]> {
  const entries = await readDirectory(cwd);
  return entries
    .filter((entry) => entry.endsWith(MANIFEST_FILE))
    .map((entry) => join(cwd, entry))
    .filter((path) => !path.includes("node_modules") && !path.includes("dist"));
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
    const result = await runWithProfiling(handler);
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
  if (typeof handler !== "function") {
    throw new Error(`Sandbox handler ${entry.id} does not export a function.`);
  }
  return handler as ProfiledHandler;
}

async function importModule(modulePath: string, handlerId: string): Promise<Record<string, unknown>> {
  try {
    return await import(pathToFileURL(modulePath).href) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Unable to import sandbox handler ${handlerId}: ${String(error)}`, { cause: error });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
