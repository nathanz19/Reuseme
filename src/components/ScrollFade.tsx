"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const scroller = element?.closest<HTMLElement>("[data-landing-scroll]");
    if (!element || !scroller) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const remaining = bounds.bottom - scroller.getBoundingClientRect().top;
      // Fade during the last portion of the headline passing the top edge.
      const distance = Math.min(bounds.height * 0.65, 200);
      const progress = Math.max(0, Math.min(1, (remaining - 16) / Math.max(distance, 1)));
      element.style.opacity = motion.matches ? "1" : String(progress * progress * (3 - 2 * progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);
  return <div ref={ref} data-scroll-fade>{children}</div>;
}
