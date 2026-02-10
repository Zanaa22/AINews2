import { LibraryClient } from "@/components/edition/library-client";
import { listLibraryEditions } from "@/lib/server/queries";

export const revalidate = 180;

export default async function EditionsPage() {
  const initial = await listLibraryEditions({ page: 1, pageSize: 20, heat: "ALL" });

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Library</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Browse archived editions, search by date or keyword, and jump directly to filtered days.
        </p>
      </section>

      <LibraryClient initial={initial} />
    </div>
  );
}
