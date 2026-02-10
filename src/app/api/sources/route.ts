import { createSource, listSources } from "@/lib/server/queries";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET() {
  try {
    const sources = await listSources();
    return ok({ sources });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = await createSource(body);
    return ok({ source }, { status: 201 });
  } catch (error) {
    return fail(asMessage(error), 400);
  }
}
