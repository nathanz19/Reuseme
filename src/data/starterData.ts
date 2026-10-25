import { DEFAULT_PRESET_ID, SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

// Next.js embeds this public flag at compile time. Restart `npm run dev` after changing it.
export const DEMO_DATA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "1";
// Sample saves stay separate from a real workspace. The old "reuseme-resume" key stays untouched.
export const RESUME_STORAGE_KEY = DEMO_DATA_ENABLED ? "reuseme-resume-demo" : "reuseme-resume-user";

function blankPreset(): ResumePreset {
  return {
    id: "untitled-document",
    name: "Untitled document",
    templateId: "classic-ats",
    header: { fullName: "", email: "", phone: "", location: "", links: [] },
    activeBlockIds: [],
    bulletOverrides: {},
    customSkillsSection: [],
    additionalSections: [],
  };
}

export function createStarterData(demo = DEMO_DATA_ENABLED): {
  vaultBlocks: AccomplishmentBlock[];
  presets: ResumePreset[];
  activePresetId: string;
} {
  if (!demo) {
    const preset = blankPreset();
    return { vaultBlocks: [], presets: [preset], activePresetId: preset.id };
  }
  return {
    vaultBlocks: structuredClone(SEED_BLOCKS),
    presets: structuredClone(SEED_PRESETS),
    activePresetId: DEFAULT_PRESET_ID,
  };
}
