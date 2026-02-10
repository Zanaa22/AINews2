import OpenAI from "openai";

import { env } from "@/lib/env";
import type { ClassifiedSignal, RawSignalItem } from "@/lib/schemas/ingestion";
import { classifiedSignalSchema } from "@/lib/schemas/ingestion";
import { heuristicClassifyRawItem } from "@/lib/ingestion/heuristics";

const systemPrompt = [
  "You classify AI ecosystem updates into a strict schema for the product Signal Nook.",
  "Return compact JSON only. No markdown, no prose.",
  "Summaries must be <= 240 chars and rationale must be 1-3 sentences.",
  "Citations must include the input sourceUrl at minimum.",
  "Tracks and streams must map to the provided enum values.",
].join(" ");

const developerPrompt = [
  "Allowed heat values: HOT, NOTABLE, QUIET.",
  "Allowed stream keys: HEADLINERS, TOOLCHAIN, MODELS_METHODS, OPS_RUNTIME, WILDS.",
  "Allowed track keys: platform-apis, sdks-tooling, agents-orchestration, models-training, inference-serving, rag-retrieval, on-device-edge, hardware-drivers, research-benchmarks, community-finds.",
  "Track labels must match the official title-cased labels for those keys.",
  "Confidence must be VERIFIED only when the source is clearly official and specific, otherwise UNVERIFIED.",
  "Tier must be integer 1..3.",
].join(" ");

function extractJsonText(raw: string): string {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstCurly = raw.indexOf("{");
  const lastCurly = raw.lastIndexOf("}");
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    return raw.slice(firstCurly, lastCurly + 1).trim();
  }

  return raw.trim();
}

function createClient(): OpenAI | null {
  if (!env.openAiApiKey?.trim()) {
    return null;
  }

  return new OpenAI({ apiKey: env.openAiApiKey });
}

async function requestClassification(client: OpenAI, item: RawSignalItem, simplified = false): Promise<ClassifiedSignal> {
  const userPrompt = {
    sourceUrl: item.sourceUrl,
    sourceDomain: item.sourceDomain,
    providerLabel: item.providerLabel,
    providerKey: item.providerKey,
    sourceTier: item.tier,
    title: item.title,
    snippet: item.snippet,
    publishedAt: item.publishedAt.toISOString(),
    outputNotes: simplified
      ? "Return exact JSON object matching required keys. Keep wording short."
      : "Classify and summarize this signal. Keep output operational and concise.",
  };

  const response = await client.responses.create({
    model: env.openAiModel,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "developer",
        content: [{ type: "input_text", text: developerPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify(userPrompt) }],
      },
    ],
    temperature: simplified ? 0 : 0.2,
    max_output_tokens: 600,
  });

  const responseText = (response as { output_text?: string }).output_text ?? "";
  const parsed = JSON.parse(extractJsonText(responseText));
  const normalized = {
    ...parsed,
    citations: Array.isArray(parsed.citations)
      ? Array.from(new Set([item.sourceUrl, ...parsed.citations]))
      : [item.sourceUrl],
    tier: parsed.tier ?? item.tier,
  };

  return classifiedSignalSchema.parse(normalized);
}

export async function classifyRawItem(item: RawSignalItem): Promise<ClassifiedSignal> {
  const client = createClient();
  if (!client) {
    return heuristicClassifyRawItem(item);
  }

  try {
    return await requestClassification(client, item, false);
  } catch {
    try {
      return await requestClassification(client, item, true);
    } catch {
      return {
        ...heuristicClassifyRawItem(item),
        confidence: "UNVERIFIED",
      };
    }
  }
}
