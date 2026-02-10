"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/types/domain";
import { EditionPicker } from "@/components/layout/edition-picker";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function titleForPath(pathname: string): string {
  if (pathname === "/") {
    return "Today";
  }

  if (pathname.startsWith("/editions/")) {
    return "Edition detail";
  }

  if (pathname.startsWith("/editions")) {
    return "Library";
  }

  if (pathname.startsWith("/sources")) {
    return "Sources";
  }

  if (pathname.startsWith("/ops")) {
    return "Ops";
  }

  return "Signal Nook";
}

export function AppShell({
  children,
  editionDates,
}: {
  children: React.ReactNode;
  editionDates: string[];
}) {
  const pathname = usePathname();
  const pageTitle = useMemo(() => titleForPath(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(45,77,83,0.32),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(251,191,36,0.12),transparent_36%),#09090b] text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1880px] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-zinc-900/45 px-4 py-6 backdrop-blur lg:flex lg:flex-col lg:gap-8">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-xl font-semibold text-zinc-100"
            >
              <Sparkles className="size-5 text-cyan-300" aria-hidden />
              {APP_NAME}
            </Link>
            <p className="text-sm text-zinc-400">{APP_TAGLINE}</p>
          </div>

          <NavLinks />
          <EditionPicker dates={editionDates} />

          <p className="mt-auto text-xs text-zinc-500">Citation-forward daily AI operations monitor.</p>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/70 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/55 sm:px-6 sm:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2 lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Open navigation menu"
                      className="border-white/20 bg-zinc-900/70 text-zinc-100"
                    >
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[88vw] max-w-[340px] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-zinc-100">{APP_NAME}</SheetTitle>
                      <SheetDescription className="text-zinc-400">{APP_TAGLINE}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      <NavLinks />
                      <EditionPicker dates={editionDates} />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="max-w-[42vw] truncate text-sm font-medium text-zinc-200 max-[420px]:hidden">
                  {APP_NAME}
                </span>
              </div>

              <div className="min-w-0">
                <p className="hidden text-xs uppercase tracking-[0.18em] text-zinc-500 sm:block">Signal Nook</p>
                <h1 className="truncate text-sm font-semibold text-zinc-100 sm:text-base">{pageTitle}</h1>
              </div>

              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 md:block">
                Daily AI signals
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
