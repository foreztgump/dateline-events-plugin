export class DatelineCoreError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "DatelineCoreError";
  }
}

export function boundaryError(boundary: string, error: unknown): DatelineCoreError {
  return new DatelineCoreError("BOUNDARY_ERROR", `${boundary} failed: ${String(error)}`);
}
