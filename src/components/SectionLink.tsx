"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function SectionLink({ id, children }: { id: string; children: ReactNode }) {
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);

  return <a href={`#${id}`} className="hover:underline underline-offset-4" onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    const scroller = target?.closest<HTMLElement>("[data-landing-scroll]");
    if (!target || !scroller) return;
    event.preventDefault();
    cancel.current?.();
    const start = scroller.scrollTop;
    const destination = Math.max(0, Math.min(
      start + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 32,
      scroller.scrollHeight - scroller.clientHeight,
    ));
    history.replaceState(null, "", `#${id}`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scroller.scrollTo({ top: destination, behavior: "instant" });
      return;
    }
    const started = performance.now();
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("wheel", stop);
      scroller.removeEventListener("touchstart", stop);
      scroller.removeEventListener("keydown", stop);
      cancel.current = null;
    };
    cancel.current = stop;
    scroller.addEventListener("wheel", stop, { passive: true });
    scroller.addEventListener("touchstart", stop, { passive: true });
    scroller.addEventListener("keydown", stop);
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 400, 1);
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      scroller.scrollTo({ top: start + (destination - start) * eased, behavior: "instant" });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);
  }}>{children}</a>;
}
