"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Flame,
  Link2,
  ListFilter,
  Pin,
  PinOff,
  Search,
  Table2,
  Upload,
} from "lucide-react";

import type { EditionView, SignalView } from "@/types/view-models";
import {
  HEAT_LEVELS,
  HEAT_META,
  STREAM_DEFINITIONS,
  STREAM_ORDER,
  TRACK_DEFINITIONS,
} from "@/types/domain";
import { formatEditionDate, formatUtcTimestamp } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PIN_STORAGE_KEY = "signal-nook:pinned-signals";

type PinnedSignal = Pick<
  SignalView,
  "id" | "title" | "heat" | "trackLabel" | "sourceUrl" | "providerLabel"
>;

function summarizeSignals(signals: SignalView[]): string {
  return signals
    .map((signal) => `- ${signal.title} (${signal.trackLabel}, ${signal.heat})`)
    .join("\n");
}

function toMarkdown(edition: EditionView, signals: SignalView[]): string {
  const lines = [
    `# Signal Nook Edition — ${formatEditionDate(edition.date)}`,
    "",
    `Generated: ${formatUtcTimestamp(edition.generatedAtUtc)}`,
    `Total: ${signals.length}`,
    "",
    "## Morning Note",
    edition.morningNote,
    "",
    "## Signals",
    summarizeSignals(signals),
  ];

  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim();
}

export function EditionWorkspace({ edition }: { edition: EditionView }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedSignal, setSelectedSignal] = useState<SignalView | null>(null);
  const [pinned, setPinned] = useState<Record<string, PinnedSignal>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, PinnedSignal>) : {};
    } catch {
      return {};
    }
  });

  const track = normalizeQuery(searchParams.get("track"));
  const heat = normalizeQuery(searchParams.get("heat"));
  const q = normalizeQuery(searchParams.get("q"));
  const stream = normalizeQuery(searchParams.get("stream"));
  const view = normalizeQuery(searchParams.get("view")) === "compact" ? "compact" : "cards";

  function persistPinned(next: Record<string, PinnedSignal>) {
    setPinned(next);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
  }

  function togglePinned(signal: SignalView) {
    const next = { ...pinned };
    if (next[signal.id]) {
      delete next[signal.id];
    } else {
      next[signal.id] = {
        id: signal.id,
        title: signal.title,
        heat: signal.heat,
        trackLabel: signal.trackLabel,
        sourceUrl: signal.sourceUrl,
        providerLabel: signal.providerLabel,
      };
    }

    persistPinned(next);
  }

  function updateQuery(name: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL") {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  const filteredSignals = useMemo(() => {
    return edition.signals.filter((signal) => {
      if (track && signal.trackKey !== track) {
        return false;
      }

      if (heat && signal.heat !== heat) {
        return false;
      }

      if (stream && signal.streamKey !== stream) {
        return false;
      }

      if (q) {
        const hay = `${signal.title} ${signal.summary}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [edition.signals, heat, q, stream, track]);

  const grouped = useMemo(() => {
    return STREAM_ORDER.map((streamKey) => ({
      stream: STREAM_DEFINITIONS.find((streamDef) => streamDef.key === streamKey),
      items: filteredSignals
        .filter((signal) => signal.streamKey === streamKey)
        .sort((a, b) => {
          if (streamKey === "HEADLINERS") {
            return (a.rank ?? 99) - (b.rank ?? 99);
          }
          return new Date(b.occurredAtUtc).getTime() - new Date(a.occurredAtUtc).getTime();
        }),
    }));
  }, [filteredSignals]);

  const pinnedItems = Object.values(pinned);

  const subHeader = `~${edition.totalCount} signals · HOT ${edition.hotCount} · NOTABLE ${edition.notableCount} · QUIET ${edition.quietCount} · Generated ${formatUtcTimestamp(edition.generatedAtUtc)}`;

  function exportMarkdown() {
    downloadFile(`signal-nook-${edition.date}.md`, toMarkdown(edition, filteredSignals), "text/markdown;charset=utf-8");
  }

  function exportJson() {
    downloadFile(
      `signal-nook-${edition.date}.json`,
      JSON.stringify({ ...edition, signals: filteredSignals }, null, 2),
      "application/json;charset=utf-8",
    );
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  function copySignalMarkdown(signal: SignalView) {
    const content = `### ${signal.title}\n\n${signal.summary}\n\n- Heat: ${signal.heat}\n- Track: ${signal.trackLabel}\n- Provider: ${signal.providerLabel}\n- Source: ${signal.sourceUrl}`;
    navigator.clipboard.writeText(content).catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Edition</p>
          <h1 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">Edition — {formatEditionDate(edition.date)}</h1>
          <p className="text-sm text-zinc-400">{subHeader}</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <article className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100 shadow-inner shadow-black/20">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Morning Note</p>
            <p className="mt-2 leading-relaxed">{edition.morningNote}</p>
          </article>

          <div className="flex flex-wrap items-start gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-cyan-300/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-400/20"
                >
                  <Upload className="size-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-white/10 bg-zinc-900 text-zinc-100" align="end">
                <DropdownMenuItem onClick={exportMarkdown}>Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson}>JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink}>Copy link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
              <Button
                size="sm"
                variant={view === "cards" ? "default" : "ghost"}
                onClick={() => updateQuery("view", "cards")}
                className={cn(
                  "h-8",
                  view === "cards" ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400" : "text-zinc-300",
                )}
              >
                Cards
              </Button>
              <Button
                size="sm"
                variant={view === "compact" ? "default" : "ghost"}
                onClick={() => updateQuery("view", "compact")}
                className={cn(
                  "h-8",
                  view === "compact" ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400" : "text-zinc-300",
                )}
              >
                <Table2 className="size-4" />
                Compact
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="glass-panel p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-500" />
                <Input
                  aria-label="Search signals"
                  placeholder="Search title or summary"
                  value={q}
                  onChange={(event) => updateQuery("q", event.target.value.trim() || undefined)}
                  className="border-white/15 bg-zinc-950/70 pl-9 text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={!heat ? "default" : "outline"}
                  onClick={() => updateQuery("heat", undefined)}
                  className={cn(
                    "h-8 whitespace-nowrap",
                    !heat ? "bg-cyan-500 text-zinc-950" : "border-white/20 bg-transparent text-zinc-200",
                  )}
                >
                  All heat
                </Button>
                {HEAT_LEVELS.map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={heat === item ? "default" : "outline"}
                    onClick={() => updateQuery("heat", item)}
                    className={cn(
                      "h-8 whitespace-nowrap",
                      heat === item
                        ? "bg-cyan-500 text-zinc-950"
                        : "border-white/20 bg-transparent text-zinc-200",
                    )}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-white/20 bg-transparent text-zinc-200">
                    <ListFilter className="size-4" />
                    Stream
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-white/10 bg-zinc-900 text-zinc-100" align="end">
                  <DropdownMenuItem onClick={() => updateQuery("stream", undefined)}>
                    All streams
                  </DropdownMenuItem>
                  {STREAM_DEFINITIONS.map((item) => (
                    <DropdownMenuItem key={item.key} onClick={() => updateQuery("stream", item.key)}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 -mx-1 overflow-x-auto px-1">
              <div className="flex min-w-max gap-2">
                <Button
                  size="sm"
                  variant={!track ? "default" : "outline"}
                  onClick={() => updateQuery("track", undefined)}
                  className={cn(
                    "h-8 whitespace-nowrap",
                    !track ? "bg-cyan-500 text-zinc-950" : "border-white/20 bg-transparent text-zinc-200",
                  )}
                >
                  All tracks
                </Button>
                {TRACK_DEFINITIONS.map((item) => (
                  <Button
                    key={item.key}
                    size="sm"
                    variant={track === item.key ? "default" : "outline"}
                    onClick={() => updateQuery("track", item.key)}
                    className={cn(
                      "h-8 whitespace-nowrap",
                      track === item.key
                        ? "bg-cyan-500 text-zinc-950"
                        : "border-white/20 bg-transparent text-zinc-200",
                    )}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {view === "cards" ? (
            <div className="space-y-5">
              {grouped.map(({ stream, items }) => {
                if (!stream || items.length === 0) {
                  return null;
                }

                return (
                  <section key={stream.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-100">{stream.label}</h2>
                      <span className="text-xs uppercase tracking-[0.14em] text-zinc-400">{items.length} signals</span>
                    </div>

                    <div className="space-y-3">
                      {items.map((signal) => (
                        <article
                          key={signal.id}
                          className={cn(
                            "glass-panel rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-cyan-300/25",
                            signal.heat === "HOT"
                              ? "heat-edge-hot"
                              : signal.heat === "NOTABLE"
                                ? "heat-edge-notable"
                                : "heat-edge-quiet",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border", HEAT_META[signal.heat].tailwind)}>{signal.heat}</Badge>
                            <Badge variant="outline" className="border-white/15 bg-zinc-800/60 text-zinc-200">
                              {signal.trackLabel}
                            </Badge>
                            <Badge variant="outline" className="border-white/15 bg-zinc-900 text-zinc-300">
                              {signal.sourceDomain}
                            </Badge>
                            {signal.rank ? (
                              <Badge className="border-amber-200/40 bg-amber-300/15 text-amber-100">#{signal.rank}</Badge>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-base font-semibold text-zinc-100 sm:text-lg">{signal.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{signal.summary}</p>

                          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                            <span>{signal.providerLabel}</span>
                            <span>{formatUtcTimestamp(signal.occurredAtUtc)}</span>
                            <span>{signal.confidence === "VERIFIED" ? "Verified" : "Unverified"}</span>
                            <span>Tier {signal.tier}</span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline" className="border-white/15 bg-transparent text-zinc-200">
                              <a href={signal.sourceUrl} target="_blank" rel="noreferrer noopener">
                                <ExternalLink className="size-3.5" />
                                Open source
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePinned(signal)}
                              className="border-white/15 bg-transparent text-zinc-200"
                            >
                              {pinned[signal.id] ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                              {pinned[signal.id] ? "Unpin" : "Pin"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setSelectedSignal(signal)}
                              className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                            >
                              Details
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}

              {filteredSignals.length === 0 ? (
                <div className="glass-panel p-8 text-center text-sm text-zinc-300">
                  No signals match these filters. Clear one or more filters and retry.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.14em] text-zinc-400">
                    <tr>
                      <th className="px-3 py-2">Heat</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Track</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Domain</th>
                      <th className="px-3 py-2 text-right">Pin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSignals.map((signal) => (
                      <tr key={signal.id} className="bg-transparent transition hover:bg-white/[0.04]">
                        <td className="px-3 py-2">
                          <Badge className={cn("border", HEAT_META[signal.heat].tailwind)}>{signal.heat}</Badge>
                        </td>
                        <td className="max-w-xl px-3 py-2 font-medium text-zinc-100">{signal.title}</td>
                        <td className="px-3 py-2 text-zinc-300">{signal.trackLabel}</td>
                        <td className="px-3 py-2 text-zinc-300">{signal.providerLabel}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                          {formatUtcTimestamp(signal.occurredAtUtc)}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">{signal.sourceDomain}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={pinned[signal.id] ? "Unpin signal" : "Pin signal"}
                            onClick={() => togglePinned(signal)}
                            className="text-zinc-300 hover:text-cyan-200"
                          >
                            <Pin className={cn("size-4", pinned[signal.id] ? "fill-cyan-300 text-cyan-300" : "")} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:h-fit">
          <div className="hidden space-y-3 xl:block">
            <section className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Filters</h3>
              <div className="mt-3 space-y-2">
                <label className="block space-y-1 text-xs text-zinc-400">
                  <span>Heat</span>
                  <select
                    value={heat || "ALL"}
                    onChange={(event) =>
                      updateQuery("heat", event.target.value === "ALL" ? undefined : event.target.value)
                    }
                    className="h-8 w-full rounded-md border border-white/15 bg-zinc-900 px-2 text-sm text-zinc-100"
                  >
                    <option value="ALL">All</option>
                    {HEAT_LEVELS.map((item) => (
                      <option key={item} value={item} className="bg-zinc-900">
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-xs text-zinc-400">
                  <span>Stream</span>
                  <select
                    value={stream || "ALL"}
                    onChange={(event) =>
                      updateQuery("stream", event.target.value === "ALL" ? undefined : event.target.value)
                    }
                    className="h-8 w-full rounded-md border border-white/15 bg-zinc-900 px-2 text-sm text-zinc-100"
                  >
                    <option value="ALL">All streams</option>
                    {STREAM_DEFINITIONS.map((item) => (
                      <option key={item.key} value={item.key} className="bg-zinc-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-zinc-200"
                  onClick={() => {
                    updateQuery("track", undefined);
                    updateQuery("heat", undefined);
                    updateQuery("q", undefined);
                    updateQuery("stream", undefined);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </section>

            <section className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Pinned Signals</h3>
              <div className="mt-3 space-y-2">
                {pinnedItems.length === 0 ? (
                  <p className="text-sm text-zinc-400">Pin signals to keep them in this rail.</p>
                ) : (
                  pinnedItems.slice(0, 8).map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                      <p className="line-clamp-2 text-sm text-zinc-200">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{item.providerLabel}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge className={cn("border", HEAT_META[item.heat].tailwind)}>{item.heat}</Badge>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs text-cyan-200 hover:text-cyan-100"
                        >
                          Open
                        </a>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Export</h3>
              <p className="mt-1 text-sm text-zinc-400">Download filtered results or copy a shareable link.</p>
              <div className="mt-3 space-y-2">
                <Button onClick={exportMarkdown} className="w-full bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
                  Markdown
                </Button>
                <Button onClick={exportJson} variant="outline" className="w-full border-white/20 text-zinc-200">
                  JSON
                </Button>
                <Button onClick={copyLink} variant="outline" className="w-full border-white/20 text-zinc-200">
                  <Link2 className="size-4" />
                  Copy link
                </Button>
              </div>
            </section>
          </div>

          <Collapsible className="glass-panel p-3 xl:hidden">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full border-white/20 text-zinc-200">
                <Flame className="size-4" />
                Filters, pinned, export
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <h3 className="text-sm font-semibold text-zinc-100">Filters</h3>
                <div className="mt-2 space-y-2">
                  <select
                    value={heat || "ALL"}
                    onChange={(event) =>
                      updateQuery("heat", event.target.value === "ALL" ? undefined : event.target.value)
                    }
                    className="h-8 w-full rounded-md border border-white/15 bg-zinc-900 px-2 text-sm text-zinc-100"
                  >
                    <option value="ALL">All heat</option>
                    {HEAT_LEVELS.map((item) => (
                      <option key={item} value={item} className="bg-zinc-900">
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={stream || "ALL"}
                    onChange={(event) =>
                      updateQuery("stream", event.target.value === "ALL" ? undefined : event.target.value)
                    }
                    className="h-8 w-full rounded-md border border-white/15 bg-zinc-900 px-2 text-sm text-zinc-100"
                  >
                    <option value="ALL">All streams</option>
                    {STREAM_DEFINITIONS.map((item) => (
                      <option key={item.key} value={item.key} className="bg-zinc-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
              <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <h3 className="text-sm font-semibold text-zinc-100">Pinned</h3>
                <p className="mt-1 text-sm text-zinc-400">{pinnedItems.length} pinned signals.</p>
              </section>
              <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="space-y-2">
                  <Button onClick={exportMarkdown} className="w-full bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
                    Markdown
                  </Button>
                  <Button onClick={exportJson} variant="outline" className="w-full border-white/20 text-zinc-200">
                    JSON
                  </Button>
                </div>
              </section>
            </CollapsibleContent>
          </Collapsible>
        </aside>
      </div>

      <Dialog open={Boolean(selectedSignal)} onOpenChange={(open) => !open && setSelectedSignal(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-zinc-950 text-zinc-100">
          {selectedSignal ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl leading-tight">{selectedSignal.title}</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {selectedSignal.providerLabel} · {formatUtcTimestamp(selectedSignal.occurredAtUtc)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <p className="leading-relaxed text-zinc-200">{selectedSignal.summary}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("border", HEAT_META[selectedSignal.heat].tailwind)}>{selectedSignal.heat}</Badge>
                  <Badge variant="outline" className="border-white/15 bg-zinc-800 text-zinc-200">
                    {selectedSignal.trackLabel}
                  </Badge>
                  <Badge variant="outline" className="border-white/15 bg-zinc-800 text-zinc-200">
                    Tier {selectedSignal.tier}
                  </Badge>
                  <Badge variant="outline" className="border-white/15 bg-zinc-800 text-zinc-200">
                    {selectedSignal.confidence === "VERIFIED" ? "Verified" : "Unverified"}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Citations</h4>
                  <ul className="mt-2 space-y-2">
                    {selectedSignal.citations.map((citation) => {
                      let domain = "unknown";
                      try {
                        domain = new URL(citation).hostname;
                      } catch {
                        domain = "unknown";
                      }

                      return (
                        <li key={citation}>
                          <a
                            className="inline-flex items-center gap-2 text-cyan-200 hover:text-cyan-100"
                            href={citation}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            <ExternalLink className="size-4" />
                            {domain}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <details className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-200">Why this classification?</summary>
                  <p className="mt-2 text-zinc-300">{selectedSignal.rationale}</p>
                </details>

                <div className="flex justify-end">
                  <Button onClick={() => copySignalMarkdown(selectedSignal)} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
                    Copy as Markdown
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
