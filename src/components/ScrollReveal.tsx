"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({ children, className = "", delay = 0 }: {
  children: ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Keep content visible without JavaScript or IntersectionObserver support.
    if (!("IntersectionObserver" in window)) return;
    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.dataset.reveal = "visible";
      } else if (element.dataset.reveal === "visible") {
        element.dataset.reveal = "leaving";
      }
    }, {
      root: element.closest("[data-landing-scroll]"),
      rootMargin: "0px 0px -48px 0px",
      threshold: 0.08,
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
    };
  }, []);

  return <div ref={ref} className={`landing-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}
