import { getRunLog } from "@/lib/server/queries";
import { asMessage, fail } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const log = await getRunLog(id);

    if (!log) {
      return fail("Log not found", 404);
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
