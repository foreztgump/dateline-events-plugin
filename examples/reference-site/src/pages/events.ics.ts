import { renderReferenceICal } from "../lib/ical.js";

export function GET(): Promise<Response> {
  return renderReferenceICal();
}
