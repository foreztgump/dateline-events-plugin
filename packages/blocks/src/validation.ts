import { z } from "zod";
import { BLOCK_RESPONSE, BLOCKS } from "./schemas.js";
import type { Block } from "./block-types.js";
import type { ValidationError } from "./types.js";

const INVALID_BLOCKS_MESSAGE = "Invalid BlockResponse";
const STATS_GOTCHA_MESSAGE = "Stats blocks must use `stats`, not `items`.";
const BUTTON_GOTCHA_MESSAGE = "Button elements must use `text`, not `label`.";
const BANNER_CONTENT_MESSAGE = "Banner blocks require either `title` or `description`.";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface BlockResponse {
  blocks: Block[];
  toast?: { text: string; type: "success" | "error" | "info" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issuePath(path: PropertyKey[]): string {
  return path.map(String).join(".");
}

function schemaErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({ path: issuePath(issue.path), message: issue.message }));
}

function gotchaErrors(value: unknown, path: string): ValidationError[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => gotchaErrors(entry, appendPath(path, index)));
  if (!isRecord(value)) return [];
  return [...currentGotchas(value, path), ...childGotchas(value, path)];
}

function appendPath(path: string, key: string | number): string {
  return path.length === 0 ? String(key) : `${path}.${String(key)}`;
}

function currentGotchas(record: Record<string, unknown>, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (record.type === "stats" && "items" in record) errors.push({ path: appendPath(path, "stats"), message: STATS_GOTCHA_MESSAGE });
  if (record.type === "button" && "label" in record) errors.push({ path: appendPath(path, "text"), message: BUTTON_GOTCHA_MESSAGE });
  if (record.type === "banner" && !("title" in record) && !("description" in record)) {
    errors.push({ path: appendPath(path, "title"), message: BANNER_CONTENT_MESSAGE });
  }
  return errors;
}

function childGotchas(record: Record<string, unknown>, path: string): ValidationError[] {
  return Object.entries(record).flatMap(([key, value]) => gotchaErrors(value, appendPath(path, key)));
}

export function validateBlocks(blocks: unknown): ValidationResult {
  const gotchas = gotchaErrors(blocks, "");
  const validation = BLOCKS.safeParse(blocks);
  if (validation.success && gotchas.length === 0) return { valid: true, errors: [] };
  const errors = validation.success ? gotchas : [...gotchas, ...schemaErrors(validation.error)];
  return { valid: false, errors };
}

export function assertResponse(response: unknown): BlockResponse {
  const validation = BLOCK_RESPONSE.safeParse(response);
  if (!validation.success) throw new Error(`${INVALID_BLOCKS_MESSAGE}: ${schemaErrors(validation.error)[0]?.message ?? "unknown error"}`);
  const blockValidation = validateBlocks(validation.data.blocks);
  if (!blockValidation.valid) throw new Error(`${INVALID_BLOCKS_MESSAGE}: ${blockValidation.errors[0]?.message ?? "unknown error"}`);
  return validation.data as BlockResponse;
}
