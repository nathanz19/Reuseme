"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { pageMeasurerVersion, subscribePageMeasurer } from "@/lib/pageMeasureRegistry";

/** The live canvas content height against the page content area, both in px. */
export interface PageFit {
  usedPx: number;
  availablePx: number;
}

let current: PageFit | null = null;
const listeners = new Set<() => void>();

function publish(next: PageFit | null) {
  if (
    current === next ||
    (current && next && current.usedPx === next.usedPx && current.availablePx === next.availablePx)
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live fit of the resume canvas, or null before the canvas is measured. */
export function usePageFit(): PageFit | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

function read(content: HTMLElement): PageFit | null {
  const page = content.parentElement;
  if (!page) return null;
  const usedPx = content.getBoundingClientRect().height;
  // A hidden canvas (the vault pane on small screens, or print) has no height.
  if (usedPx === 0 || page.clientHeight === 0) return null;
  const style = getComputedStyle(page);
  const availablePx =
    page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  return { usedPx, availablePx };
}

/**
 * Observe the live `[data-resume-content]` element and publish its height.
 * Returns a ref callback for that element. While `paused` (a drag shows a
 * temporary skeleton) the last value stays.
 */
export function usePageFitObserver(paused: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!node || paused) return;
    // A hidden canvas publishes null, so the budget falls back to the offscreen measurer.
    const update = () => publish(read(node));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, paused]);

  useEffect(() => {
    if (!node) return;
    return () => publish(null);
  }, [node]);

  return setNode;
}

/** Changes when the offscreen measurer registers or its cached heights are dropped. */
export function usePageMeasurerVersion(): number {
  return useSyncExternalStore(subscribePageMeasurer, pageMeasurerVersion, () => 0);
}
