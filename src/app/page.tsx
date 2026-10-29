const pages = [
  {
    number: "01",
    title: "Source Tickets",
    description:
      "Browse MSOLVE incidents, service requests and Alfa tickets. Filter records and inspect linked tickets.",
    href: "/tickets",
    action: "Browse tickets",
  },
  {
    number: "02",
    title: "Data and Mapping Report",
    description:
      "Review source counts, ticket mapping results, unmatched incidents and data-quality limitations.",
    href: "/reports/data",
    action: "View data report",
  },
  {
    number: "03",
    title: "Baseline Report",
    description:
      "Explore daily ticket volumes, busiest 15-minute periods, repeated subjects and department counts.",
    href: "/reports/baseline",
    action: "View baseline report",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              Incident Lens
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Incident Data Explorer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Explore source tickets, review cross-system mapping results and
              understand the historical ticket baseline.
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            Read-only POC
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Workspace</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a section to continue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <a
              key={page.href}
              href={page.href}
              className="group flex min-h-64 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="text-xs font-semibold tracking-widest text-indigo-600">
                SECTION {page.number}
              </span>

              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                {page.title}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                {page.description}
              </p>

              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                {page.action}
                <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Incident Lens is a read-only proof of concept. Subject-and-time
          matches are candidate links and should not be treated as confirmed
          duplicates.
        </footer>
      </div>
    </main>
  );
}