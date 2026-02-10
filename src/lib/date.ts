import { format, parseISO } from "date-fns";

export function formatEditionDate(date: string): string {
  return format(parseISO(`${date}T00:00:00Z`), "MMMM d, yyyy");
}

export function formatUtcTimestamp(date: Date | string): string {
  const target = typeof date === "string" ? parseISO(date) : date;
  return format(target, "MMM d, HH:mm 'UTC'");
}

export function toEditionDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
