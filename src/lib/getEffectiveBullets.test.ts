import { describe, expect, it } from "vitest";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

const block: AccomplishmentBlock = {
  id: "b1",
  category: "experience",
  title: "Eng",
  organization: "Co",
  startDate: "2020",
  endDate: "2021",
  bullets: ["alpha", "beta"],
  sourceContext: "notes",
  tags: [],
  isArchived: false,
};

const preset: ResumePreset = {
  id: "p1",
  name: "P",
  templateId: "classic-ats",
  header: {
    fullName: "A",
    email: "a@b.c",
    phone: "1",
    location: "X",
    links: [],
  },
  activeBlockIds: [],
  bulletOverrides: { b1: { 1: "gamma" } },
  customSkillsSection: [],
};

describe("getEffectiveBullets", () => {
  it("applies overrides by index", () => {
    expect(getEffectiveBullets(block, preset)).toEqual(["alpha", "gamma"]);
  });
});
