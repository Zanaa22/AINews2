import Link from "next/link";

import { getLatestEdition } from "@/lib/server/queries";
import { EditionWorkspace } from "@/components/edition/edition-workspace";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

export default async function TodayPage() {
  const edition = await getLatestEdition();

  if (!edition) {
    return (
      <section className="glass-panel p-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-100">No editions yet</h1>
        <p className="mt-2 text-zinc-400">Run the seed or ingestion pipeline to generate your first Signal Nook edition.</p>
        <Button asChild className="mt-4 bg-cyan-500 text-zinc-950 hover:bg-cyan-400">
          <Link href="/ops">Open Ops</Link>
        </Button>
      </section>
    );
  }

  return <EditionWorkspace edition={edition} />;
}
