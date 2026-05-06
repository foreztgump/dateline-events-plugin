import { renderReferenceICal } from "../lib/ical.js";

export function GET(): Response {
  return renderReferenceICal();
}
