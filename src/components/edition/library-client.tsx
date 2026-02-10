"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatEditionDate, formatUtcTimestamp } from "@/lib/date";
import { cn } from "@/lib/utils";
import { HEAT_LEVELS } from "@/types/domain";

type LibraryItem = {
  id: string;
  date: string;
  generatedAtUtc: string;
  totalCount: number;
  hotCount: number;
  notableCount: number;
  quietCount: number;
};

type TrendPoint = { date: string; totalCount: number };

type LibraryPayload = {
  total: number;
  page: number;
  pageSize: number;
  items: LibraryItem[];
  trend: TrendPoint[];
};

function Sparkline({ points }: { points: TrendPoint[] }) {
  const dimensions = { width: 120, height: 32 };
  const values = points.map((point) => point.totalCount);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);

  const d = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * dimensions.width;
      const y =
        dimensions.height -
        ((point.totalCount - min) / Math.max(1, max - min)) * (dimensions.height - 4) -
        2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} aria-hidden>
      <path d={d} fill="none" stroke="rgba(103,232,249,0.9)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LibraryClient({ initial }: { initial: LibraryPayload }) {
  const [payload, setPayload] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateQuery, setDateQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [heat, setHeat] = useState<"ALL" | (typeof HEAT_LEVELS)[number]>("ALL");
  const [page, setPage] = useState(1);

  const debouncedKeyword = useMemo(() => keywordQuery.trim(), [keywordQuery]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateQuery.trim()) {
        params.set("date", dateQuery.trim());
      }
      if (debouncedKeyword) {
        params.set("q", debouncedKeyword);
      }
      if (heat !== "ALL") {
        params.set("heat", heat);
      }
      params.set("page", String(page));
      params.set("pageSize", "20");

      try {
        const response = await fetch(`/api/library?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load library data");
        }
        const data = (await response.json()) as LibraryPayload;
        setPayload(data);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load library";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [dateQuery, debouncedKeyword, heat, page]);

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-500" />
            <Input
              placeholder="Keyword across signals"
              value={keywordQuery}
              onChange={(event) => {
                setPage(1);
                setKeywordQuery(event.target.value);
              }}
              className="border-white/15 bg-zinc-950/70 pl-9 text-zinc-100"
            />
          </div>
          <Input
            placeholder="Search date (YYYY-MM-DD)"
            value={dateQuery}
            onChange={(event) => {
              setPage(1);
              setDateQuery(event.target.value);
            }}
            className="border-white/15 bg-zinc-950/70 text-zinc-100"
          />

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={heat === "ALL" ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setHeat("ALL");
              }}
              className={cn(
                heat === "ALL" ? "bg-cyan-500 text-zinc-950" : "border-white/20 text-zinc-200",
              )}
            >
              All
            </Button>
            {HEAT_LEVELS.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={heat === item ? "default" : "outline"}
                onClick={() => {
                  setPage(1);
                  setHeat(item);
                }}
                className={cn(
                  heat === item ? "bg-cyan-500 text-zinc-950" : "border-white/20 text-zinc-200",
                )}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-zinc-300">
          {loading ? "Refreshing edition library..." : `${payload.total} editions found`}
        </div>

        {error ? (
          <div className="px-4 py-6 text-sm text-red-300">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current)}
              className="ml-3 border-white/20 text-zinc-200"
            >
              Retry
            </Button>
          </div>
        ) : payload.items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">No editions match this search.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {payload.items.map((item) => (
              <article key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <Link
                    href={`/editions/${item.date}`}
                    className="text-lg font-semibold text-zinc-100 hover:text-cyan-200"
                  >
                    {formatEditionDate(item.date)}
                  </Link>
                  <p className="text-xs text-zinc-400">Generated {formatUtcTimestamp(item.generatedAtUtc)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="border-white/15 bg-white/[0.03] text-zinc-200">
                      {item.totalCount} total
                    </Badge>
                    <Badge className="border-orange-400/40 bg-orange-500/20 text-orange-200">HOT {item.hotCount}</Badge>
                    <Badge className="border-amber-400/40 bg-amber-500/20 text-amber-200">
                      NOTABLE {item.notableCount}
                    </Badge>
                    <Badge className="border-teal-400/40 bg-teal-500/20 text-teal-200">QUIET {item.quietCount}</Badge>
                  </div>
                </div>
                <div className="justify-self-start sm:justify-self-end">
                  <Sparkline points={payload.trend} />
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || loading}
            className="border-white/20 text-zinc-200"
          >
            Previous
          </Button>
          <span className="text-xs text-zinc-400">Page {payload.page}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={loading || payload.page * payload.pageSize >= payload.total}
            className="border-white/20 text-zinc-200"
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
