import { MAX_REMOTE_SUBREQUESTS } from "./constants.js";
import { enqueueDeferredRemoteFeeds } from "./deferred.js";
import { fetchRemoteFeed } from "./fetch.js";
import type { ImportError, ImportFormat, ImporterContext } from "./types.js";

export interface FeedLoadResult {
  texts: string[];
  errors: ImportError[];
  payload: unknown;
}

interface FeedLoadOptions {
  request?: Request;
  ctx: ImporterContext;
  bodyKeys: string[];
  format: ImportFormat;
}

interface RemoteFetchOptions {
  urls: string[];
  ctx: ImporterContext;
  payload: unknown;
  format: ImportFormat;
}

export async function loadFeedTexts(options: FeedLoadOptions): Promise<FeedLoadResult> {
  const { request, ctx, bodyKeys, format } = options;
  const payload = await readPayload(request);
  const urls = remoteUrls(payload);
  if (urls.length > 0) return fetchRemoteFeeds({ urls, ctx, payload, format });
  return { texts: [inlineFeedText(payload, bodyKeys)], errors: [], payload };
}

function readPayloadProperty(payload: unknown, key: string): unknown {
  if (!isRecord(payload)) return undefined;
  return payload[key];
}

async function fetchRemoteFeeds(options: RemoteFetchOptions): Promise<FeedLoadResult> {
  const { urls, ctx, payload, format } = options;
  const fetchedTexts = await Promise.all(urls.slice(0, MAX_REMOTE_SUBREQUESTS).map((url) => fetchOneRemoteFeed(url, ctx)));
  const errors = fetchedTexts.flatMap((feed, index) => feed.error ? [{ row: index + 1, sourceId: `remote:${urls[index]}`, message: feed.error }] : []);
  const texts = fetchedTexts.flatMap((feed) => feed.text === undefined ? [] : [feed.text]);
  await enqueueDeferredRemoteFeeds({ ctx, format, urls: urls.slice(MAX_REMOTE_SUBREQUESTS), payload });
  return { texts, errors: [...errors, ...deferredFeedErrors(urls)], payload };
}

function fetchOneRemoteFeed(url: string, ctx: ImporterContext): Promise<{ text?: string; error?: string }> {
  if (!ctx.http) return Promise.resolve({ error: "Error: Remote feed request failed: Importer requires ctx.http for remote feed URLs." });
  return fetchRemoteFeed(url, ctx.http.fetch);
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
