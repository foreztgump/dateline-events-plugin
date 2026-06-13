import { z } from "zod";
import { validateBlocks } from "@emdash-cms/blocks/server";
import type { BlockResponse } from "@emdash-cms/blocks/server";

const INVALID_BLOCKS_MESSAGE = "Invalid BlockResponse";

/** Result shape returned by upstream `validateBlocks`. */
export type ValidationResult = ReturnType<typeof validateBlocks>;

// WHY: EmDash plugin route responses must be exactly `{ blocks, toast? }` — no
// transport keys (redirect/body/headers/status). Upstream ships `validateBlocks`
// for the blocks array but no envelope guard, so `assertResponse` is the value
// `@dateline/blocks` still adds on top of `@emdash-cms/blocks`.
const RESPONSE_ENVELOPE = z
  .object({
    blocks: z.array(z.unknown()),
    toast: z.object({ message: z.string(), type: z.enum(["success", "error", "info"]) }).strict().optional(),
  })
  .strict();

export function assertResponse(response: unknown): BlockResponse {
  const envelope = RESPONSE_ENVELOPE.safeParse(response);
  if (!envelope.success) throw new Error(`${INVALID_BLOCKS_MESSAGE}: ${envelope.error.issues[0]?.message ?? "unknown error"}`);
  const validation = validateBlocks(envelope.data.blocks);
  if (!validation.valid) throw new Error(`${INVALID_BLOCKS_MESSAGE}: ${validation.errors[0]?.message ?? "unknown error"}`);
  return envelope.data as BlockResponse;
}
