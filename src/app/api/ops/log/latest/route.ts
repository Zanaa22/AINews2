import { getLatestRunLog } from "@/lib/server/queries";
import { asMessage, fail } from "@/lib/server/api";

export async function GET() {
  try {
    const log = await getLatestRunLog();
    if (!log) {
      return fail("No ingestion logs found", 404);
    }

    return new Response(log.logText, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename=signal-nook-run-${log.id}.log`,
      },
    });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
