import { getEditionByDate } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  try {
    const { date } = await context.params;
    const edition = await getEditionByDate(date);
    if (!edition) {
      return fail("Edition not found", 404);
    }

    return ok({ edition });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
