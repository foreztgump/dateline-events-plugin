import type { BlockResponse } from "@dateline/blocks";

export interface CollectionField {
  name: string;
  type: string;
  required?: boolean;
  enum?: string[];
}

export interface CollectionSchema {
  slug: string;
  label: string;
  fields: CollectionField[];
}

export interface DatelineEvent {
  id: string;
  title: string;
  description?: unknown[];
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay: boolean;
  locationType: "physical" | "virtual" | "hybrid";
  organizers: string[];
  categories: string[];
  recurrenceRule?: string;
  x402Price?: { amount: number; currency: string };
  [key: string]: unknown;
}

export interface RouteInput {
  request?: Request;
  ctx: CoreContext;
}

export interface ContentListResult<T = unknown> {
  items?: T[];
  entries?: T[];
}

export interface CoreContext {
  content?: {
    list(collection: string, options?: unknown): Promise<ContentListResult>;
    delete?(collection: string, id: string): Promise<unknown>;
    update?(collection: string, id: string, content: unknown): Promise<unknown>;
  };
  kv?: {
    get?(key: string): Promise<string | null>;
    set?(key: string, value: string): Promise<void>;
    delete?(key: string): Promise<boolean | void>;
  };
}

export interface HookEvent {
  collection: string;
  id?: string;
  content?: Record<string, unknown>;
}

export type AdminPage = "events" | "venues" | "organizers" | "settings";
export type AdminHandlers = Record<AdminPage, () => BlockResponse>;
