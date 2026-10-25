import { DEFAULT_PRESET_ID, SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

// This non-secret client flag is embedded by Next.js at build time.
export const DEMO_DATA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "1";
// Leave the legacy seeded workspace untouched as a backup.
export const RESUME_STORAGE_KEY = DEMO_DATA_ENABLED ? "reuseme-resume-demo" : "reuseme-resume-user";

export function createStarterData(demo = DEMO_DATA_ENABLED): {
  vaultBlocks: AccomplishmentBlock[]; presets: ResumePreset[]; activePresetId: string;
} {
  if (demo) return {
    vaultBlocks: structuredClone(SEED_BLOCKS), presets: structuredClone(SEED_PRESETS), activePresetId: DEFAULT_PRESET_ID,
  };
  const preset: ResumePreset = {
    id: "untitled-document", name: "Untitled document", templateId: "classic-ats",
    header: { fullName: "", email: "", phone: "", location: "", links: [] },
    activeBlockIds: [], bulletOverrides: {}, customSkillsSection: [], additionalSections: [],
  };
  return { vaultBlocks: [], presets: [preset], activePresetId: preset.id };
}
