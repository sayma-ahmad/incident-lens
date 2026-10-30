export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-line animate-pulse" />
        <div className="h-8 w-72 rounded bg-line animate-pulse" />
        <div className="h-4 w-96 rounded bg-line animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-xl border border-line bg-surface p-6 shadow-xs animate-pulse space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 rounded bg-line" />
              <div className="h-4 w-16 rounded bg-line" />
            </div>
            <div className="h-6 w-3/4 rounded bg-line" />
            <div className="h-4 w-full rounded bg-line" />
            <div className="h-4 w-1/2 rounded bg-line" />
          </div>
        ))}
      </div>
    </main>
  );
}
