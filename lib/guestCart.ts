/**
 * Utility functions for managing the cookie-persisted guest shopping cart.
 * Persists unauthenticated guest checkmarks for 7 days so they can be claimed
 * upon subsequent login/authentication into the kitchen.
 */

export const GUEST_CART_COOKIE_PREFIX = "kartli_guest_cart_";
export const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Returns the cookie key for a given kitchen.
 */
export function getGuestCartCookieName(kitchenId: string): string {
  return `${GUEST_CART_COOKIE_PREFIX}${kitchenId}`;
}

/**
 * Reads the guest cart item IDs from browser cookies.
 */
export function readGuestCartCookie(kitchenId: string): string[] {
  if (typeof document === "undefined") return [];
  const targetName = `${getGuestCartCookieName(kitchenId)}=`;
  const cookiesList = document.cookie ? document.cookie.split(";") : [];

  for (let rawCookie of cookiesList) {
    const trimmed = rawCookie.trim();
    if (trimmed.startsWith(targetName)) {
      const rawVal = trimmed.substring(targetName.length);
      try {
        const decoded = decodeURIComponent(rawVal);
        const parsed = JSON.parse(decoded);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Writes an array of item IDs to the guest cart cookie on the client.
 */
export function writeGuestCartCookie(kitchenId: string, itemIds: string[]): void {
  if (typeof document === "undefined") return;
  const cookieName = getGuestCartCookieName(kitchenId);

  if (!itemIds || itemIds.length === 0) {
    clearGuestCartCookieClient(kitchenId);
    return;
  }

  const serialized = encodeURIComponent(JSON.stringify(itemIds));
  document.cookie = `${cookieName}=${serialized}; path=/; max-age=${GUEST_CART_MAX_AGE}; SameSite=Lax`;
}

/**
 * Clears the guest cart cookie on the client.
 */
export function clearGuestCartCookieClient(kitchenId: string): void {
  if (typeof document === "undefined") return;
  const cookieName = getGuestCartCookieName(kitchenId);
  document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
}
