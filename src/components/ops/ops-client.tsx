"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, PlayCircle, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUtcTimestamp } from "@/lib/date";
import type { IngestionRunView } from "@/types/view-models";

type HealthPayload = {
  dbStatus: "ok" | "down";
  openAiKeyPresent: boolean;
  model?: string;
  lastRun:
    | {
        id: string;
        status: string;
        startedAtUtc: string;
        finishedAtUtc: string | null;
        itemsFetched: number;
        itemsCreated: number;
      }
    | null;
};

export function OpsClient({ initialRuns }: { initialRuns: IngestionRunView[] }) {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [runs, setRuns] = useState<IngestionRunView[]>(initialRuns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminSecret, setAdminSecret] = useState("");
  const [dateOverride, setDateOverride] = useState("");
  const [running, setRunning] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [healthResponse, runsResponse] = await Promise.all([
        fetch("/api/ops/health", { cache: "no-store" }),
        fetch("/api/ops/runs?limit=30", { cache: "no-store" }),
      ]);

      if (!healthResponse.ok || !runsResponse.ok) {
        throw new Error("Failed to fetch ops data");
      }

      const [healthPayload, runsPayload] = (await Promise.all([
        healthResponse.json(),
        runsResponse.json(),
      ])) as [HealthPayload, { runs: IngestionRunView[] }];

      setHealth(healthPayload);
      setRuns(runsPayload.runs);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load ops data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function runNow() {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/ops/run-now", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          adminSecret,
          date: dateOverride || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to run ingestion");
      }

      await refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to run ingestion");
    } finally {
      setRunning(false);
    }
  }

  function downloadLog(id: string) {
    window.open(`/api/ops/log/${id}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Ops</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Monitor ingestion health, execute scheduled jobs manually, and inspect run logs.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-zinc-200"
            onClick={() => void refresh()}
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

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">DB status</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-zinc-100">
            {health?.dbStatus === "ok" ? <CheckCircle2 className="size-5 text-teal-300" /> : <ShieldAlert className="size-5 text-red-300" />}
            {health?.dbStatus === "ok" ? "Healthy" : "Down"}
          </p>
        </article>

        <article className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">OpenAI key</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {health?.openAiKeyPresent ? "Present" : "Missing"}
          </p>
          {health?.model ? <p className="mt-1 text-xs text-zinc-400">Model: {health.model}</p> : null}
        </article>

        <article className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Last ingestion</p>
          {health?.lastRun ? (
            <>
              <p className="mt-2 text-lg font-semibold text-zinc-100">{health.lastRun.status}</p>
              <p className="mt-1 text-xs text-zinc-400">{formatUtcTimestamp(health.lastRun.startedAtUtc)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No runs yet.</p>
          )}
        </article>
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Run ingestion now</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Requires <code>ADMIN_SECRET</code>. Optional date format: <code>YYYY-MM-DD</code>.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="space-y-2">
            <Label htmlFor="admin-secret">Admin secret</Label>
            <Input
              id="admin-secret"
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-override">Edition date</Label>
            <Input
              id="date-override"
              placeholder="2026-02-10"
              value={dateOverride}
              onChange={(event) => setDateOverride(event.target.value)}
              className="border-white/15 bg-zinc-950/70 text-zinc-100"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={() => void runNow()} disabled={running} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
              {running ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Run ingestion now
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            className="border-white/20 text-zinc-200"
            onClick={() => window.open("/api/ops/log/latest", "_blank", "noopener,noreferrer")}
          >
            <Download className="size-4" />
            Download latest log
          </Button>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-zinc-300">Ingestion runs</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Finished</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Fetched</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2 text-right">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-300">{formatUtcTimestamp(run.startedAtUtc)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                    {run.finishedAtUtc ? formatUtcTimestamp(run.finishedAtUtc) : "-"}
                  </td>
                  <td className="px-3 py-2 text-zinc-200">{run.status}</td>
                  <td className="px-3 py-2 text-zinc-300">{run.itemsFetched}</td>
                  <td className="px-3 py-2 text-zinc-300">{run.itemsCreated}</td>
                  <td className="max-w-xs px-3 py-2 text-zinc-400">
                    <p className="line-clamp-2">{run.errorMessage || "-"}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-zinc-200"
                      onClick={() => downloadLog(run.id)}
                    >
                      <Download className="size-4" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
