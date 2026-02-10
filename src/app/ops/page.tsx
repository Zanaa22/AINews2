import { OpsClient } from "@/components/ops/ops-client";
import { listIngestionRuns } from "@/lib/server/queries";

export const revalidate = 30;

export default async function OpsPage() {
  const initialRuns = await listIngestionRuns(30);

  return <OpsClient initialRuns={initialRuns} />;
}
