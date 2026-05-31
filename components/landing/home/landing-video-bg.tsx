"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { HOME_HERO_VIDEO } from "@/lib/landing/public-background";

function preferGradientOnlyBackground(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/**
 * Homepage-only background: hero video when appropriate, always shared gradient wash.
 * Marketing/auth routes use canvas ::before — no mp4.
 */
export function LandingVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gradientOnly, setGradientOnly] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      const only = preferGradientOnlyBackground();
      setGradientOnly(only);
      if (only) setVideoFailed(false);
    };
    update();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);

    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener("change", update);

    return () => {
      mq.removeEventListener("change", update);
      conn?.removeEventListener("change", update);
    };
  }, []);

  const hasVideo = !gradientOnly && !videoFailed;

  useLayoutEffect(() => {
    if (!hasVideo) return;
    const el = videoRef.current;
    if (!el) return;

    const onError = () => setVideoFailed(true);
    el.addEventListener("error", onError);

    void el.play().catch(() => {
      /* Autoplay may be blocked; muted inline video still shows first frame */
    });

    const onVisibility = () => {
      if (document.hidden) {
        el.pause();
        return;
      }
      void el.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      el.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hasVideo]);

  return (
    <div
      className={cn("home-video-layer", hasVideo && "home-video-layer--has-video")}
      aria-hidden
      data-public-hero-bg={hasVideo ? "video" : "gradient"}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          className="home-video-layer__video"
          src={HOME_HERO_VIDEO.src}
          autoPlay
          muted
          loop
          playsInline
          preload={HOME_HERO_VIDEO.preload}
          disablePictureInPicture
        />
      ) : null}
      <div className="home-video-layer__blobs" />
      <div className="home-video-layer__wash" />
    </div>
  );
}
