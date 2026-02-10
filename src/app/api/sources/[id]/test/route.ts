import { testSourceFetch } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const preview = await testSourceFetch(id);
    return ok({ preview });
  } catch (error) {
    return fail(asMessage(error), 400);
  }
}
