import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

function WaveformMotif() {
  return (
    <svg
      className="public-demo-video__wave"
      viewBox="0 0 240 48"
      fill="none"
      aria-hidden
    >
      {[12, 22, 16, 28, 18, 32, 14, 26, 20, 30, 16, 24].map((h, i) => (
        <rect
          key={i}
          x={8 + i * 18}
          y={(48 - h) / 2}
          width="6"
          height={h}
          rx="3"
          fill="currentColor"
          opacity={0.35 + (i % 3) * 0.15}
        />
      ))}
    </svg>
  );
}

export function DemoVideoPlaceholder() {
  const video = DEMO_PAGE_COPY.video;

  return (
    <section
      id="demo-video"
      className="public-demo-block public-demo-video scroll-mt-28"
      aria-labelledby={video.titleId}
    >
      <h2 id={video.titleId} className="public-demo-block__title">
        {video.title}
      </h2>
      <p className="public-demo-block__deck">{video.description}</p>

      <div className="public-demo-video__frame glass-card">
        <div className="public-demo-video__aspect">
          <div className="public-demo-video__inner">
            <div className="public-demo-video__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 9.5v5l4.5-2.5L10 9.5z"
                  fill="currentColor"
                  opacity="0.35"
                />
              </svg>
            </div>
            <p id={`${video.titleId}-placeholder-title`} className="public-demo-video__placeholder-title">
              {video.placeholderTitle}
            </p>
            <p id={`${video.titleId}-placeholder-detail`} className="public-demo-video__detail">
              {video.placeholderDetail}
            </p>
            <WaveformMotif />
          </div>
        </div>
      </div>
    </section>
  );
}
