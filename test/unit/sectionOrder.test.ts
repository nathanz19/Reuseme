import { describe, expect, it } from "vitest";
import { SEED_PRESETS } from "@/data/seed";
import {
  defaultSectionOrder,
  moveSection,
  resolveSectionOrder,
} from "@/lib/sectionOrder";
import type { ResumePreset } from "@/types/resume";

const BLOCK_SECTIONS = [
  "education",
  "experience",
  "project",
  "leadership",
  "certification",
  "awards",
  "publications",
];

function preset(overrides: Partial<ResumePreset> = {}): ResumePreset {
  return { ...SEED_PRESETS[0], additionalSections: [], ...overrides };
}

describe("section order", () => {
  it("defaults to title and summary, block sections, custom sections, then skills", () => {
    const withExtras = preset({
      additionalSections: [
        { id: "custom-a", title: "Hobbies", content: "Chess" },
        { id: "summary", title: "Professional Summary", content: "Builder" },
        { id: "target-title", title: "Target Title", content: "Engineer" },
      ],
    });
    expect(defaultSectionOrder(withExtras)).toEqual([
      "summary",
      "target-title",
      ...BLOCK_SECTIONS,
      "custom-a",
      "skills",
    ]);
    expect(resolveSectionOrder(preset())).toEqual([...BLOCK_SECTIONS, "skills"]);
  });

  it("keeps a saved order and drops sections that no longer exist", () => {
    const saved = ["skills", "project", "custom-gone", "experience", ...BLOCK_SECTIONS];
    expect(resolveSectionOrder(preset({ sectionOrder: saved }))).toEqual([
      "skills",
      "project",
      "experience",
      "education",
      "leadership",
      "certification",
      "awards",
      "publications",
    ]);
  });

  it("places sections missing from the saved order after their default predecessor", () => {
    const arranged = preset({
      sectionOrder: ["project", "experience", "education", "skills"],
      additionalSections: [
        { id: "target-title", title: "Target Title", content: "Engineer" },
        { id: "custom-a", title: "Hobbies", content: "Chess" },
      ],
    });
    expect(resolveSectionOrder(arranged)).toEqual([
      "target-title",
      "project",
      "leadership",
      "certification",
      "awards",
      "publications",
      "custom-a",
      "experience",
      "education",
      "skills",
    ]);
  });

  it("moves a section into another section's slot", () => {
    const order = ["education", "experience", "project", "skills"];
    expect(moveSection(order, "project", "education")).toEqual([
      "project",
      "education",
      "experience",
      "skills",
    ]);
    expect(moveSection(order, "education", "project")).toEqual([
      "experience",
      "project",
      "education",
      "skills",
    ]);
    expect(moveSection(order, "project", "project")).toBeNull();
    expect(moveSection(order, "project", "missing")).toBeNull();
  });
});
