import { describe, expect, it } from "vitest";

import { canonicalizeUrl, dedupeByCanonicalUrl } from "../src/lib/url";

describe("canonicalizeUrl", () => {
  it("strips tracking params and hash", () => {
    const canonical = canonicalizeUrl(
      "https://Example.com/path/?utm_source=x&b=2&a=1#section",
    );

    expect(canonical).toBe("https://example.com/path?a=1&b=2");
  });

  it("dedupes by canonical URL", () => {
    const deduped = dedupeByCanonicalUrl([
      { sourceUrl: "https://example.com/post?utm_source=x" },
      { sourceUrl: "https://example.com/post" },
      { sourceUrl: "https://example.com/post/#hash" },
      { sourceUrl: "https://example.com/other" },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped[0].sourceUrl).toBe("https://example.com/post");
  });
});
