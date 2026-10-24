"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function EditorLink({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const transition = useRef<Animation | null>(null);
  const landingRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const reset = () => {
      transition.current?.cancel();
      transition.current = null;
      if (landingRef.current) delete landingRef.current.dataset.exiting;
    };
    // Next can retain the page for Back/Forward; clear the finished fade too.
    reset();
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      reset();
    };
  }, []);

  return <Link href="/editor" className={className} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const landing = event.currentTarget.closest<HTMLElement>("[data-landing-scroll]");
    if (!landing) return;
    event.preventDefault();
    if (transition.current) return;
    landingRef.current = landing;
    landing.dataset.exiting = "true";
    const animation = landing.animate(
      [{ opacity: Number(getComputedStyle(landing).opacity) }, { opacity: 0 }],
      { duration: 650, easing: "ease-in-out", fill: "forwards" },
    );
    transition.current = animation;
    void animation.finished.then(() => router.push("/editor")).catch(() => {});
  }}>{children}</Link>;
}
