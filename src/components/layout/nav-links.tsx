"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FolderClock, RadioTower, ServerCog } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Today", icon: RadioTower },
  { href: "/editions", label: "Library", icon: FolderClock },
  { href: "/sources", label: "Sources", icon: Compass },
  { href: "/ops", label: "Ops", icon: ServerCog },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-2">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80",
              active
                ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
                : "border-white/10 bg-white/5 text-zinc-300 hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-white/10",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
