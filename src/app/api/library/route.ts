import type { Heat } from "@prisma/client";

import { listLibraryEditions } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

function isHeat(value: string | null): value is Heat {
  return value === "HOT" || value === "NOTABLE" || value === "QUIET";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const heatParam = searchParams.get("heat");

    const payload = await listLibraryEditions({
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "20"),
      dateQuery: searchParams.get("date") ?? "",
      keyword: searchParams.get("q") ?? "",
      heat: isHeat(heatParam) ? heatParam : "ALL",
    });

    return ok(payload);
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
