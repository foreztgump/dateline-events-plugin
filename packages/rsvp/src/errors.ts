export class DatelineRsvpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "DatelineRsvpError";
  }
}

export function boundaryError(boundary: string, error: unknown): DatelineRsvpError {
  return new DatelineRsvpError("BOUNDARY_ERROR", `${boundary} failed: ${String(error)}`);
}
