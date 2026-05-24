"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";
import { LANDING_EASE_OUT, LANDING_MOTION } from "@/lib/landing/motion-config";

export function useLandingReducedMotion() {
  return useReducedMotion() ?? false;
}

export function useLandingRevealTransition(reduced: boolean): Transition {
  if (reduced) return { duration: 0 };
  return {
    duration: LANDING_MOTION.revealDuration,
    ease: LANDING_EASE_OUT,
  };
}

type RevealDirection = "up" | "down" | "left" | "right";

export function landingRevealVariants(
  reduced: boolean,
  direction: RevealDirection = "up"
): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1, x: 0, y: 0 },
      visible: { opacity: 1, x: 0, y: 0 },
    };
  }

  const o = LANDING_MOTION.offset;
  const hidden =
    direction === "up"
      ? { opacity: 0, y: o }
      : direction === "down"
        ? { opacity: 0, y: -o }
        : direction === "left"
          ? { opacity: 0, x: o }
          : { opacity: 0, x: -o };

  return {
    hidden,
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: LANDING_MOTION.revealDuration, ease: LANDING_EASE_OUT },
    },
  };
}

export function landingRevealStaggerVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: LANDING_MOTION.stagger,
        delayChildren: 0.04,
      },
    },
  };
}
