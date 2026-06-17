/**
 * Session ID utility — persistent customer identifier.
 *
 * Decouples customer identity from Firebase Auth UID so that:
 * - Carts/orders survive staff login/logout in the same browser
 * - A single browser can switch between anonymous and staff auth without data loss
 * - The same `sessionId` follows the customer across anonymous → authenticated transitions
 *
 * Storage: localStorage under `house_session_id`.
 * Generated once (UUIDv4), never rotated unless cleared manually.
 */

const STORAGE_KEY = 'house_session_id';

/** Return the stable sessionId for this browser, creating it if needed. */
export function getSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Fallback for environments where localStorage is unavailable (SSR, tests)
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

/** Manually override the sessionId (useful for tests or merging sessions). */
export function setSessionId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // noop
  }
}

/** Clear the sessionId (next call to getSessionId will generate a new one). */
export function clearSessionId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
