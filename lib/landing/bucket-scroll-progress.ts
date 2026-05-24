/** Snap scroll-linked progress to KDS story beats — avoids per-frame React updates. */

const KDS_SCROLL_BUCKETS = [0, 0.08, 0.24, 0.36, 0.55, 0.74, 1] as const;

export function bucketKdsScrollProgress(value: number): number {
  const p = Math.max(0, Math.min(1, value));
  let bucket: number = KDS_SCROLL_BUCKETS[0];
  for (const step of KDS_SCROLL_BUCKETS) {
    if (p >= step) bucket = step;
  }
  return bucket;
}
