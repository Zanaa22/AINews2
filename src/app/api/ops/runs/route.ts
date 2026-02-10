import { listIngestionRuns } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "25");
    const runs = await listIngestionRuns(Number.isFinite(limit) ? limit : 25);
    return ok({ runs });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
