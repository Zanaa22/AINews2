import { notFound } from "next/navigation";

import { EditionWorkspace } from "@/components/edition/edition-workspace";
import { getEditionByDate } from "@/lib/server/queries";

export const revalidate = 300;

export default async function EditionDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const edition = await getEditionByDate(date);

  if (!edition) {
    notFound();
  }

  return <EditionWorkspace edition={edition} />;
}
