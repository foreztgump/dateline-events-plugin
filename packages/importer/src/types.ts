import type { BlockResponse } from "@dateline/blocks";

export interface DatelineEventDraft {
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  allDay: boolean;
  locationType: "physical" | "virtual" | "hybrid";
  organizers: string[];
  categories: string[];
  tags: string[];
  description?: unknown[];
  recurrenceRule?: string;
  recurrenceExceptions?: string[];
  venue?: string;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ImportRow {
  sourceId: string;
  event: DatelineEventDraft;
}

export interface ImportError {
  row: number;
  sourceId: string;
  message: string;
}

export interface ImportParseResult {
  rows: ImportRow[];
  errors: ImportError[];
}

export interface TecMigrationResult extends ImportParseResult {
  venues: Array<Record<string, unknown>>;
  organizers: Array<Record<string, unknown>>;
}

export interface ImportSummary {
  created: number;
  skipped: number;
  errors: ImportError[];
}

export interface StoragePage<T = unknown> {
  items?: Array<{ id: string; data: T }>;
  entries?: Array<{ id: string; data: T }>;
}

export interface StorageCollection<T = unknown> {
  get(id: string): Promise<T | null>;
  put(id: string, data: T): Promise<void>;
  query(options?: unknown): Promise<StoragePage<T>>;
  count(where?: unknown): Promise<number>;
}

export type ImportFormat = "tec" | "ical" | "csv" | "json";

export interface DeferredRemoteFeedRecord {
  kind: "deferredRemoteFeed";
  status: "pending" | "completed" | "failed";
  format: ImportFormat;
  url: string;
  payload: unknown;
  createdAt: string;
  /** Rows already imported across prior cron ticks; lets a many-row feed resume without re-creating earlier rows. */
  importedRows?: number;
  lastError?: string;
}

export interface ImporterContext {
  content?: object;
  cron?: {
    schedule(name: string, opts: { schedule: string; data?: Record<string, unknown> }): Promise<void>;
  };
  http?: {
    fetch: (url: string) => Promise<Response>;
  };
  log?: {
    warn(message: string, details?: unknown): void;
  };
  storage?: {
    imports?: StorageCollection;
  };
}

export interface RouteInput {
  request?: Request;
  ctx: ImporterContext;
}

export interface CsvFieldMapping {
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location?: string;
}

export type AdminPage = "settings" | "tec" | "ical" | "csv" | "json";
export type AdminHandlers = Record<AdminPage, () => BlockResponse>;
