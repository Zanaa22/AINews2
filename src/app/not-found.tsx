import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="glass-panel mx-auto max-w-xl p-8 text-center">
      <h1 className="text-2xl font-semibold text-zinc-100">Edition not found</h1>
      <p className="mt-2 text-zinc-400">The requested Signal Nook page does not exist or has not been generated yet.</p>
      <Button asChild className="mt-4 bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
        <Link href="/editions">Back to Library</Link>
      </Button>
    </section>
  );
}
