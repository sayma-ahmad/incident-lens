import Link from "next/link";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Source Tickets", href: "/tickets" },
  { label: "Data Report", href: "/reports/data" },
  { label: "Baseline Report", href: "/reports/baseline" },
];

export function SiteNavigation() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3"
      >
        <Link href="/" className="text-sm font-bold text-indigo-700">
          Incident Lens
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}