"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SOURCE_TYPES } from "@/types/domain";
import { formatUtcTimestamp } from "@/lib/date";
import type { SourceView } from "@/types/view-models";

type PreviewItem = {
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  publishedAt: string;
  snippet: string;
};

const initialForm = {
  name: "",
  type: "RSS",
  identifier: "",
  providerLabel: "",
  tier: 2,
  enabled: true,
};

export function SourcesClient({ initialSources }: { initialSources: SourceView[] }) {
  const [sources, setSources] = useState<SourceView[]>(initialSources);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function refreshSources() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load sources");
      }

      const data = (await response.json()) as { sources: SourceView[] };
      setSources(data.sources);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialSources.length) {
      void refreshSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onToggleSource(id: string, enabled: boolean) {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update source");
      }

      const data = (await response.json()) as { source: SourceView };
      setSources((previous) =>
        previous.map((source) => (source.id === id ? data.source : source)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update source");
    }
  }

  async function onTestFetch(id: string) {
    setTestingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/sources/${id}/test`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to test source");
      }

      const data = (await response.json()) as { preview: PreviewItem[] };
      setPreviewItems(data.preview);
      setPreviewOpen(true);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Failed to test source");
    } finally {
      setTestingId(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to add source");
      }

      const data = (await response.json()) as { source: SourceView };
      setSources((previous) => [data.source, ...previous]);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to add source");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Sources</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Manage ingestion origins, run test fetches, and tune source tiers.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-zinc-200"
            onClick={() => void refreshSources()}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</section>
      ) : null}

      <section className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Identifier</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Last fetched</th>
                <th className="px-3 py-2">Last error</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <Switch
                      aria-label={`Toggle ${source.name}`}
                      checked={source.enabled}
                      onCheckedChange={(checked) => void onToggleSource(source.id, checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{source.type}</td>
                  <td className="max-w-xs px-3 py-2 text-zinc-300">
                    <p className="line-clamp-2">{source.identifier}</p>
                  </td>
                  <td className="px-3 py-2 text-zinc-200">{source.providerLabel}</td>
                  <td className="px-3 py-2 text-zinc-300">{source.tier}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                    {source.lastFetchedAtUtc ? formatUtcTimestamp(source.lastFetchedAtUtc) : "Never"}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-zinc-400">
                    <p className="line-clamp-2">{source.lastError || "-"}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-zinc-200"
                      onClick={() => void onTestFetch(source.id)}
                      disabled={testingId === source.id}
                    >
                      {testingId === source.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      Test fetch
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Add source</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="source-name">Name</Label>
            <Input
              id="source-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-type">Type</Label>
            <select
              id="source-type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as (typeof SOURCE_TYPES)[number] }))
              }
              className="h-9 rounded-md border border-white/15 bg-zinc-950/70 px-3 text-sm text-zinc-100"
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type} className="bg-zinc-950 text-zinc-100">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="source-identifier">Identifier / URL</Label>
            <Input
              id="source-identifier"
              value={form.identifier}
              onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
              required
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-provider">Provider label</Label>
            <Input
              id="source-provider"
              value={form.providerLabel}
              onChange={(event) => setForm((current) => ({ ...current, providerLabel: event.target.value }))}
              required
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-tier">Tier</Label>
            <Input
              id="source-tier"
              type="number"
              min={1}
              max={3}
              value={form.tier}
              onChange={(event) =>
                setForm((current) => ({ ...current, tier: Number(event.target.value) || current.tier }))
              }
              required
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
              aria-label="Enable source"
            />
            <span className="text-sm text-zinc-300">Enabled</span>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              Add source
            </Button>
          </div>
        </form>
      </section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Source test preview</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preview of fetched raw items before classification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {previewItems.length === 0 ? (
              <p className="text-sm text-zinc-400">No preview items available.</p>
            ) : (
              previewItems.map((item) => (
                <article key={item.sourceUrl} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.sourceDomain} · {formatUtcTimestamp(item.publishedAt)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">{item.snippet}</p>
                </article>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
