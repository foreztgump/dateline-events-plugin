import { renderReferenceICal } from "../lib/ical.js";

export async function GET(): Promise<Response> {
  return renderReferenceICal();
}
