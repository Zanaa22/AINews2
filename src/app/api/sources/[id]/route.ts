import { toggleSource } from "@/lib/server/queries";
import { sourceToggleSchema } from "@/lib/schemas/ingestion";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = sourceToggleSchema.parse(body);

    const source = await toggleSource(id, input.enabled);
    return ok({ source });
  } catch (error) {
    return fail(asMessage(error), 400);
  }
}
