import { searchSignalsByKeyword } from "@/lib/server/queries";
import { fail, ok, asMessage } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (!q) {
      return ok({ items: [] });
    }

    const items = await searchSignalsByKeyword(q);
    return ok({ items });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
