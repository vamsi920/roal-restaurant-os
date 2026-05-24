export default function DashboardLoading() {
  return (
    <div className="min-w-0 space-y-6" role="status" aria-live="polite" aria-label="Loading page">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton h-8 w-2/3 max-w-md rounded" />
      <div className="skeleton h-4 w-full max-w-lg rounded" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="mt-3 skeleton h-3 w-full rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
