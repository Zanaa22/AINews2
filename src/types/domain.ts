export const HEAT_LEVELS = ["HOT", "NOTABLE", "QUIET"] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export const STREAM_KEYS = [
  "HEADLINERS",
  "TOOLCHAIN",
  "MODELS_METHODS",
  "OPS_RUNTIME",
  "WILDS",
] as const;
export type StreamKey = (typeof STREAM_KEYS)[number];

export const CONFIDENCE_LEVELS = ["VERIFIED", "UNVERIFIED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const SOURCE_TYPES = [
  "RSS",
  "GITHUB_RELEASES",
  "NPM_UPDATES",
  "REDDIT_RSS",
  "CUSTOM_RSS",
] as const;
export type SourceTypeKey = (typeof SOURCE_TYPES)[number];

export const TRACK_DEFINITIONS = [
  { key: "platform-apis", label: "Platform APIs" },
  { key: "sdks-tooling", label: "SDKs & Tooling" },
  { key: "agents-orchestration", label: "Agents & Orchestration" },
  { key: "models-training", label: "Models & Training" },
  { key: "inference-serving", label: "Inference & Serving" },
  { key: "rag-retrieval", label: "RAG & Retrieval" },
  { key: "on-device-edge", label: "On-device & Edge" },
  { key: "hardware-drivers", label: "Hardware & Drivers" },
  { key: "research-benchmarks", label: "Research & Benchmarks" },
  { key: "community-finds", label: "Community Finds" },
] as const;

export type TrackKey = (typeof TRACK_DEFINITIONS)[number]["key"];

export const TRACK_MAP = Object.fromEntries(
  TRACK_DEFINITIONS.map((track) => [track.key, track]),
) as Record<TrackKey, (typeof TRACK_DEFINITIONS)[number]>;

export const STREAM_DEFINITIONS: ReadonlyArray<{ key: StreamKey; label: string }> = [
  { key: "HEADLINERS", label: "Headliners" },
  { key: "TOOLCHAIN", label: "Toolchain" },
  { key: "MODELS_METHODS", label: "Models & Methods" },
  { key: "OPS_RUNTIME", label: "Ops & Runtime" },
  { key: "WILDS", label: "The Wilds" },
];

export const STREAM_MAP = Object.fromEntries(
  STREAM_DEFINITIONS.map((stream) => [stream.key, stream]),
) as Record<StreamKey, (typeof STREAM_DEFINITIONS)[number]>;

export const HEAT_META: Record<HeatLevel, { label: string; color: string; tailwind: string }> = {
  HOT: { label: "HOT", color: "#f97316", tailwind: "bg-orange-500/20 text-orange-200 border-orange-400/50" },
  NOTABLE: { label: "NOTABLE", color: "#d6a84f", tailwind: "bg-amber-500/20 text-amber-200 border-amber-400/50" },
  QUIET: { label: "QUIET", color: "#2f9d8f", tailwind: "bg-teal-500/20 text-teal-200 border-teal-400/50" },
};

export const STREAM_ORDER: StreamKey[] = [
  "HEADLINERS",
  "TOOLCHAIN",
  "MODELS_METHODS",
  "OPS_RUNTIME",
  "WILDS",
];

export const APP_NAME = "Signal Nook";
export const APP_TAGLINE = "Daily AI signals, curated and structured.";
