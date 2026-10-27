/* Route-level skeleton in the v3 look: header, stat cards, one list panel.
   Uses .stat-card / .panel from globals. */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-[76rem] space-y-5"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <div className="skeleton h-3 w-24 max-w-full rounded" />
        <div className="skeleton h-6 w-56 max-w-full rounded-md" />
        <div className="skeleton h-3.5 w-80 max-w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-8 w-8 shrink-0 rounded-[9px]" />
            </div>
            <div className="skeleton h-6 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel__head">
          <div className="skeleton h-3.5 w-40 max-w-full rounded" />
          <div className="skeleton h-7 w-20 rounded-md" />
        </div>
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="list-row hover:bg-transparent">
              <div className="skeleton h-8 w-8 shrink-0 rounded-[9px]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="skeleton h-3 w-1/3 max-w-full rounded" />
                <div className="skeleton h-2.5 w-1/2 max-w-full rounded" />
              </div>
              <div className="skeleton h-5 w-14 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
