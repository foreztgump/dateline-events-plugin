import { REMOTE_FETCH_TIMEOUT_MS } from "./constants.js";

export async function fetchRemoteFeed(url: string, fetchUrl: (url: string) => Promise<Response>): Promise<{ text?: string; error?: string }> {
  try {
    const response = await fetchWithTimeout(fetchUrl(url));
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
