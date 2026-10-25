"use client";

import { DndContext } from "@dnd-kit/core";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { ResumeCanvas } from "@/components/ResumeCanvas";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import {
  invalidatePageMeasurements,
  setPageMeasurer,
} from "@/lib/pageMeasureRegistry";
import { PAGE_WIDTH } from "@/lib/tunables";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

const noop = () => {};

/**
 * Everything that changes the height of the page. The position of a block
 * inside its section does not, so ids are sorted: a block dragged over every
 * slot of a section is measured once.
 */
function layoutKey(preset: ResumePreset, vaultBlocks: AccomplishmentBlock[]): string {
  const byId = new Map(vaultBlocks.map((block) => [block.id, block]));
  const blocks = preset.activeBlockIds
    .map((id) => byId.get(id))
    .filter((block): block is AccomplishmentBlock => Boolean(block))
    .map((block) => [
      block.id,
      block.category,
      block.title,
      block.organization,
      block.location,
      block.startDate,
      block.endDate,
      getEffectiveBullets(block, preset),
    ] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify([
    preset.templateId,
    preset.referenceFormat ?? null,
    preset.header,
    preset.customSkillsSection,
    preset.additionalSections ?? [],
    preset.sectionOrder ?? null,
    blocks,
  ]);
}

/**
 * Create the measurer: a hidden copy of the real `ResumeCanvas`. Its host is
 * attached to the document only while a measurement runs, so the hidden page
 * is never visible to the user, to queries, or to the accessibility tree.
 */
function createMeasurer() {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("inert", "");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH}px;visibility:hidden;pointer-events:none;`;
  const root: Root = createRoot(host);
  const cache = new Map<string, number>();

  const measure = (preset: ResumePreset, vaultBlocks: AccomplishmentBlock[]): number => {
    const key = layoutKey(preset, vaultBlocks);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    document.body.appendChild(host);
    try {
      flushSync(() => {
        root.render(
          <DndContext id="page-measurer" accessibility={{ container: host }}>
            <ResumeCanvas
              measuring
              preset={preset}
              vaultBlocks={vaultBlocks}
              rankings={{}}
              vaultDragCategory={null}
              highlightedSection={null}
              dropTargetSection={null}
              removingBlockId={null}
              placeholder={null}
              dropBlocked={false}
              arrangeMode={false}
              onRemove={noop}
              onTailorBullet={noop}
            />
          </DndContext>,
        );
      });
      const content = host.querySelector<HTMLElement>("[data-resume-content]");
      const height = content ? content.getBoundingClientRect().height : 0;
      cache.set(key, height);
      return height;
    } finally {
      host.remove();
    }
  };

  const dispose = () => {
    cache.clear();
    // Unmounting inside a React commit is not allowed; do it on the next task.
    window.setTimeout(() => root.unmount(), 0);
  };

  return { measure, clear: () => cache.clear(), dispose };
}

/**
 * Register the offscreen measurer for `measurePage`. Measuring starts after
 * the fonts load, and cached heights are dropped whenever more fonts load.
 * Returns the cleanup function.
 */
export function registerPageMeasurer(): () => void {
  let disposed = false;
  let measurer: ReturnType<typeof createMeasurer> | null = null;
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;

  const onFontsLoaded = () => {
    measurer?.clear();
    invalidatePageMeasurements();
  };

  const start = () => {
    if (disposed) return;
    measurer = createMeasurer();
    setPageMeasurer(measurer.measure);
  };

  if (fonts) {
    fonts.addEventListener("loadingdone", onFontsLoaded);
    void fonts.ready.then(start);
  } else {
    start();
  }

  return () => {
    disposed = true;
    fonts?.removeEventListener("loadingdone", onFontsLoaded);
    if (measurer) {
      setPageMeasurer(null);
      measurer.dispose();
      measurer = null;
    }
  };
}
