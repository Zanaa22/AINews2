import { describe, expect, it } from "vitest";

import { classifiedSignalSchema } from "../src/lib/schemas/ingestion";

describe("classifiedSignalSchema", () => {
  it("accepts valid classification payload", () => {
    const result = classifiedSignalSchema.parse({
      title: "Runtime update improves batching",
      summary: "A runtime patch improves batching stability under mixed prompt lengths.",
      rationale: "Classified NOTABLE because this release changes production throughput behavior.",
      heat: "NOTABLE",
      trackKey: "inference-serving",
      trackLabel: "Inference & Serving",
      streamKey: "OPS_RUNTIME",
      streamLabel: "Ops & Runtime",
      confidence: "VERIFIED",
      tier: 1,
      citations: ["https://github.com/example/release"],
    });

    expect(result.trackKey).toBe("inference-serving");
    expect(result.heat).toBe("NOTABLE");
  });

  it("rejects overlong summaries", () => {
    expect(() =>
      classifiedSignalSchema.parse({
        title: "Bad payload",
        summary: "x".repeat(260),
        rationale: "One sentence rationale.",
        heat: "QUIET",
        trackKey: "community-finds",
        trackLabel: "Community Finds",
        streamKey: "WILDS",
        streamLabel: "The Wilds",
        confidence: "UNVERIFIED",
        tier: 3,
        citations: ["https://example.com"],
      }),
    ).toThrowError();
  });
});
