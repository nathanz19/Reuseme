import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

/** Returns the rendered content height in px of the preset on the page. */
export type PageMeasurer = (
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
) => number;

let measurer: PageMeasurer | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  for (const listener of listeners) listener();
}

/** The DOM measurer registers here. Unit tests and server code leave it empty. */
export function setPageMeasurer(next: PageMeasurer | null) {
  if (measurer === next) return;
  measurer = next;
  notify();
}

export function getPageMeasurer(): PageMeasurer | null {
  return measurer;
}

/** Call when cached measurements are no longer valid, for example after fonts load. */
export function invalidatePageMeasurements() {
  notify();
}

export function subscribePageMeasurer(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever the measurer is registered, removed, or invalidated. */
export function pageMeasurerVersion(): number {
  return version;
}
