/**
 * PostgrestError from @supabase/supabase-js is not always instanceof Error.
 */
export function formatSupabaseError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
