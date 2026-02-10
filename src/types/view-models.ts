import type { Confidence, Heat, IngestionStatus, SourceType, StreamKey } from "@prisma/client";

export type SignalView = {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  providerKey: string;
  providerLabel: string;
  trackKey: string;
  trackLabel: string;
  heat: Heat;
  streamKey: StreamKey;
  streamLabel: string;
  rank: number | null;
  sourceUrl: string;
  sourceDomain: string;
  citations: string[];
  confidence: Confidence;
  tier: number;
  occurredAtUtc: string;
};

export type EditionView = {
  id: string;
  date: string;
  generatedAtUtc: string;
  totalCount: number;
  hotCount: number;
  notableCount: number;
  quietCount: number;
  morningNote: string;
  signals: SignalView[];
};

export type SourceView = {
  id: string;
  name: string;
  type: SourceType;
  identifier: string;
  providerLabel: string;
  tier: number;
  enabled: boolean;
  lastFetchedAtUtc: string | null;
  lastError: string | null;
};

export type IngestionRunView = {
  id: string;
  status: IngestionStatus;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  itemsFetched: number;
  itemsCreated: number;
  errorMessage: string | null;
  logPath: string | null;
};
