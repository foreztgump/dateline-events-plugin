import { getEmDashCollection } from "emdash";

type CollectionResult = { entries?: unknown[]; error?: unknown };
type CollectionFetcher = (collection: string, options?: Record<string, unknown>) => Promise<CollectionResult>;

export interface EmDashLoaderOptions {
  collection: string;
  query?: Record<string, unknown>;
  getCollection?: CollectionFetcher;
}

export interface EmDashLiveLoader {
  name: string;
  load(): Promise<{ entries: unknown[]; totalCount: number }>;
}

export function emdashLoader(options: EmDashLoaderOptions): EmDashLiveLoader {
  const getCollection = options.getCollection ?? getEmDashCollection;
  return {
    name: `dateline:${options.collection}`,
    load: () => loadCollection({ ...options, getCollection }),
  };
}

async function loadCollection(options: Required<Pick<EmDashLoaderOptions, "collection" | "getCollection">> & Pick<EmDashLoaderOptions, "query">) {
  try {
    const response = await options.getCollection(options.collection, options.query);
    if (response.error) throw collectionError(options.collection, response.error);
    const entries = response.entries ?? [];
    return { entries, totalCount: entries.length };
  } catch (error) {
    throw collectionError(options.collection, error);
  }
}

function collectionError(collection: string, cause: unknown): Error {
  return new Error(`Failed to load EmDash collection: ${collection}`, { cause });
}
