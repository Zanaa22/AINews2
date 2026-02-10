import { describe, expect, it } from "vitest";

import { heuristicClassifyRawItem } from "../src/lib/ingestion/heuristics";

describe("heuristic classification", () => {
  it("maps sdk release items to Toolchain", () => {
    const classification = heuristicClassifyRawItem({
      sourceId: "9c4666bb-9cb8-4b40-8b96-a886dd36a001",
      sourceUrl: "https://github.com/vercel/ai/releases/tag/v6",
      sourceDomain: "github.com",
      title: "AI SDK release adds TypeScript tool helpers",
      snippet: "The SDK update includes new package exports and CLI enhancements.",
      publishedAt: new Date("2026-02-10T01:00:00.000Z"),
      providerLabel: "Vercel / AI SDK Studio",
      providerKey: "vercel-ai-sdk-studio",
      tier: 1,
    });

    expect(classification.trackKey).toBe("sdks-tooling");
    expect(classification.streamKey).toBe("TOOLCHAIN");
  });

  it("maps benchmark signals to Models & Methods", () => {
    const classification = heuristicClassifyRawItem({
      sourceId: "0e9560f4-4224-4a18-aaf6-16006d7a6f0d",
      sourceUrl: "https://paperswithcode.com/sota",
      sourceDomain: "paperswithcode.com",
      title: "Benchmark leaderboard updates instruction-following SOTA",
      snippet: "New eval paper reports better benchmark scores across multilingual tasks.",
      publishedAt: new Date("2026-02-10T02:00:00.000Z"),
      providerLabel: "Papers with Code",
      providerKey: "paperswithcode",
      tier: 2,
    });

    expect(classification.trackKey).toBe("research-benchmarks");
    expect(classification.streamKey).toBe("MODELS_METHODS");
  });
});
