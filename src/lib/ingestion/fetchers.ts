import Parser from "rss-parser";
import type { Source } from "@prisma/client";

import type { RawSignalItem } from "@/lib/schemas/ingestion";
import { toSourceDomain } from "@/lib/url";

const parser = new Parser();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function clipSnippet(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No snippet available from source feed.";
  }

  return normalized.length > 700 ? `${normalized.slice(0, 697).trimEnd()}...` : normalized;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 12_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "SignalNookBot/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function toRawItem(params: {
  source: Source;
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | Date;
}): RawSignalItem {
  const publishedAt =
    params.publishedAt instanceof Date
      ? params.publishedAt
      : params.publishedAt
        ? new Date(params.publishedAt)
        : new Date();

  return {
    sourceId: params.source.id,
    sourceUrl: params.url,
    sourceDomain: toSourceDomain(params.url),
    title: params.title.trim().slice(0, 220),
    snippet: clipSnippet(params.snippet),
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    providerLabel: params.source.providerLabel,
    providerKey: slugify(params.source.providerLabel),
    tier: params.source.tier,
  };
}

async function fetchRssItems(source: Source, feedUrl: string, maxItems: number): Promise<RawSignalItem[]> {
  const xml = await fetchTextWithTimeout(feedUrl);
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).slice(0, maxItems).flatMap((item) => {
    const url = item.link?.trim();
    if (!url) {
      return [];
    }

    return [
      toRawItem({
        source,
        title: item.title ?? "Untitled signal",
        url,
        snippet: item.contentSnippet ?? item.content ?? item.summary ?? "",
        publishedAt: item.isoDate ?? item.pubDate,
      }),
    ];
  });
}

async function fetchGithubReleaseItems(source: Source, maxItems: number): Promise<RawSignalItem[]> {
  const identifier = source.identifier.trim();
  const feedUrl = identifier.startsWith("http")
    ? identifier
    : `https://github.com/${identifier}/releases.atom`;
  return fetchRssItems(source, feedUrl, maxItems);
}

async function fetchNpmItems(source: Source): Promise<RawSignalItem[]> {
  const packageName = source.identifier.trim();
  const encoded = encodeURIComponent(packageName);
  const response = await fetch(`https://registry.npmjs.org/${encoded}`);

  if (!response.ok) {
    throw new Error(`npm registry request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    "dist-tags"?: { latest?: string };
    time?: Record<string, string>;
    description?: string;
    repository?: { url?: string };
  };

  const latest = payload["dist-tags"]?.latest;
  const publishedAt = latest ? payload.time?.[latest] : undefined;
  const repositoryUrl = payload.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "");
  const sourceUrl = repositoryUrl || `https://www.npmjs.com/package/${packageName}`;

  return [
    toRawItem({
      source,
      title: latest
        ? `${packageName} published ${latest}`
        : `${packageName} package registry update`,
      url: sourceUrl,
      snippet:
        payload.description ??
        `${packageName} posted a new npm update. Inspect changelog and dependency impact for downstream apps.`,
      publishedAt,
    }),
  ];
}

async function fetchRedditItems(source: Source, maxItems: number): Promise<RawSignalItem[]> {
  const identifier = source.identifier.trim();
  const feedUrl = identifier.startsWith("http")
    ? identifier
    : `https://www.reddit.com/r/${identifier.replace(/^r\//, "")}/.rss`;
  return fetchRssItems(source, feedUrl, maxItems);
}

export async function fetchSourceItems(source: Source, maxItems: number): Promise<RawSignalItem[]> {
  const perSourceLimit = Math.max(1, Math.min(maxItems, 25));

  switch (source.type) {
    case "RSS":
    case "CUSTOM_RSS":
      return fetchRssItems(source, source.identifier, perSourceLimit);
    case "GITHUB_RELEASES":
      return fetchGithubReleaseItems(source, perSourceLimit);
    case "NPM_UPDATES":
      return fetchNpmItems(source);
    case "REDDIT_RSS":
      return fetchRedditItems(source, perSourceLimit);
    default:
      return [];
  }
}
