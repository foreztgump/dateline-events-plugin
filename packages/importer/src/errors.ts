export function boundaryMessage(boundary: string, error: unknown): string {
  return `${boundary} failed: ${String(error)}`;
}

export function boundaryError(boundary: string, error: unknown): Error {
  return new Error(boundaryMessage(boundary, error));
}
