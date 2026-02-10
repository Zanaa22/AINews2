import type { Heat, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { env, hasOpenAiKey } from "@/lib/env";
import { fetchSourceItems } from "@/lib/ingestion/fetchers";
import { sourceCreateSchema } from "@/lib/schemas/ingestion";
import type {
  EditionView,
  IngestionRunView,
  SignalView,
  SourceView,
} from "@/types/view-models";

function asCitationArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function serializeSignal(signal: {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  providerKey: string;
  providerLabel: string;
  trackKey: string;
  trackLabel: string;
  heat: Heat;
  streamKey: SignalView["streamKey"];
  streamLabel: string;
  rank: number | null;
  sourceUrl: string;
  sourceDomain: string;
  citations: Prisma.JsonValue;
  confidence: SignalView["confidence"];
  tier: number;
  occurredAtUtc: Date;
}): SignalView {
  return {
    ...signal,
    citations: asCitationArray(signal.citations),
    occurredAtUtc: signal.occurredAtUtc.toISOString(),
  };
}

function serializeEdition(edition: {
  id: string;
  date: string;
  generatedAtUtc: Date;
  totalCount: number;
  hotCount: number;
  notableCount: number;
  quietCount: number;
  morningNote: string;
  signals: Array<Parameters<typeof serializeSignal>[0]>;
}): EditionView {
  return {
    id: edition.id,
    date: edition.date,
    generatedAtUtc: edition.generatedAtUtc.toISOString(),
    totalCount: edition.totalCount,
    hotCount: edition.hotCount,
    notableCount: edition.notableCount,
    quietCount: edition.quietCount,
    morningNote: edition.morningNote,
    signals: edition.signals.map(serializeSignal),
  };
}

const editionInclude = {
  signals: {
    orderBy: [{ rank: "asc" as const }, { occurredAtUtc: "desc" as const }],
  },
};

export async function getLatestEdition(): Promise<EditionView | null> {
  const edition = await prisma.edition.findFirst({
    orderBy: [{ date: "desc" }],
    include: editionInclude,
  });

  if (!edition) {
    return null;
  }

  return serializeEdition(edition);
}

export async function getEditionByDate(date: string): Promise<EditionView | null> {
  const edition = await prisma.edition.findUnique({
    where: { date },
    include: editionInclude,
  });

  if (!edition) {
    return null;
  }

  return serializeEdition(edition);
}

export async function listEditionDates(limit = 35): Promise<string[]> {
  const editions = await prisma.edition.findMany({
    select: { date: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return editions.map((edition) => edition.date);
}

export async function listLibraryEditions(params: {
  page?: number;
  pageSize?: number;
  dateQuery?: string;
  keyword?: string;
  heat?: Heat | "ALL";
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 20, 50));
  const keyword = params.keyword?.trim();
  const dateQuery = params.dateQuery?.trim();

  const signalConditions: Prisma.SignalWhereInput[] = [];
  if (keyword) {
    signalConditions.push({
      OR: [
        { title: { contains: keyword } },
        { summary: { contains: keyword } },
      ],
    });
  }

  if (params.heat && params.heat !== "ALL") {
    signalConditions.push({ heat: params.heat });
  }

  const where: Prisma.EditionWhereInput = {
    ...(dateQuery ? { date: { contains: dateQuery } } : {}),
    ...(signalConditions.length
      ? {
          signals: {
            some: {
              AND: signalConditions,
            },
          },
        }
      : {}),
  };

  const [total, editions, trend] = await Promise.all([
    prisma.edition.count({ where }),
    prisma.edition.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        generatedAtUtc: true,
        totalCount: true,
        hotCount: true,
        notableCount: true,
        quietCount: true,
      },
    }),
    prisma.edition.findMany({
      orderBy: { date: "desc" },
      take: 14,
      select: {
        date: true,
        totalCount: true,
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    items: editions.map((edition) => ({
      ...edition,
      generatedAtUtc: edition.generatedAtUtc.toISOString(),
    })),
    trend: trend
      .reverse()
      .map((entry) => ({ date: entry.date, totalCount: entry.totalCount })),
  };
}

export async function searchSignalsByKeyword(keyword: string): Promise<SignalView[]> {
  const q = keyword.trim();
  if (!q) {
    return [];
  }

  const signals = await prisma.signal.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { summary: { contains: q } },
      ],
    },
    orderBy: { occurredAtUtc: "desc" },
    take: 100,
  });

  return signals.map(serializeSignal);
}

export async function listSources(): Promise<SourceView[]> {
  const sources = await prisma.source.findMany({
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    identifier: source.identifier,
    providerLabel: source.providerLabel,
    tier: source.tier,
    enabled: source.enabled,
    lastFetchedAtUtc: source.lastFetchedAtUtc?.toISOString() ?? null,
    lastError: source.lastError,
  }));
}

export async function createSource(payload: unknown): Promise<SourceView> {
  const input = sourceCreateSchema.parse(payload);
  const source = await prisma.source.create({
    data: input,
  });

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    identifier: source.identifier,
    providerLabel: source.providerLabel,
    tier: source.tier,
    enabled: source.enabled,
    lastFetchedAtUtc: source.lastFetchedAtUtc?.toISOString() ?? null,
    lastError: source.lastError,
  };
}

export async function toggleSource(id: string, enabled: boolean): Promise<SourceView> {
  const source = await prisma.source.update({
    where: { id },
    data: { enabled },
  });

  return {
    id: source.id,
    name: source.name,
    type: source.type,
    identifier: source.identifier,
    providerLabel: source.providerLabel,
    tier: source.tier,
    enabled: source.enabled,
    lastFetchedAtUtc: source.lastFetchedAtUtc?.toISOString() ?? null,
    lastError: source.lastError,
  };
}

export async function testSourceFetch(id: string) {
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) {
    throw new Error("Source not found");
  }

  const items = await fetchSourceItems(source, 4);

  return items.map((item) => ({
    title: item.title,
    sourceUrl: item.sourceUrl,
    sourceDomain: item.sourceDomain,
    publishedAt: item.publishedAt.toISOString(),
    snippet: item.snippet,
  }));
}

export async function getHealthSnapshot() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return {
      dbStatus: "down" as const,
      openAiKeyPresent: hasOpenAiKey(),
      lastRun: null,
    };
  }

  const lastRun = await prisma.ingestionRun.findFirst({
    orderBy: { startedAtUtc: "desc" },
    select: {
      id: true,
      status: true,
      startedAtUtc: true,
      finishedAtUtc: true,
      itemsFetched: true,
      itemsCreated: true,
    },
  });

  return {
    dbStatus: "ok" as const,
    openAiKeyPresent: hasOpenAiKey(),
    model: env.openAiModel,
    lastRun: lastRun
      ? {
          ...lastRun,
          startedAtUtc: lastRun.startedAtUtc.toISOString(),
          finishedAtUtc: lastRun.finishedAtUtc?.toISOString() ?? null,
        }
      : null,
  };
}

export async function listIngestionRuns(limit = 25): Promise<IngestionRunView[]> {
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAtUtc: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  return runs.map((run) => ({
    id: run.id,
    status: run.status,
    startedAtUtc: run.startedAtUtc.toISOString(),
    finishedAtUtc: run.finishedAtUtc?.toISOString() ?? null,
    itemsFetched: run.itemsFetched,
    itemsCreated: run.itemsCreated,
    errorMessage: run.errorMessage,
    logPath: run.logPath,
  }));
}

export async function getRunLog(id: string): Promise<{ id: string; logText: string } | null> {
  const run = await prisma.ingestionRun.findUnique({
    where: { id },
    select: { id: true, logText: true },
  });

  if (!run) {
    return null;
  }

  return {
    id: run.id,
    logText: run.logText ?? "",
  };
}

export async function getLatestRunLog(): Promise<{ id: string; logText: string } | null> {
  const run = await prisma.ingestionRun.findFirst({
    orderBy: { startedAtUtc: "desc" },
    select: { id: true, logText: true },
  });

  if (!run) {
    return null;
  }

  return {
    id: run.id,
    logText: run.logText ?? "",
  };
}
