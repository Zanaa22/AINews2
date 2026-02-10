import { SourcesClient } from "@/components/sources/sources-client";
import { listSources } from "@/lib/server/queries";

export const revalidate = 60;

export default async function SourcesPage() {
  const initialSources = await listSources();

  return <SourcesClient initialSources={initialSources} />;
}
