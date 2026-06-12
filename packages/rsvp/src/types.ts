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

export interface CapacityRecord {
  kind: "capacity";
  eventId: string;
  capacity?: number;
  remaining: number;
}

export interface RsvpClaimRecord {
  kind: "claim";
  eventId: string;
  email: string;
  status: "pending" | "confirmed" | "waitlisted" | "cancelled" | "released";
  createdAt?: string;
  sequence?: number;
}

export interface WaitlistRecord {
  kind: "waitlist";
  eventId: string;
  entries: unknown[];
}

export interface RateLimitRecord {
  kind: "rateLimit";
  eventId: string;
  ipAddress: string;
  expiresAt: string;
}

export interface HoldRecord {
  kind: "hold";
  eventId: string;
  email: string;
  expiresAt: string;
  status: "active" | "expired";
}

export type RsvpStorageRecord = CapacityRecord | RsvpClaimRecord | WaitlistRecord | RateLimitRecord | HoldRecord;

export interface RsvpContext {
  storage?: {
    rsvps?: StorageCollection;
  };
  content?: {
    create?(collection: string, content: Record<string, unknown>): Promise<unknown>;
    update?(collection: string, id: string, content: Record<string, unknown>): Promise<unknown>;
    list?(collection: string, options?: unknown): Promise<ContentListResult>;
  };
  email?: {
    send(message: { to: string; subject: string; text: string; html?: string }): Promise<unknown>;
  };
  cron?: {
    schedule(name: string, options: { schedule: string }): Promise<unknown>;
  };
  log?: {
    warn(message: string, metadata?: Record<string, unknown>): void;
  };
}

export type AdminHandlers = Record<"attendees" | "waitlist", () => BlockResponse>;
