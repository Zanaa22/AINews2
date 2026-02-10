import type { HeatLevel, StreamKey, TrackKey } from "@/types/domain";
import { TRACK_MAP } from "@/types/domain";
import type { ClassifiedSignal, RawSignalItem } from "@/lib/schemas/ingestion";

const TRACK_RULES: ReadonlyArray<{
  trackKey: TrackKey;
  streamKey: StreamKey;
  keywords: string[];
  domains: string[];
}> = [
  {
    trackKey: "platform-apis",
    streamKey: "TOOLCHAIN",
    keywords: ["api", "endpoint", "rate limit", "deprec", "auth", "webhook"],
    domains: ["platform.openai.com", "developers", "docs"],
  },
  {
    trackKey: "sdks-tooling",
    streamKey: "TOOLCHAIN",
    keywords: ["sdk", "cli", "plugin", "release", "package", "typescript", "python"],
    domains: ["npmjs.com", "pypi.org", "github.com"],
  },
  {
    trackKey: "agents-orchestration",
    streamKey: "TOOLCHAIN",
    keywords: ["agent", "workflow", "orchestr", "function calling", "tool use", "multi-step"],
    domains: ["langchain", "crew", "autogen", "github.com"],
  },
  {
    trackKey: "models-training",
    streamKey: "MODELS_METHODS",
    keywords: ["model", "fine-tun", "checkpoint", "training", "alignment", "distill"],
    domains: ["huggingface.co", "arxiv.org", "research"],
  },
  {
    trackKey: "inference-serving",
    streamKey: "OPS_RUNTIME",
    keywords: ["inference", "throughput", "latency", "serving", "runtime", "batch"],
    domains: ["modal.com", "replicate.com", "cloud.google.com", "aws.amazon.com"],
  },
  {
    trackKey: "rag-retrieval",
    streamKey: "MODELS_METHODS",
    keywords: ["rag", "retrieval", "vector", "embedding", "rerank", "chunk"],
    domains: ["pinecone.io", "weaviate.io", "qdrant.tech", "docs"],
  },
  {
    trackKey: "on-device-edge",
    streamKey: "OPS_RUNTIME",
    keywords: ["on-device", "edge", "mobile", "ios", "android", "wasm"],
    domains: ["webkit.org", "developer.apple.com", "developer.android.com"],
  },
  {
    trackKey: "hardware-drivers",
    streamKey: "OPS_RUNTIME",
    keywords: ["cuda", "driver", "gpu", "npu", "kernel", "vram", "tensor"],
    domains: ["nvidia.com", "amd.com", "intel.com"],
  },
  {
    trackKey: "research-benchmarks",
    streamKey: "MODELS_METHODS",
    keywords: ["benchmark", "eval", "leaderboard", "paper", "sota", "study"],
    domains: ["arxiv.org", "paperswithcode.com", "openreview.net"],
  },
  {
    trackKey: "community-finds",
    streamKey: "WILDS",
    keywords: ["showcase", "demo", "community", "reddit", "thread", "tutorial"],
    domains: ["reddit.com", "news.ycombinator.com", "dev.to"],
  },
];

const HOT_HINTS = [
  "breaking",
  "major",
  "ga",
  "general availability",
  "critical",
  "security",
  "v1",
  "launch",
  "open weights",
];

const NOTABLE_HINTS = [
  "update",
  "release",
  "improve",
  "benchmark",
  "support",
  "new",
  "added",
  "feature",
  "beta",
];

function clampSummary(value: string): string {
  if (value.length <= 240) {
    return value;
  }

  return `${value.slice(0, 237).trimEnd()}...`;
}

function inferTrack(value: string, domain: string): {
  trackKey: TrackKey;
  trackLabel: string;
  streamKey: StreamKey;
  streamLabel: string;
} {
  const matched = TRACK_RULES
    .map((rule) => {
      const keywordHits = rule.keywords.filter((keyword) => value.includes(keyword)).length;
      const domainHit = rule.domains.some((hint) => domain.includes(hint)) ? 1 : 0;
      return { rule, score: keywordHits * 2 + domainHit * 3 };
    })
    .sort((a, b) => b.score - a.score)[0];

  const fallback = TRACK_MAP["community-finds"];

  if (!matched || matched.score === 0) {
    return {
      trackKey: fallback.key,
      trackLabel: fallback.label,
      streamKey: "WILDS",
      streamLabel: "The Wilds",
    };
  }

  return {
    trackKey: matched.rule.trackKey,
    trackLabel: TRACK_MAP[matched.rule.trackKey].label,
    streamKey: matched.rule.streamKey,
    streamLabel: streamLabelFromKey(matched.rule.streamKey),
  };
}

function inferHeat(value: string, tier: number): HeatLevel {
  const hotHits = HOT_HINTS.filter((hint) => value.includes(hint)).length;
  const notableHits = NOTABLE_HINTS.filter((hint) => value.includes(hint)).length;

  if (hotHits >= 2 || (hotHits >= 1 && tier === 1)) {
    return "HOT";
  }

  if (notableHits >= 1 || tier <= 2) {
    return "NOTABLE";
  }

  return "QUIET";
}

function streamLabelFromKey(streamKey: StreamKey): string {
  switch (streamKey) {
    case "HEADLINERS":
      return "Headliners";
    case "TOOLCHAIN":
      return "Toolchain";
    case "MODELS_METHODS":
      return "Models & Methods";
    case "OPS_RUNTIME":
      return "Ops & Runtime";
    case "WILDS":
      return "The Wilds";
    default:
      return "The Wilds";
  }
}

export function heuristicClassifyRawItem(item: RawSignalItem): ClassifiedSignal {
  const combined = `${item.title} ${item.snippet}`.toLowerCase();
  const inferred = inferTrack(combined, item.sourceDomain);
  const heat = inferHeat(combined, item.tier);
  const summaryBase = item.snippet.replace(/\s+/g, " ").trim();

  return {
    title: item.title.trim(),
    summary: clampSummary(summaryBase),
    rationale:
      heat === "HOT"
        ? "Marked HOT because the item signals a high-impact release or policy change from a core provider."
        : heat === "NOTABLE"
          ? "Marked NOTABLE because it introduces material capabilities or workflow changes relevant to daily builders."
          : "Marked QUIET because it is useful context with lower immediate operational impact.",
    heat,
    trackKey: inferred.trackKey,
    trackLabel: inferred.trackLabel,
    streamKey: inferred.streamKey,
    streamLabel: inferred.streamLabel,
    confidence: "UNVERIFIED",
    tier: item.tier,
    citations: [item.sourceUrl],
  };
}

export type SignalDraft = ClassifiedSignal & {
  sourceUrl: string;
  sourceDomain: string;
  providerKey: string;
  providerLabel: string;
  occurredAtUtc: Date;
  rank: number | null;
};

export function importanceScore(signal: Pick<SignalDraft, "heat" | "tier" | "confidence">): number {
  const heatScore = signal.heat === "HOT" ? 40 : signal.heat === "NOTABLE" ? 20 : 8;
  const tierScore = signal.tier === 1 ? 12 : signal.tier === 2 ? 8 : 3;
  const confidenceScore = signal.confidence === "VERIFIED" ? 6 : 2;
  return heatScore + tierScore + confidenceScore;
}

export function assignStreamsAndHeadliners(input: SignalDraft[]): SignalDraft[] {
  const sorted = [...input].sort((a, b) => importanceScore(b) - importanceScore(a));
  const headlinerIds = new Set(sorted.slice(0, 6).map((item) => item.sourceUrl));

  let rank = 1;
  return input.map((item) => {
    if (headlinerIds.has(item.sourceUrl)) {
      return {
        ...item,
        streamKey: "HEADLINERS",
        streamLabel: "Headliners",
        rank: rank++,
      };
    }

    return {
      ...item,
      rank: null,
    };
  });
}
