export function boundaryMessage(boundary: string, error: unknown): string {
  return `${boundary} failed: ${String(error)}`;
}
