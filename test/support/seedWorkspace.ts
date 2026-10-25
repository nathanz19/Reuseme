import { RESUME_STORAGE_KEY } from "@/data/starterData";
import { PERSIST_VERSION } from "@/lib/tunables";
import { DEFAULT_PRESET_ID, SEED_BLOCKS, SEED_PRESETS } from "../fixtures/seed";

export function seedResumeState() {
  return {
    vaultBlocks: structuredClone(SEED_BLOCKS),
    presets: structuredClone(SEED_PRESETS),
    activePresetId: DEFAULT_PRESET_ID,
  };
}

export function seedStorageValue() {
  const seeded = seedResumeState();
  return JSON.stringify({
    state: {
      savedReferenceFormats: [],
      vaultBlocks: seeded.vaultBlocks,
      presets: seeded.presets,
      activePresetId: seeded.activePresetId,
    },
    version: PERSIST_VERSION,
  });
}

export { RESUME_STORAGE_KEY };
