"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HOME_HOW_FLOW, type HowFlowBeatId } from "@/lib/landing/home-how-flow-copy";
import { HOW_FLOW_BEAT_ORDER } from "./how-flow-stage";
import { getHowFlowVisualData } from "@/lib/landing/home-how-flow-data";
import { cn } from "@/lib/cn";
import { HowFlowBeatVisual } from "./how-flow-beat-visual";
import { HowFlowStage } from "./how-flow-stage";

const BEAT_IDS = HOW_FLOW_BEAT_ORDER;
const DESKTOP_STAGE_MQ = "(min-width: 900px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function usePrefersMotion() {
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return motionOk;
}

function pickActiveBeat(nodes: HTMLLIElement[], ratios: Map<Element, number>): HowFlowBeatId | null {
  const viewportCenter = window.innerHeight / 2;
  let best: { beat: HowFlowBeatId; score: number } | null = null;

  for (const node of nodes) {
    const ratio = ratios.get(node) ?? 0;
    if (ratio <= 0) continue;

    const beat = node.getAttribute("data-beat") as HowFlowBeatId | null;
    if (!beat || !BEAT_IDS.includes(beat)) continue;

    const rect = node.getBoundingClientRect();
    const stepCenter = rect.top + rect.height / 2;
    const dist = Math.abs(stepCenter - viewportCenter);
    const score = ratio * 1000 - dist;

    if (!best || score > best.score) {
      best = { beat, score };
    }
  }

  return best?.beat ?? null;
}

export function HomeHowFlow() {
  const visuals = getHowFlowVisualData();
  const motionOk = usePrefersMotion();
  const desktopStage = useMediaQuery(DESKTOP_STAGE_MQ);
  const [activeBeat, setActiveBeat] = useState<HowFlowBeatId>("scan-menu");
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const visibleRatios = useRef(new Map<Element, number>());

  useEffect(() => {
    if (!motionOk) return;

    const nodes = stepRefs.current.filter((n): n is HTMLLIElement => n != null);
    if (!nodes.length) return;

    let frame = 0;
    const rootMargin = desktopStage ? "-32% 0px -32% 0px" : "-24% 0px -30% 0px";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatios.current.set(entry.target, entry.intersectionRatio);
        }

        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const next = pickActiveBeat(nodes, visibleRatios.current);
          if (next) setActiveBeat(next);
        });
      },
      { root: null, rootMargin, threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] }
    );

    nodes.forEach((node) => observer.observe(node));
    const ratios = visibleRatios.current;
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ratios.clear();
    };
  }, [motionOk, desktopStage]);

  const { eyebrow, title, lead, visualLabel, beats } = HOME_HOW_FLOW;
  const activeIndex = Math.max(
    0,
    beats.findIndex((beat) => beat.id === activeBeat)
  );
  const progressScale = (activeIndex + 1) / beats.length;
  const syncDesktopStage = motionOk && desktopStage;

  return (
    <div
      className={cn(
        "home-how-flow",
        motionOk && "home-how-flow--motion",
        !motionOk && "home-how-flow--static"
      )}
      data-active-beat={activeBeat}
      style={
        motionOk
          ? ({ "--how-progress": String(progressScale) } as CSSProperties)
          : undefined
      }
    >
      <div className="home-wrap">
        <p className="home-eyebrow">{eyebrow}</p>
        <h2 id="how-heading" className="home-h2 mt-2">
          {title}
        </h2>
        <p className="home-lead mt-3 max-w-xl">{lead}</p>

        {motionOk ? (
          <>
            <div className="home-how-flow__progress" aria-hidden>
              <span className="home-how-flow__progress-track" />
              <span className="home-how-flow__progress-fill" />
            </div>
            <div className="home-how-flow__dots" aria-hidden>
              {beats.map((beat) => (
                <span
                  key={beat.id}
                  className={`home-how-flow__dot${activeBeat === beat.id ? " is-active" : ""}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="home-how-flow__layout home-wrap">
        <div className="home-how-flow__stage-col" aria-hidden={desktopStage ? undefined : true}>
          <HowFlowStage
            activeBeat={activeBeat}
            visuals={visuals}
            label={visualLabel}
            announceChanges={syncDesktopStage}
          />
        </div>

        <ol className="home-how-flow__steps" aria-label="How ROAL works">
          {beats.map((beat, index) => (
            <li
              key={beat.id}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              data-beat={beat.id}
              className={`home-how-flow__step${activeBeat === beat.id ? " is-active" : ""}`}
              aria-current={
                syncDesktopStage && activeBeat === beat.id ? "step" : undefined
              }
            >
              <div className="home-how-flow__step-copy">
                <p className="home-step-num">Step {beat.step}</p>
                <h3 className="home-how-flow__step-title">{beat.title}</h3>
                <p className="home-how-flow__step-body">{beat.body}</p>
              </div>
              <HowFlowBeatVisual beatId={beat.id} visuals={visuals} label={visualLabel} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
