import { PrismaClient, type Prisma } from "@prisma/client";

import { assignStreamsAndHeadliners, type SignalDraft } from "../src/lib/ingestion/heuristics";
import { STREAM_MAP, TRACK_MAP } from "../src/types/domain";

const prisma = new PrismaClient();

type Heat = "HOT" | "NOTABLE" | "QUIET";

type SignalTemplate = {
  providerKey: string;
  providerLabel: string;
  trackKey: keyof typeof TRACK_MAP;
  streamKey: keyof typeof STREAM_MAP;
  domain: string;
  pathRoot: string;
  titleStem: string;
  summaryStem: string;
  tier: 1 | 2 | 3;
  confidenceBias: "high" | "medium" | "low";
  extraCitation?: string;
};

type EditionSeed = {
  date: string;
  generatedAtUtc: string;
  total: number;
  hot: number;
  notable: number;
  morningNote: string;
};

const signalTemplates: SignalTemplate[] = [
  {
    providerKey: "vercel-ai-sdk-studio",
    providerLabel: "Vercel / AI SDK Studio",
    trackKey: "sdks-tooling",
    streamKey: "TOOLCHAIN",
    domain: "github.com",
    pathRoot: "vercel/ai/releases",
    titleStem: "AI SDK updates transport and structured output ergonomics",
    summaryStem: "Improves typed response handling and stream composition in common agent workflows.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://github.com/vercel/ai",
  },
  {
    providerKey: "openai-platform",
    providerLabel: "OpenAI / Platform",
    trackKey: "platform-apis",
    streamKey: "TOOLCHAIN",
    domain: "platform.openai.com",
    pathRoot: "docs/changelog",
    titleStem: "Platform API changelog introduces request-level observability fields",
    summaryStem: "Developers gain clearer metadata for tracing latency and token usage regressions.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://platform.openai.com/docs/changelog",
  },
  {
    providerKey: "anthropic-docs",
    providerLabel: "Anthropic / Docs",
    trackKey: "platform-apis",
    streamKey: "TOOLCHAIN",
    domain: "docs.anthropic.com",
    pathRoot: "en/changelog",
    titleStem: "Claude API introduces expanded tool-use constraints",
    summaryStem: "Adds stricter runtime control options for enterprise-grade assistant execution.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://docs.anthropic.com/en/changelog",
  },
  {
    providerKey: "langgraph",
    providerLabel: "LangGraph",
    trackKey: "agents-orchestration",
    streamKey: "TOOLCHAIN",
    domain: "github.com",
    pathRoot: "langchain-ai/langgraph/releases",
    titleStem: "LangGraph release tightens checkpoint persistence in multi-agent runs",
    summaryStem: "Reduces replay drift and makes durable orchestration easier to debug.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://github.com/langchain-ai/langgraph",
  },
  {
    providerKey: "llamaindex",
    providerLabel: "LlamaIndex",
    trackKey: "rag-retrieval",
    streamKey: "MODELS_METHODS",
    domain: "docs.llamaindex.ai",
    pathRoot: "en/stable/changelog",
    titleStem: "LlamaIndex adds retriever fusion controls for mixed corpora",
    summaryStem: "Improves precision on multi-source retrieval without increasing prompt length.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://docs.llamaindex.ai/en/stable",
  },
  {
    providerKey: "huggingface",
    providerLabel: "Hugging Face",
    trackKey: "models-training",
    streamKey: "MODELS_METHODS",
    domain: "huggingface.co",
    pathRoot: "blog",
    titleStem: "Model card update highlights new fine-tuning checkpoint family",
    summaryStem: "Shows incremental capability gains for multilingual generation and safety refusal handling.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://huggingface.co/blog",
  },
  {
    providerKey: "mistral-research",
    providerLabel: "Mistral / Research",
    trackKey: "models-training",
    streamKey: "MODELS_METHODS",
    domain: "mistral.ai",
    pathRoot: "news",
    titleStem: "Research note details sparse mixture routing improvements",
    summaryStem: "Targets better compute efficiency under long context evaluation scenarios.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://mistral.ai/news",
  },
  {
    providerKey: "vllm-project",
    providerLabel: "vLLM",
    trackKey: "inference-serving",
    streamKey: "OPS_RUNTIME",
    domain: "github.com",
    pathRoot: "vllm-project/vllm/releases",
    titleStem: "vLLM runtime patch improves batching on mixed prompt lengths",
    summaryStem: "Throughput gains are strongest in bursty workloads with varied token budgets.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://github.com/vllm-project/vllm",
  },
  {
    providerKey: "tensorrt-llm",
    providerLabel: "NVIDIA / TensorRT-LLM",
    trackKey: "hardware-drivers",
    streamKey: "OPS_RUNTIME",
    domain: "nvidia.com",
    pathRoot: "en-us/ai-data-science",
    titleStem: "TensorRT-LLM note tracks kernel-level performance uplift",
    summaryStem: "Highlights lower latency under high concurrency in enterprise serving scenarios.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://nvidia.com/en-us/ai-data-science",
  },
  {
    providerKey: "cloudflare-workers-ai",
    providerLabel: "Cloudflare / Workers AI",
    trackKey: "on-device-edge",
    streamKey: "OPS_RUNTIME",
    domain: "developers.cloudflare.com",
    pathRoot: "workers-ai/changelog",
    titleStem: "Workers AI edge runtime adds cold-start mitigation",
    summaryStem: "Faster first-token response for regional deployments close to user traffic.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://developers.cloudflare.com/workers-ai",
  },
  {
    providerKey: "ollama",
    providerLabel: "Ollama",
    trackKey: "on-device-edge",
    streamKey: "OPS_RUNTIME",
    domain: "github.com",
    pathRoot: "ollama/ollama/releases",
    titleStem: "Ollama build expands local quantization presets",
    summaryStem: "Gives teams more practical memory tradeoffs for laptop-class inference.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://github.com/ollama/ollama",
  },
  {
    providerKey: "pytorch",
    providerLabel: "PyTorch",
    trackKey: "models-training",
    streamKey: "MODELS_METHODS",
    domain: "pytorch.org",
    pathRoot: "blog",
    titleStem: "PyTorch training update narrows optimizer instability edge-cases",
    summaryStem: "Stabilizes long-horizon runs with mixed precision and checkpoint recovery.",
    tier: 1,
    confidenceBias: "high",
    extraCitation: "https://pytorch.org/blog",
  },
  {
    providerKey: "redis-vector",
    providerLabel: "Redis / Vector",
    trackKey: "rag-retrieval",
    streamKey: "MODELS_METHODS",
    domain: "redis.io",
    pathRoot: "blog",
    titleStem: "Redis vector search update improves filtered recall",
    summaryStem: "Cuts retrieval noise for metadata-heavy knowledge bases.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://redis.io/blog",
  },
  {
    providerKey: "npm-registry",
    providerLabel: "npm Registry",
    trackKey: "sdks-tooling",
    streamKey: "TOOLCHAIN",
    domain: "npmjs.com",
    pathRoot: "package",
    titleStem: "Popular package update introduces stricter runtime contract",
    summaryStem: "Can affect downstream agent wrappers relying on older request signatures.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://www.npmjs.com",
  },
  {
    providerKey: "paperswithcode",
    providerLabel: "Papers with Code",
    trackKey: "research-benchmarks",
    streamKey: "MODELS_METHODS",
    domain: "paperswithcode.com",
    pathRoot: "sota",
    titleStem: "Benchmark update refreshes leaderboard for instruction following",
    summaryStem: "Shows narrower performance gaps across open and closed model families.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://paperswithcode.com/sota",
  },
  {
    providerKey: "modal",
    providerLabel: "Modal Labs",
    trackKey: "inference-serving",
    streamKey: "OPS_RUNTIME",
    domain: "modal.com",
    pathRoot: "blog",
    titleStem: "Serving guide introduces finer autoscaling thresholds",
    summaryStem: "Helps teams keep p95 latency stable during bursty model traffic.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://modal.com/blog",
  },
  {
    providerKey: "wandb",
    providerLabel: "Weights & Biases",
    trackKey: "research-benchmarks",
    streamKey: "MODELS_METHODS",
    domain: "wandb.ai",
    pathRoot: "site/articles",
    titleStem: "Evaluation workflow update adds consistency checks",
    summaryStem: "Flags drift between offline benchmark wins and real-world execution quality.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://wandb.ai/site/articles",
  },
  {
    providerKey: "reddit-localllama",
    providerLabel: "Reddit / r/LocalLLaMA",
    trackKey: "community-finds",
    streamKey: "WILDS",
    domain: "reddit.com",
    pathRoot: "r/LocalLLaMA/comments",
    titleStem: "Community thread surfaces practical edge-deployment trick",
    summaryStem: "Useful field report from practitioners shipping local inference stacks.",
    tier: 3,
    confidenceBias: "low",
    extraCitation: "https://www.reddit.com/r/LocalLLaMA",
  },
  {
    providerKey: "devto-community",
    providerLabel: "Dev.to / AI Builders",
    trackKey: "community-finds",
    streamKey: "WILDS",
    domain: "dev.to",
    pathRoot: "tags/ai",
    titleStem: "Community write-up compares agent guardrail patterns",
    summaryStem: "Maps tradeoffs between rule-based and classifier-based runtime controls.",
    tier: 3,
    confidenceBias: "low",
    extraCitation: "https://dev.to/t/ai",
  },
  {
    providerKey: "amd-rocm",
    providerLabel: "AMD / ROCm",
    trackKey: "hardware-drivers",
    streamKey: "OPS_RUNTIME",
    domain: "github.com",
    pathRoot: "ROCm/ROCm/releases",
    titleStem: "ROCm release note improves kernel scheduling consistency",
    summaryStem: "Targets steadier GPU utilization in mixed tensor workloads.",
    tier: 2,
    confidenceBias: "medium",
    extraCitation: "https://github.com/ROCm/ROCm",
  },
];

const sourceSeeds: Array<{
  name: string;
  type: Prisma.SourceCreateInput["type"];
  identifier: string;
  providerLabel: string;
  tier: 1 | 2 | 3;
  enabled: boolean;
}> = [
  {
    name: "OpenAI Changelog",
    type: "RSS",
    identifier: "https://platform.openai.com/docs/changelog/rss.xml",
    providerLabel: "OpenAI / Platform",
    tier: 1,
    enabled: true,
  },
  {
    name: "Vercel AI SDK Releases",
    type: "GITHUB_RELEASES",
    identifier: "vercel/ai",
    providerLabel: "Vercel / AI SDK Studio",
    tier: 1,
    enabled: true,
  },
  {
    name: "LangGraph Releases",
    type: "GITHUB_RELEASES",
    identifier: "langchain-ai/langgraph",
    providerLabel: "LangGraph",
    tier: 1,
    enabled: true,
  },
  {
    name: "vLLM Releases",
    type: "GITHUB_RELEASES",
    identifier: "vllm-project/vllm",
    providerLabel: "vLLM",
    tier: 1,
    enabled: true,
  },
  {
    name: "npm ai package watch",
    type: "NPM_UPDATES",
    identifier: "ai",
    providerLabel: "npm Registry",
    tier: 2,
    enabled: true,
  },
  {
    name: "r/LocalLLaMA",
    type: "REDDIT_RSS",
    identifier: "LocalLLaMA",
    providerLabel: "Reddit / r/LocalLLaMA",
    tier: 3,
    enabled: true,
  },
  {
    name: "Papers with Code",
    type: "RSS",
    identifier: "https://paperswithcode.com/rss.xml",
    providerLabel: "Papers with Code",
    tier: 2,
    enabled: true,
  },
  {
    name: "Custom Vendor Feed",
    type: "CUSTOM_RSS",
    identifier: "https://example.com/ai-feed.xml",
    providerLabel: "Vendor Pulse",
    tier: 2,
    enabled: false,
  },
];

const editionSeeds: EditionSeed[] = [
  {
    date: "2026-02-10",
    generatedAtUtc: "2026-02-10T02:30:00.000Z",
    total: 43,
    hot: 1,
    notable: 16,
    morningNote:
      "The signal mix today is practical rather than headline-heavy, with momentum concentrated in SDK ergonomics, retrieval reliability, and runtime efficiency work. One clear top signal lands in orchestration reliability, while most of the day consists of meaningful but incremental shipping updates. Edge and serving teams should scan Ops & Runtime first for immediate deployment impact. Builder workflows are steadily improving across tooling and API consistency.",
  },
  {
    date: "2026-02-09",
    generatedAtUtc: "2026-02-09T02:30:00.000Z",
    total: 39,
    hot: 2,
    notable: 14,
    morningNote:
      "Yesterday carried a stronger release pulse with two major platform shifts and healthy tooling follow-through. The rest of the stream centered on benchmark clarity and practical ops tuning. Teams running production assistants should review retraining and serving notes together.",
  },
  {
    date: "2026-02-08",
    generatedAtUtc: "2026-02-08T02:30:00.000Z",
    total: 36,
    hot: 1,
    notable: 13,
    morningNote:
      "The edition leaned toward model and evaluation updates, with fewer urgent platform changes. Most items were context-rich and useful for roadmap planning rather than immediate migration. Community experiments also surfaced several reusable implementation patterns.",
  },
  {
    date: "2026-02-07",
    generatedAtUtc: "2026-02-07T02:30:00.000Z",
    total: 34,
    hot: 1,
    notable: 12,
    morningNote:
      "Infrastructure changes dominated this cycle, especially around throughput and hardware behavior under load. API changes were calmer, but several tooling releases improved operational visibility. The net effect is lower runtime friction for mature stacks.",
  },
  {
    date: "2026-02-06",
    generatedAtUtc: "2026-02-06T02:30:00.000Z",
    total: 31,
    hot: 0,
    notable: 11,
    morningNote:
      "Signal density was lighter and mostly incremental, with updates spread across retrieval, package ecosystems, and local deployment workflows. No single event dominated, but steady improvements continue to compound for day-to-day builders.",
  },
];

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(input: T[], seed: number): T[] {
  const array = [...input];
  let state = seed || 1;

  function random() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  }

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function buildHeatPlan(total: number, hot: number, notable: number, seed: number): Heat[] {
  const quiet = total - hot - notable;
  const plan: Heat[] = [
    ...Array.from({ length: hot }, () => "HOT" as const),
    ...Array.from({ length: notable }, () => "NOTABLE" as const),
    ...Array.from({ length: quiet }, () => "QUIET" as const),
  ];
  return seededShuffle(plan, seed);
}

function buildSignalDrafts(edition: EditionSeed): SignalDraft[] {
  const seed = hashCode(edition.date);
  const heatPlan = buildHeatPlan(edition.total, edition.hot, edition.notable, seed);

  const titleSuffixes = [
    "for production teams",
    "with migration notes",
    "with compatibility details",
    "for enterprise adopters",
    "for faster deployment",
    "with benchmark context",
    "and reliability fixes",
    "with runtime hardening",
  ];

  const drafts: SignalDraft[] = [];

  for (let index = 0; index < edition.total; index += 1) {
    const template = signalTemplates[(seed + index) % signalTemplates.length];
    const track = TRACK_MAP[template.trackKey];
    const stream = STREAM_MAP[template.streamKey];
    const heat = heatPlan[index] ?? "QUIET";

    const suffix = titleSuffixes[(seed + index * 7) % titleSuffixes.length];
    const title = `${template.titleStem} ${suffix}`;
    const summary = `${template.summaryStem} Update window: ${edition.date}, item #${index + 1}.`;

    const occurredAtUtc = new Date(`${edition.date}T00:00:00.000Z`);
    occurredAtUtc.setUTCMinutes((index * 37 + seed % 53) % 1440);

    const sourceUrl = `https://${template.domain}/${template.pathRoot}/${edition.date.replace(/-/g, "")}-${index + 1}`;
    const citations = template.extraCitation
      ? [sourceUrl, template.extraCitation]
      : [sourceUrl];

    const confidence: SignalDraft["confidence"] =
      template.confidenceBias === "high" || (heat === "HOT" && template.tier <= 2)
        ? "VERIFIED"
        : template.confidenceBias === "medium"
          ? index % 3 === 0
            ? "VERIFIED"
            : "UNVERIFIED"
          : "UNVERIFIED";

    drafts.push({
      title,
      summary: summary.slice(0, 240),
      rationale:
        heat === "HOT"
          ? "Classified HOT because this update has direct operational impact and changes default behavior for active teams."
          : heat === "NOTABLE"
            ? "Classified NOTABLE because it is meaningful for roadmap or implementation choices this week."
            : "Classified QUIET because it is useful situational context with lower immediate urgency.",
      providerKey: template.providerKey,
      providerLabel: template.providerLabel,
      trackKey: track.key,
      trackLabel: track.label,
      heat,
      streamKey: stream.key,
      streamLabel: stream.label,
      rank: null,
      sourceUrl,
      sourceDomain: template.domain,
      citations,
      confidence,
      tier: template.tier,
      occurredAtUtc,
    });
  }

  return assignStreamsAndHeadliners(drafts);
}

async function seed() {
  await prisma.signal.deleteMany();
  await prisma.ingestionRun.deleteMany();
  await prisma.source.deleteMany();
  await prisma.edition.deleteMany();

  await prisma.source.createMany({ data: sourceSeeds });

  for (const edition of editionSeeds) {
    const drafts = buildSignalDrafts(edition);

    const hotCount = drafts.filter((item) => item.heat === "HOT").length;
    const notableCount = drafts.filter((item) => item.heat === "NOTABLE").length;
    const quietCount = drafts.filter((item) => item.heat === "QUIET").length;

    const createdEdition = await prisma.edition.create({
      data: {
        date: edition.date,
        generatedAtUtc: new Date(edition.generatedAtUtc),
        totalCount: drafts.length,
        hotCount,
        notableCount,
        quietCount,
        morningNote: edition.morningNote,
      },
    });

    const rows: Prisma.SignalCreateManyInput[] = drafts.map((signal) => ({
      editionId: createdEdition.id,
      title: signal.title,
      summary: signal.summary,
      rationale: signal.rationale,
      providerKey: signal.providerKey,
      providerLabel: signal.providerLabel,
      trackKey: signal.trackKey,
      trackLabel: signal.trackLabel,
      heat: signal.heat,
      streamKey: signal.streamKey,
      streamLabel: signal.streamLabel,
      rank: signal.rank,
      sourceUrl: signal.sourceUrl,
      sourceDomain: signal.sourceDomain,
      citations: signal.citations,
      confidence: signal.confidence,
      tier: signal.tier,
      occurredAtUtc: signal.occurredAtUtc,
    }));

    await prisma.signal.createMany({ data: rows });

    await prisma.ingestionRun.create({
      data: {
        editionId: createdEdition.id,
        status: "SUCCESS",
        startedAtUtc: new Date(new Date(edition.generatedAtUtc).getTime() - 1000 * 60 * 3),
        finishedAtUtc: new Date(edition.generatedAtUtc),
        itemsFetched: Math.round(drafts.length * 1.4),
        itemsCreated: drafts.length,
        triggeredBy: "seed",
        logText: `Seeded edition ${edition.date} with ${drafts.length} signals.`,
        logPath: `logs/seed-${edition.date}.log`,
      },
    });
  }

  console.log(`Seed complete: ${editionSeeds.length} editions, ${sourceSeeds.length} sources.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

