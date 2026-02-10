import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/types/domain";
import { AppShell } from "@/components/layout/app-shell";
import { listEditionDates } from "@/lib/server/queries";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} · Daily AI signals`,
  description: APP_TAGLINE,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const editionDates = await listEditionDates(28).catch(() => []);

  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        <AppShell editionDates={editionDates}>{children}</AppShell>
      </body>
    </html>
  );
}
