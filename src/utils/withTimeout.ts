/**
 * withTimeout — race a promise against a timeout.
 *
 * Used to prevent app-startup network calls (Supabase getSession / profile
 * fetch) from hanging the splash screen forever on a slow/cold-boot network.
 * On timeout it resolves with `fallback` instead of rejecting, so callers can
 * fall through to their local-cache path.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}
