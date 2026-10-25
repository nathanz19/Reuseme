import type { Page } from "@playwright/test";
import type { ReferenceFormat } from "@/schemas/referenceFormat";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";
import { PAGE_HEIGHT } from "@/lib/tunables";
import { COMPACT_SERIF_FORMAT, MODERN_PARAGRAPH_FORMAT } from "../fixtures/referenceFormat";
import { RESUME_STORAGE_KEY, seedStorageValue } from "../support/seedWorkspace";
import { spaceMeter } from "./helpers";
import { expect, test } from "./test";

type ElementBox = { top: number; height: number };
type OffsetSnapshot = { h2: ElementBox[]; li: ElementBox[] };

type SeedState = {
  vaultBlocks: AccomplishmentBlock[];
  presets: ResumePreset[];
  activePresetId: string;
};

function parseSeed(): { state: SeedState } {
  return JSON.parse(seedStorageValue()) as { state: SeedState };
}

function activePreset(state: SeedState): ResumePreset {
  const preset = state.presets.find((p) => p.id === state.activePresetId);
  if (!preset) throw new Error(`missing preset ${state.activePresetId}`);
  return preset;
}

function trimForFit(state: SeedState) {
  activePreset(state).activeBlockIds = ["edu-1"];
}

/** Reference layouts can shrink enough that the default seed fits; pad skills to force overflow. */
function forceOver(state: SeedState) {
  const preset = activePreset(state);
  preset.activeBlockIds = state.vaultBlocks.filter((block) => !block.isArchived).map((block) => block.id);
  preset.customSkillsSection = [
    ...preset.customSkillsSection,
    ...Array.from({ length: 18 }, (_, index) => `OverflowSkill${index}`),
  ];
}

function applyReferenceFormat(state: SeedState, format: ReferenceFormat) {
  const preset = activePreset(state);
  preset.templateId = "classic-ats";
  preset.referenceFormat = structuredClone(format);
}

function lineHeightPx(preset: Pick<ResumePreset, "referenceFormat">): number {
  const format = preset.referenceFormat;
  if (!format) return 20;
  const details = format.details;
  const bodyPx = details?.bodyPx ?? { small: 13, medium: 14, large: 16 }[format.bodySize];
  const leading = details?.lineHeight ?? { compact: 1.25, balanced: 1.4, airy: 1.55 }[format.spacing];
  return bodyPx * leading;
}

function maxMeterLines(preset: Pick<ResumePreset, "referenceFormat">): number {
  const format = preset.referenceFormat;
  let paddingPx = 32;
  if (format) {
    paddingPx = format.details?.marginPx ?? { narrow: 24, standard: 32, wide: 48 }[format.margins];
  }
  const availablePx = PAGE_HEIGHT - 2 * paddingPx;
  return Math.max(1, Math.floor(availablePx / lineHeightPx(preset)));
}

function extremeFormat(
  marginPx: 20 | 64,
  entryLayout: "inline" | "organization-first" | "title-first",
): ReferenceFormat {
  return {
    ...MODERN_PARAGRAPH_FORMAT,
    details: {
      ...MODERN_PARAGRAPH_FORMAT.details!,
      bodyPx: 18,
      lineHeight: 1.6,
      marginPx,
      sectionGapPx: 24,
      blockGapPx: 20,
      headingGapPx: 12,
      entryLayout,
    },
    layout: {
      ...MODERN_PARAGRAPH_FORMAT.layout!,
      contactLayout: "spread",
      skillsStyle: "columns",
      skillsColumns: 3,
    },
  };
}

type ParityCase = {
  title: string;
  fits: boolean;
  prepare: (state: SeedState) => void;
};

const entryLayouts = ["inline", "organization-first", "title-first"] as const;

const parityCases: ParityCase[] = [
  { title: "builtin classic-ats over", fits: false, prepare: () => {} },
  { title: "builtin classic-ats fits", fits: true, prepare: trimForFit },
  {
    title: "builtin modern-tech over",
    fits: false,
    prepare: (state) => {
      state.activePresetId = "systems-eng";
    },
  },
  {
    title: "builtin modern-tech fits",
    fits: true,
    prepare: (state) => {
      state.activePresetId = "systems-eng";
      trimForFit(state);
    },
  },
  {
    title: "compact-serif over",
    fits: false,
    prepare: (state) => {
      applyReferenceFormat(state, COMPACT_SERIF_FORMAT);
      forceOver(state);
    },
  },
  {
    title: "compact-serif fits",
    fits: true,
    prepare: (state) => {
      applyReferenceFormat(state, COMPACT_SERIF_FORMAT);
      trimForFit(state);
    },
  },
  {
    title: "modern-paragraph over",
    fits: false,
    prepare: (state) => {
      applyReferenceFormat(state, MODERN_PARAGRAPH_FORMAT);
      forceOver(state);
    },
  },
  {
    title: "modern-paragraph fits",
    fits: true,
    prepare: (state) => {
      applyReferenceFormat(state, MODERN_PARAGRAPH_FORMAT);
      trimForFit(state);
    },
  },
  ...([20, 64] as const).flatMap((marginPx) =>
    entryLayouts.map((entryLayout) => ({
      title: `extreme margin ${marginPx} ${entryLayout}`,
      fits: false,
      prepare: (state: SeedState) => {
        applyReferenceFormat(state, extremeFormat(marginPx, entryLayout));
        forceOver(state);
      },
    })),
  ),
  {
    title: "extreme margin 64 inline fits",
    fits: true,
    prepare: (state) => {
      applyReferenceFormat(state, extremeFormat(64, "inline"));
      trimForFit(state);
    },
  },
];

async function seedPage(page: Page, prepare: (state: SeedState) => void) {
  const stored = parseSeed();
  prepare(stored.state);
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: RESUME_STORAGE_KEY, value: JSON.stringify(stored) },
  );
  await page.goto("/editor");
}

async function waitForStableMeter(page: Page) {
  const meter = spaceMeter(page);
  await expect(meter).toHaveText(/^Space \d+\/\d+$/);
  await page.waitForFunction(() => {
    const badge = document.querySelector('[aria-label="Estimated lines vs one-page budget"]');
    if (!badge?.textContent?.match(/^Space \d+\/\d+$/)) return false;
    const first = badge.textContent;
    return new Promise<boolean>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(badge.textContent === first);
        });
      });
    });
  });
}

async function measureOffsets(page: Page, rootSelector: string): Promise<OffsetSnapshot> {
  return page.locator(rootSelector).evaluate((root) => {
    const rootRect = root.getBoundingClientRect();
    const measure = (selector: string) =>
      Array.from(root.querySelectorAll(selector)).map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top - rootRect.top, height: rect.height };
      });
    return { h2: measure("h2"), li: measure("li") };
  });
}

function assertNear(actual: ElementBox[], expected: ElementBox[], label: string) {
  expect(actual, `${label} count`).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].top, `${label}[${i}].top`).toBeCloseTo(expected[i].top, 0);
    expect(actual[i].height, `${label}[${i}].height`).toBeCloseTo(expected[i].height, 0);
  }
}

async function readScreenFit(page: Page) {
  return page.locator("#resume-print-root").evaluate((root) => {
    const content = root.querySelector("[data-resume-content]")!;
    const style = getComputedStyle(root);
    const contentHeight = content.getBoundingClientRect().height;
    const available =
      root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return { contentHeight, available };
  });
}

async function readMeter(page: Page) {
  const badge = spaceMeter(page).locator(":scope > span").first();
  const text = await badge.innerText();
  const match = text.match(/^Space (\d+)\/(\d+)$/);
  if (!match) throw new Error(`unexpected meter text: ${text}`);
  const className = await badge.evaluate((node) => node.className);
  return {
    used: Number(match[1]),
    max: Number(match[2]),
    over: className.includes("text-red-700"),
  };
}

for (const parityCase of parityCases) {
  test(`page parity: ${parityCase.title}`, async ({ page }) => {
    await seedPage(page, parityCase.prepare);
    await expect(page.locator("#resume-print-root")).toBeVisible();
    await waitForStableMeter(page);

    const stored = parseSeed();
    parityCase.prepare(stored.state);
    const preset = activePreset(stored.state);
    const expectedMax = maxMeterLines(preset);

    const screenOffsets = await measureOffsets(page, "#resume-print-root");
    const screenFit = await readScreenFit(page);
    const meter = await readMeter(page);
    const isOver = screenFit.contentHeight > screenFit.available + 1;

    expect(meter.over).toBe(isOver);
    expect(meter.max).toBe(expectedMax);
    expect(parityCase.fits).toBe(!isOver);

    const exportButton = page.getByRole("button", { name: "Export", exact: true });
    if (isOver) {
      await expect(exportButton).toBeDisabled();
    } else {
      await expect(exportButton).toBeEnabled();
    }

    if (parityCase.fits) {
      const pdf = await page.pdf({ preferCSSPageSize: true });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
      // PDF text extraction is brittle (hex/glyph splits); verify the print tree is not clipped instead.
      await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
      await page.emulateMedia({ media: "print" });
      const copy = page.locator("body > #resume-print-copy");
      await expect(copy).toBeVisible();
      const lastLiFits = await copy.evaluate((root) => {
        const lis = root.querySelectorAll("li");
        if (!lis.length) return true;
        const rootRect = root.getBoundingClientRect();
        const last = lis[lis.length - 1].getBoundingClientRect();
        return last.bottom <= rootRect.bottom + 1;
      });
      expect(lastLiFits).toBe(true);
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      await page.emulateMedia({ media: "screen" });
    }

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });
    const copy = page.locator("body > #resume-print-copy");
    await expect(copy).toBeVisible();

    const printOffsets = await measureOffsets(page, "body > #resume-print-copy");
    assertNear(printOffsets.h2, screenOffsets.h2, "h2");
    assertNear(printOffsets.li, screenOffsets.li, "li");

    const transforms = await copy.evaluate((element) =>
      [element, ...element.querySelectorAll<HTMLElement>("*")].map(
        (node) => getComputedStyle(node).transform,
      ),
    );
    expect(transforms.every((transform) => transform === "none")).toBe(true);
  });
}
