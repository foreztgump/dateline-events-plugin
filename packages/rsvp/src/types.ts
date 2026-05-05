import type { BlockResponse } from "@dateline/blocks";

export type RsvpStatus = "confirmed" | "waitlisted" | "cancelled";

export interface Attendee {
  id?: string;
  event: string;
  email: string;
  name: string;
  rsvpStatus: RsvpStatus;
  ticketTierId?: null;
}

export interface HookEvent {
  collection: string;
  content?: Record<string, unknown>;
}

export interface RouteInput {
  request?: Request;
  ctx: RsvpContext;
}

export interface ContentListResult<T = unknown> {
  items?: T[];
  entries?: T[];
}

export interface RsvpContext {
  kv?: {
    get?(key: string): Promise<string | null>;
    put?(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete?(key: string): Promise<void>;
    atomicDecrement?(key: string): Promise<number>;
    atomicIncrement?(key: string): Promise<number>;
  };
  content?: {
    create?(collection: string, content: unknown): Promise<unknown>;
    update?(collection: string, id: string, content: unknown): Promise<unknown>;
    list?(collection: string, options?: unknown): Promise<ContentListResult>;
  };
  email?: {
    send(message: { to: string; subject: string; body: string }): Promise<unknown>;
  };
  cron?: {
    schedule(name: string, options: { schedule: string }): Promise<unknown>;
  };
  log?: {
    warn(message: string, metadata?: Record<string, unknown>): void;
  };
  waitUntil?(promise: Promise<unknown>): void;
}

export type AdminHandlers = Record<"attendees" | "waitlist", () => BlockResponse>;
