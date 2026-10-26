export default function DashboardLoading() {
  return (
    <div className="min-w-0 space-y-5" role="status" aria-live="polite" aria-label="Loading page">
      <div className="space-y-2">
        <div className="skeleton h-6 w-48 max-w-full rounded" />
        <div className="skeleton h-3.5 w-80 max-w-full rounded" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-3.5">
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="mt-2.5 skeleton h-5 w-1/3 rounded" />
          </div>
        ))}
      </div>
      <div className="glass-card p-4">
        <div className="skeleton h-3.5 w-40 rounded" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
