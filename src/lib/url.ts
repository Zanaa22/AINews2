const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "ref_src",
  "source",
]);

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.hash = "";

    const nextParams = new URLSearchParams();
    Array.from(url.searchParams.entries())
      .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        nextParams.append(key, value);
      });

    url.search = nextParams.toString();
    url.hostname = url.hostname.toLowerCase();

    // Normalize trailing slash for non-root paths.
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function toSourceDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

export function dedupeByCanonicalUrl<T extends { sourceUrl: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const canonical = canonicalizeUrl(item.sourceUrl);
    if (seen.has(canonical)) {
      continue;
    }

    seen.add(canonical);
    deduped.push({ ...item, sourceUrl: canonical });
  }

  return deduped;
}
