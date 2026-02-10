import { getHealthSnapshot } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET() {
  try {
    const health = await getHealthSnapshot();
    return ok(health);
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
