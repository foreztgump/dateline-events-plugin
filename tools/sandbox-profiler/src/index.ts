export const SANDBOX_CPU_BUDGET_MICROS = 50_000;
export const SANDBOX_SUBREQUEST_BUDGET = 10;
export const PROFILER_BASE_URL = "https://example.test";
const MICROS_PER_MILLISECOND = 1_000;
const HTTP_STATUS_NO_CONTENT = 204;

export interface ProfileResult {
  ok: boolean;
  cpuMicros: number;
  subrequestCount: number;
  breaches: string[];
}

export interface ProfilingContext {
  content: Record<string, (...args: unknown[]) => Promise<unknown>>;
  cron: { schedule(...args: unknown[]): Promise<void> };
  email: { send(...args: unknown[]): Promise<void> };
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  http: { fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> };
  kv: Record<string, (...args: unknown[]) => Promise<unknown>>;
  log: { info(...args: unknown[]): void; warn(...args: unknown[]): void; error(...args: unknown[]): void };
  plugin: { id: string; version: string };
  site: { name: string; url: string; locale: string };
  storage: Record<string, StorageCollection>;
  url(path: string): string;
}

export type ProfiledHandler = (ctx: ProfilingContext) => Promise<void> | void;

export interface ProfilingOptions {
  storageSeedRecords?: StorageSeedRecords;
}

interface StorageCollection {
  get(id: string): Promise<unknown>;
  put(id: string, data: unknown): Promise<void>;
  query(): Promise<{ items: Array<{ id: string; data: unknown }> }>;
  count(): Promise<number>;
}

interface StorageCollectionLookup {
  handler: (...args: unknown[]) => Promise<unknown>;
  seedRecords: StorageSeedRecords;
  collections: Map<string, StorageCollection>;
}

export type StorageSeedRecords = Record<string, Array<{ id: string; data: unknown }>>;

export async function runWithProfiling(handler: ProfiledHandler, options: ProfilingOptions = {}): Promise<ProfileResult> {
  const counter = createSubrequestCounter();
  const startedAt = performance.now();
  await handler(createProfilingContext(counter, options.storageSeedRecords ?? {}));
  const elapsedMicros = Math.round((performance.now() - startedAt) * MICROS_PER_MILLISECOND);
  const breaches = collectBreaches(elapsedMicros, counter.count);
  return { ok: breaches.length === 0, cpuMicros: elapsedMicros, subrequestCount: counter.count, breaches };
}

function createSubrequestCounter(): { count: number } {
  return { count: 0 };
}

function createProfilingContext(counter: { count: number }, storageSeedRecords: StorageSeedRecords): ProfilingContext {
  const countSubrequest = (): Promise<unknown> => {
    counter.count += 1;
    return Promise.resolve(undefined);
  };
  const fetch = (): Promise<Response> => {
    counter.count += 1;
    return Promise.resolve(new Response(null, { status: HTTP_STATUS_NO_CONTENT }));
  };
  return {
    content: createSubrequestFacade(countSubrequest),
    cron: { schedule: async () => { await countSubrequest(); } },
    email: { send: async () => { await countSubrequest(); } },
    fetch,
    http: { fetch },
    kv: createSubrequestFacade(countSubrequest),
    log: createLogFacade(),
    plugin: { id: "dateline-profiler", version: "0.0.0" },
    site: { name: "Dateline Profiler", url: PROFILER_BASE_URL, locale: "en" },
    storage: createStorageFacade(countSubrequest, storageSeedRecords),
    url: (path: string) => new URL(path, PROFILER_BASE_URL).href,
  };
}

function createStorageFacade(handler: (...args: unknown[]) => Promise<unknown>, seedRecords: StorageSeedRecords): Record<string, StorageCollection> {
  const collections = new Map<string, StorageCollection>();
  const lookup = { handler, seedRecords, collections };
  return new Proxy<Record<string, StorageCollection>>({}, {
    get(_target, property) {
      return readStorageCollection(String(property), lookup);
    },
  });
}

function readStorageCollection(name: string, lookup: StorageCollectionLookup): StorageCollection {
  const { handler, seedRecords, collections } = lookup;
  const existingCollection = collections.get(name);
  if (existingCollection) return existingCollection;
  const collection = createStorageCollection(name, handler, seedRecords);
  collections.set(name, collection);
  return collection;
}

function createStorageCollection(name: string, handler: (...args: unknown[]) => Promise<unknown>, seedRecords: StorageSeedRecords): StorageCollection {
  const records = new Map<string, unknown>(storageSeedsForCollection(name, seedRecords));
  return {
    get: async (id) => {
      await handler();
      return records.get(id) ?? null;
    },
    put: async (id, data) => {
      await handler();
      records.set(id, data);
    },
    query: async () => {
      await handler();
      return { items: Array.from(records, ([id, data]) => ({ id, data })) };
    },
    count: async () => {
      await handler();
      return records.size;
    },
  };
}

function storageSeedsForCollection(name: string, seedRecords: StorageSeedRecords): Array<[string, unknown]> {
  return (seedRecords[name] ?? []).map((record) => [record.id, record.data]);
}

function createLogFacade(): ProfilingContext["log"] {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
}

function createSubrequestFacade(handler: (...args: unknown[]) => Promise<unknown>) {
  return new Proxy({}, {
    get() {
      return handler;
    },
  }) as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

function collectBreaches(cpuMicros: number, subrequestCount: number): string[] {
  const breaches: string[] = [];
  if (cpuMicros > SANDBOX_CPU_BUDGET_MICROS) {
    breaches.push(`cpuMicros exceeded ${SANDBOX_CPU_BUDGET_MICROS}`);
  }
  if (subrequestCount > SANDBOX_SUBREQUEST_BUDGET) {
    breaches.push(`subrequestCount exceeded ${SANDBOX_SUBREQUEST_BUDGET}`);
  }
  return breaches;
}
