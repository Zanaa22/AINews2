import { prisma } from "@/lib/prisma";
import { asMessage, fail, ok } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(50, Math.max(1, pageSize)) : 20;

    const [total, items] = await Promise.all([
      prisma.edition.count(),
      prisma.edition.findMany({
        orderBy: { date: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          date: true,
          generatedAtUtc: true,
          totalCount: true,
          hotCount: true,
          notableCount: true,
          quietCount: true,
        },
      }),
    ]);

    return ok({
      total,
      page: safePage,
      pageSize: safePageSize,
      items: items.map((item) => ({
        ...item,
        generatedAtUtc: item.generatedAtUtc.toISOString(),
      })),
    });
  } catch (error) {
    return fail(asMessage(error), 500);
  }
}
