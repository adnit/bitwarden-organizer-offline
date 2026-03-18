import { getDomain, parse } from 'tldts';

/**
 * Extracts the registrable base domain (e.g. "example.com") from a URL string.
 * Returns null if the URI is not a valid HTTP/S URL.
 */
export function extractBaseDomain(uri: string): string | null {
  if (!uri) return null;

  try {
    // Handle URIs that may lack a protocol. If it doesn't start with a valid scheme like http:// or android://
    let normalizedUri = uri.trim();
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(normalizedUri)) {
      if (!normalizedUri.startsWith('//')) {
        normalizedUri = 'https://' + normalizedUri;
      } else {
        normalizedUri = 'https:' + normalizedUri;
      }
    }

    const url = new URL(normalizedUri);
    const hostname = url.hostname;

    // tldts getDomain returns "example.com" from "sub.example.com"
    const domain = getDomain(hostname);
    if (domain) return domain;

    // Fallback for IPs or localhost
    const parsed = parse(hostname);
    if (parsed.isIp) return hostname;
    if (!parsed.publicSuffix) return hostname || null;

    return hostname || null;
  } catch {
    // Not a parseable URL — may be an app URI like "androidapp://..."
    return null;
  }
}

/**
 * Returns true if two URIs resolve to the same base domain.
 */
export function isSameDomain(a: string, b: string): boolean {
  const da = extractBaseDomain(a);
  const db = extractBaseDomain(b);
  return da !== null && db !== null && da === db;
}
