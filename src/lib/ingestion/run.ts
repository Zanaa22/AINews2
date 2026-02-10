import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IngestionStatus, Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import { assignStreamsAndHeadliners, type SignalDraft } from "@/lib/ingestion/heuristics";
import { fetchSourceItems } from "@/lib/ingestion/fetchers";
import { classifyRawItem } from "@/lib/ingestion/openai-classifier";
import { ingestionArgsSchema } from "@/lib/schemas/ingestion";
import { prisma } from "@/lib/prisma";
import { dedupeByCanonicalUrl } from "@/lib/url";
import { formatEditionDate, toEditionDate } from "@/lib/date";

export type IngestionResult = {
  runId: string;
  editionDate: string;
  status: IngestionStatus;
  itemsFetched: number;
  itemsCreated: number;
  sourceErrors: number;
  classificationErrors: number;
  logPath: string | null;
};

function buildMorningNote(date: string, signals: SignalDraft[]): string {
  if (!signals.length) {
    return `Signal Nook found no eligible signals for ${formatEditionDate(date)}. Check source health and rerun ingestion once feeds are restored.`;
  }

  const trackCounts = new Map<string, number>();
  for (const signal of signals) {
    trackCounts.set(signal.trackLabel, (trackCounts.get(signal.trackLabel) ?? 0) + 1);
  }

  const topTracks = Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([track]) => track);

  const headliner = signals
    .filter((signal) => signal.streamKey === "HEADLINERS")
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0];

  return [
    `Today leans toward ${topTracks.join(", ")} with ${signals.length} curated signals total.`,
    headliner
      ? `Top movement: ${headliner.title}.`
      : "No headliner ranked today due to limited confidence signals.",
    "Most items are incremental rather than disruptive, but several workflow updates are worth immediate review.",
    "Use stream filters to jump from broad context to implementation-ready changes.",
  ].join(" ");
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ingestion error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function runIngestion(input: {
  date?: string;
  triggeredBy?: string;
  maxItems?: number;
} = {}): Promise<IngestionResult> {
  const args = ingestionArgsSchema.parse({
    date: input.date,
    triggeredBy: input.triggeredBy ?? "manual",
    maxItems: input.maxItems,
  });

  const editionDate = args.date ?? toEditionDate(new Date());
  const maxItems = args.maxItems ?? env.ingestionMaxItems;
  const logs: string[] = [];

  const run = await prisma.ingestionRun.create({
    data: {
      status: "RUNNING",
      startedAtUtc: new Date(),
      triggeredBy: args.triggeredBy,
    },
  });

  let sourceErrors = 0;
  let classificationErrors = 0;
  let itemsFetched = 0;
  let itemsCreated = 0;
  let status: IngestionStatus = "SUCCESS";
  let logPath: string | null = null;

  try {
    logs.push(`[run:${run.id}] Starting ingestion for ${editionDate}`);

    const sources = await prisma.source.findMany({
      where: { enabled: true },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    });

    logs.push(`Enabled sources: ${sources.length}`);

    const fetchedBatches = await Promise.all(
      sources.map(async (source) => {
        try {
          const items = await withTimeout(
            fetchSourceItems(source, Math.ceil(maxItems / Math.max(1, sources.length)) + 2),
            12000,
            `fetch:${source.name}`,
          );
          await prisma.source.update({
            where: { id: source.id },
            data: {
              lastFetchedAtUtc: new Date(),
              lastError: null,
            },
          });
          logs.push(`${source.name}: fetched ${items.length} items`);
          return items;
        } catch (error) {
          sourceErrors += 1;
          const message = asErrorMessage(error);
          logs.push(`${source.name}: fetch failed (${message})`);
          await prisma.source.update({
            where: { id: source.id },
            data: {
              lastError: message.slice(0, 500),
            },
          });
          return [];
        }
      }),
    );

    const fetchedItems = fetchedBatches.flat();
    itemsFetched = fetchedItems.length;
    const dedupedItems = dedupeByCanonicalUrl(fetchedItems).slice(0, maxItems);
    logs.push(`After canonical dedupe: ${dedupedItems.length}`);

    const classified: SignalDraft[] = [];

    for (const item of dedupedItems) {
      try {
        const classification = await classifyRawItem(item);
        classified.push({
          ...classification,
          sourceUrl: item.sourceUrl,
          sourceDomain: item.sourceDomain,
          providerKey: item.providerKey,
          providerLabel: item.providerLabel,
          occurredAtUtc: item.publishedAt,
          rank: null,
          citations: Array.from(new Set([item.sourceUrl, ...classification.citations])),
        });
      } catch (error) {
        classificationErrors += 1;
        logs.push(`Classify failed for ${item.sourceUrl}: ${asErrorMessage(error)}`);
      }
    }

    const withHeadliners = assignStreamsAndHeadliners(classified);
    itemsCreated = withHeadliners.length;

    const hotCount = withHeadliners.filter((item) => item.heat === "HOT").length;
    const notableCount = withHeadliners.filter((item) => item.heat === "NOTABLE").length;
    const quietCount = withHeadliners.filter((item) => item.heat === "QUIET").length;
    const morningNote = buildMorningNote(editionDate, withHeadliners);

    const edition = await prisma.$transaction(async (tx) => {
      const upserted = await tx.edition.upsert({
        where: { date: editionDate },
        create: {
          date: editionDate,
          generatedAtUtc: new Date(),
          totalCount: withHeadliners.length,
          hotCount,
          notableCount,
          quietCount,
          morningNote,
        },
        update: {
          generatedAtUtc: new Date(),
          totalCount: withHeadliners.length,
          hotCount,
          notableCount,
          quietCount,
          morningNote,
        },
      });

      await tx.signal.deleteMany({ where: { editionId: upserted.id } });

      if (withHeadliners.length) {
        const rows: Prisma.SignalCreateManyInput[] = withHeadliners.map((signal) => ({
          editionId: upserted.id,
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

        await tx.signal.createMany({ data: rows });
      }

      return upserted;
    });

    if (classificationErrors > 0 || sourceErrors > 0) {
      status = withHeadliners.length ? "PARTIAL" : "FAILED";
    }

    if (!withHeadliners.length) {
      status = "FAILED";
    }

    logs.push(`Signals persisted: ${withHeadliners.length}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir(path.join(process.cwd(), "logs"), { recursive: true });
    logPath = path.join("logs", `ingestion-${editionDate}-${timestamp}.log`);
    const logText = logs.join("\n");
    await writeFile(path.join(process.cwd(), logPath), logText, "utf8");

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        editionId: edition.id,
        status,
        finishedAtUtc: new Date(),
        itemsFetched,
        itemsCreated,
        errorMessage: status === "FAILED" ? "No signals were created." : null,
        logText,
        logPath,
      },
    });

    return {
      runId: run.id,
      editionDate,
      status,
      itemsFetched,
      itemsCreated,
      sourceErrors,
      classificationErrors,
      logPath,
    };
  } catch (error) {
    status = "FAILED";
    const message = asErrorMessage(error);
    logs.push(`Fatal error: ${message}`);

    const logText = logs.join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir(path.join(process.cwd(), "logs"), { recursive: true });
    logPath = path.join("logs", `ingestion-${editionDate}-${timestamp}.log`);
    await writeFile(path.join(process.cwd(), logPath), logText, "utf8");

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAtUtc: new Date(),
        itemsFetched,
        itemsCreated,
        errorMessage: message,
        logText,
        logPath,
      },
    });

    return {
      runId: run.id,
      editionDate,
      status,
      itemsFetched,
      itemsCreated,
      sourceErrors,
      classificationErrors,
      logPath,
    };
  }
}
