/** The production Odyssey API. Other environments set their own base URL. */
export const odysseyApiOrigin =
  "https://odyssey-be-346395334988.asia-northeast3.run.app";

/**
 * @param value A configured base URL, possibly empty
 * @returns Its origin when it is https (or http on a loopback host), otherwise
 * null so a typo never falls through to another environment silently
 */
export function parseApiOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
