import type { LandingPreviewData } from "@/lib/landing-demo-data";
import {
  buildMenuScanPreview,
  type MenuScanExtractionRow,
  type ScanConfidence,
} from "@/lib/landing/build-menu-scan-preview";
import { cn } from "@/lib/cn";
import { PreviewFrame } from "./shared";

export function MenuScannerPreview({ data }: { data: LandingPreviewData }) {
  const model = buildMenuScanPreview(data);

  return (
    <PreviewFrame>
      <section className="menu-scan-preview glass-card overflow-hidden">
        <header className="border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">Menu scanner</h3>
              <p className="mt-0.5 text-pretty text-xs text-muted">
                Illustrative preview · photo in → categories, items, and modifiers for{" "}
                {model.restaurantName} (demo data).
              </p>
            </div>
            <ReviewSummaryPills review={model.review} />
          </div>
        </header>

        <div className="grid min-w-0 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,11.5rem)_1fr] lg:gap-6">
          <MenuScanPhotoCard photo={model.photo} />

          <div className="flex min-w-0 flex-col gap-4">
            <CategoryChips chips={model.categoryChips} />

            <ExtractionPanel rows={model.extractions} moreCount={model.moreItemsCount} />

            {model.modifierGroups.length > 0 ? (
              <ModifierGroupsPanel groups={model.modifierGroups} />
            ) : null}

            <footer className="grid grid-cols-3 gap-2 border-t border-line pt-4">
              <p className="col-span-3 text-[10px] text-subtle">Example counts from demo menu</p>
              <ScanStat n={model.stats.categories} label="Categories" />
              <ScanStat n={model.stats.items} label="Items" />
              <ScanStat n={model.stats.modifiers} label="Modifiers" />
            </footer>
          </div>
        </div>
      </section>
    </PreviewFrame>
  );
}

function MenuScanPhotoCard({
  photo,
}: {
  photo: { label: string; fileName: string; status: "complete" };
}) {
  return (
    <div className="menu-scan-photo relative flex min-h-[200px] flex-col overflow-hidden rounded-xl border border-line bg-elev lg:min-h-[280px]">
      <div
        className="menu-scan-photo-scanline pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-card shadow-sm">
          <CameraIcon />
        </div>
        <p className="relative mt-3 text-center text-sm font-semibold text-ink">{photo.label}</p>
        <p className="relative mt-1 max-w-full truncate text-center font-mono text-[10px] text-muted">
          {photo.fileName}
        </p>
        <p className="relative mt-1 text-center text-[10px] text-subtle">PNG · JPG · WebP · 8 MB max</p>
      </div>

      <div className="relative border-t border-line bg-card/90 px-3 py-2">
        <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-success">
          <CheckIcon />
          Extraction complete
        </p>
      </div>
    </div>
  );
}

function ReviewSummaryPills({
  review,
}: {
  review: { ready: number; review: number; blocking: number };
}) {
  return (
    <ul className="flex flex-wrap gap-1.5 text-[10px] font-medium" aria-label="Scan review summary">
      <li className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-success">
        {review.ready} ready
      </li>
      {review.review > 0 ? (
        <li className="rounded-full border border-warning/35 bg-warning/10 px-2.5 py-1 text-warning">
          {review.review} review
        </li>
      ) : null}
      {review.blocking > 0 ? (
        <li className="rounded-full border border-danger/35 bg-danger/10 px-2.5 py-1 text-danger">
          {review.blocking} check
        </li>
      ) : null}
    </ul>
  );
}

function CategoryChips({ chips }: { chips: { name: string; count: number }[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
        Categories
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Extracted categories">
        {chips.map((chip) => (
          <li
            key={chip.name}
            className="rounded-full border border-accent/25 bg-accent-soft/45 px-2.5 py-1 text-[11px] font-medium text-ink"
          >
            {chip.name}
            <span className="ml-1 font-mono text-[10px] tabular-nums text-muted">
              {chip.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExtractionPanel({
  rows,
  moreCount,
}: {
  rows: MenuScanExtractionRow[];
  moreCount: number;
}) {
  return (
    <div className="menu-scan-extraction rounded-xl border border-line bg-card/60">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Extraction rows
        </p>
        <span className="text-[10px] text-muted">Confidence from scan</span>
      </div>
      <ul className="divide-y divide-line" aria-label="Extracted menu items">
        {rows.map((row) => (
          <li key={row.id} className="menu-scan-row px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{row.name}</p>
                <p className="text-[11px] text-muted">
                  {row.category} · {row.priceLabel}
                </p>
              </div>
              <ConfidenceBadge level={row.confidence} />
            </div>
            {row.hint ? (
              <p
                className={cn(
                  "mt-1.5 text-[10px] leading-snug",
                  row.confidence === "low" ? "text-danger" : "text-warning"
                )}
              >
                {row.hint}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {moreCount > 0 ? (
        <p className="border-t border-line px-3 py-2 text-center text-[10px] text-muted sm:px-4">
          +{moreCount} more items in full review
        </p>
      ) : null}
    </div>
  );
}

function ModifierGroupsPanel({
  groups,
}: {
  groups: ReturnType<typeof buildMenuScanPreview>["modifierGroups"];
}) {
  return (
    <div className="menu-scan-modifiers rounded-xl border border-line bg-elev/50">
      <div className="border-b border-line px-3 py-2 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Modifier groups
        </p>
      </div>
      <ul className="divide-y divide-line" aria-label="Extracted modifier groups">
        {groups.map((group) => (
          <li key={group.id} className="px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{group.groupName}</p>
                <p className="text-[11px] text-muted">
                  On {group.attachedTo} · {group.rule}
                </p>
              </div>
              <ConfidenceBadge level={group.confidence} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {group.options.map((opt) => (
                <span
                  key={opt}
                  className="rounded-md border border-line bg-card px-2 py-0.5 text-[10px] text-ink"
                >
                  {opt}
                </span>
              ))}
            </div>
            {group.hint ? (
              <p className="mt-1.5 text-[10px] leading-snug text-warning">{group.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ScanConfidence }) {
  const label =
    level === "high" ? "High" : level === "medium" ? "Review" : "Check";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        level === "high" && "bg-success/12 text-success",
        level === "medium" && "bg-warning/12 text-warning",
        level === "low" && "bg-danger/12 text-danger"
      )}
    >
      {label}
    </span>
  );
}

function ScanStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-2 py-2 text-center">
      <p className="font-mono text-base font-semibold tabular-nums text-ink">{n}</p>
      <p className="text-[10px] text-subtle">{label}</p>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
