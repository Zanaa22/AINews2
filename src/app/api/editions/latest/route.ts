import { getLatestEdition } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET() {
  try {
    const edition = await getLatestEdition();
    if (!edition) {
      return fail("No editions found", 404);
    }

    return ok({ edition });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
