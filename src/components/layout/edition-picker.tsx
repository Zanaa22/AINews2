"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";

export function EditionPicker({ dates }: { dates: string[] }) {
  const pathname = usePathname();

  return (
    <section aria-label="Edition picker" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Edition Picker</h2>
        <span className="text-xs text-zinc-500">{dates.length} recent</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.slice(0, 21).map((date) => {
          const active = pathname === `/editions/${date}`;
          const parsed = parseISO(`${date}T00:00:00Z`);
          return (
            <Link
              key={date}
              href={`/editions/${date}`}
              title={format(parsed, "PP")}
              className={cn(
                "rounded-md border px-1 py-1 text-center text-xs transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80",
                active
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-cyan-300/40 hover:bg-white/10",
              )}
            >
              {format(parsed, "d")}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
