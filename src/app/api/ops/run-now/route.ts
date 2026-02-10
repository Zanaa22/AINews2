import { revalidatePath } from "next/cache";

import { runIngestion } from "@/lib/ingestion/run";
import { env } from "@/lib/env";
import { runNowBodySchema } from "@/lib/schemas/ingestion";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    if (!env.adminSecret) {
      return fail("ADMIN_SECRET is not configured", 500);
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const input = runNowBodySchema.parse(body);
    const headerSecret = request.headers.get("x-admin-secret");
    const candidate = (input.adminSecret ?? headerSecret ?? "").trim();

    if (candidate !== env.adminSecret) {
      return fail("Unauthorized", 401);
    }

    const result = await runIngestion({
      date: input.date,
      triggeredBy: "api",
    });

    revalidatePath("/");
    revalidatePath("/editions");
    revalidatePath(`/editions/${result.editionDate}`);
    revalidatePath("/ops");

    return ok({ result });
  } catch (error) {
    return fail(asMessage(error), 400);
  }
}
