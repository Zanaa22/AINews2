"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-zinc-400">{error.message}</p>
          <Button onClick={reset} className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
            Retry
          </Button>
        </main>
      </body>
    </html>
  );
}
