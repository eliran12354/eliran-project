/**
 * Normalises an unknown error (e.g. a node-postgres error) into a message string.
 */
export function formatDbError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
