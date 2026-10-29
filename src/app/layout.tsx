import "@/styles/globals.css";

import type { Metadata } from "next";
import { SiteNavigation } from "@/components/site-navigation";

export const metadata: Metadata = {
  title: "Incident Lens",
  description: "Read-only incident and ticket analysis proof of concept.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SiteNavigation />
        {children}
      </body>
    </html>
  );
}