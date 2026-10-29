import Link from "next/link";

export default function IncidentNotFound() {
  return (
    <main className="mx-auto max-w-xl p-6 text-center">
      <h1 className="mt-12 text-2xl font-bold text-heading">Incident not found</h1>
      <p className="mt-2 text-muted">
        This incident does not exist. It may have been regrouped after the correlation scripts were re-run.
      </p>
      <Link href="/incidents" className="mt-6 inline-block font-medium text-accent hover:underline">
        ← Back to incidents
      </Link>
    </main>
  );
}
