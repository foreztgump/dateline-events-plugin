// WHY: CMS-controlled organizer/venue website fields land directly in `href`
// attributes. Without an allow-list we ship a `javascript:` / `data:` /
// `vbscript:` XSS sink. Reject anything that is not http(s). See PRO-482.
export function safeHref(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}
