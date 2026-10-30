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
      <body className="flex min-h-screen flex-col bg-surface text-body antialiased">
        <SiteNavigation />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-panel bg-panel px-4 py-4 text-center text-xs sm:text-sm font-medium text-on-panel-muted">
          AI-Powered Infrastructure Incident Intelligence · Mahindra & Mahindra
        </footer>
      </body>
    </html>
  );
}
