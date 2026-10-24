"use client";

import { useEffect, useRef } from "react";

export function ScrollBubble() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bubble = ref.current;
    const scroller = bubble?.closest<HTMLElement>("[data-landing-scroll]");
    if (!bubble || !scroller) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current = 1;
    let velocity = 0;
    let target = 1;
    let previousScroll = scroller.scrollTop;

    const animate = () => {
      velocity = (velocity + (target - current) * 0.07) * 0.78;
      current += velocity;
      bubble.style.transform = `scale(${current})`;
      if (Math.abs(target - current) > 0.0001 || Math.abs(velocity) > 0.0001) {
        frame = requestAnimationFrame(animate);
      } else {
        bubble.style.transform = `scale(${target})`;
        frame = 0;
      }
    };
    const update = () => {
      const scroll = scroller.scrollTop;
      if (reducedMotion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        bubble.style.transform = "none";
      } else {
        // A slow breathing wave follows scroll position in either direction.
        target = 1 + Math.sin(scroll / 150) * 0.16;
        if (scroll !== previousScroll && !frame) frame = requestAnimationFrame(animate);
      }
      previousScroll = scroll;
    };
    scroller.addEventListener("scroll", update, { passive: true });
    reducedMotion.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" data-scroll-bubble
    className="pointer-events-none absolute top-[12%] left-[25%] -z-10 size-[700px] rounded-full bg-[#cdd8bf] lg:top-[7%] lg:left-[25%] lg:size-[min(64vw,900px)]" />;
}
