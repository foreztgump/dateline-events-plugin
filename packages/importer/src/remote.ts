import { MAX_REMOTE_SUBREQUESTS, REMOTE_FETCH_TIMEOUT_MS } from "./constants.js";
import type { ImportError, ImporterContext } from "./types.js";

export interface FeedLoadResult {
  texts: string[];
  errors: ImportError[];
  payload: unknown;
}

export async function loadFeedTexts(request: Request | undefined, ctx: ImporterContext, bodyKeys: string[]): Promise<FeedLoadResult> {
  const payload = await readPayload(request);
  const urls = remoteUrls(payload);
  if (urls.length > 0) return fetchRemoteFeeds(urls, ctx, payload);
  return { texts: [inlineFeedText(payload, bodyKeys)], errors: [], payload };
}

export function readPayloadProperty(payload: unknown, key: string): unknown {
  if (!isRecord(payload)) return undefined;
  return payload[key];
}

async function fetchRemoteFeeds(urls: string[], ctx: ImporterContext, payload: unknown): Promise<FeedLoadResult> {
  const fetchedTexts = await Promise.all(urls.slice(0, MAX_REMOTE_SUBREQUESTS).map((url) => fetchRemoteFeed(url, ctx)));
  const errors = fetchedTexts.flatMap((feed, index) => feed.error ? [{ row: index + 1, sourceId: `remote:${urls[index]}`, message: feed.error }] : []);
  const texts = fetchedTexts.flatMap((feed) => feed.text === undefined ? [] : [feed.text]);
  return { texts, errors: [...errors, ...deferredFeedErrors(urls)], payload };
}

async function fetchRemoteFeed(url: string, ctx: ImporterContext): Promise<{ text?: string; error?: string }> {
  try {
    if (!ctx.http) throw new Error("Importer requires ctx.http for remote feed URLs.");
    const response = await fetchWithTimeout(ctx.http.fetch(url));
    if (!response.ok) return { error: `Error: Remote feed returned HTTP ${response.status} ${response.statusText}.` };
    return { text: await response.text() };
  } catch (error) {
    return { error: `Error: Remote feed request failed: ${errorMessage(error)}` };
  }
}

async function fetchWithTimeout(fetchPromise: Promise<Response>): Promise<Response> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<Response>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Remote feed request timed out after ${REMOTE_FETCH_TIMEOUT_MS}ms.`));
    }, REMOTE_FETCH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function deferredFeedErrors(urls: string[]): ImportError[] {
  const deferredCount = urls.length - MAX_REMOTE_SUBREQUESTS;
  if (deferredCount <= 0) return [];
  return [{
    row: MAX_REMOTE_SUBREQUESTS + 1,
    sourceId: "remote:budget",
    message: `Import deferred ${deferredCount} remote ${deferredCount === 1 ? "feed" : "feeds"} because each invocation may issue at most ${MAX_REMOTE_SUBREQUESTS} subrequests.`,
  }];
}

async function readPayload(request: Request | undefined): Promise<unknown> {
  if (!request) return "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  return request.text();
}

function inlineFeedText(payload: unknown, bodyKeys: string[]): string {
  if (typeof payload === "string") return payload;
  for (const key of bodyKeys) {
    const value = readPayloadProperty(payload, key);
    if (typeof value === "string") return value;
  }
  if (isRecord(payload) || Array.isArray(payload)) return JSON.stringify(payload);
  return "";
}

function remoteUrls(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const urls = payload.urls;
  if (Array.isArray(urls)) return urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  return typeof payload.url === "string" && payload.url.length > 0 ? [payload.url] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
