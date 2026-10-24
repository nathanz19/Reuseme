import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_PRESET_ID,
  SEED_BLOCKS,
  SEED_PRESETS,
} from "@/data/seed";
import { HISTORY_LIMIT, PERSIST_VERSION } from "@/lib/tunables";
import type {
  AccomplishmentBlock,
  ResumePreset,
  TemplateId,
} from "@/types/resume";
import { SECTION_ORDER } from "@/types/resume";

interface CanvasSnapshot {
  presets: ResumePreset[];
  activePresetId: string;
}

function clonePresets(presets: ResumePreset[]): ResumePreset[] {
  return JSON.parse(JSON.stringify(presets)) as ResumePreset[];
}

function snapshot(state: {
  presets: ResumePreset[];
  activePresetId: string;
}): CanvasSnapshot {
  return {
    presets: clonePresets(state.presets),
    activePresetId: state.activePresetId,
  };
}

function presetsEqual(a: ResumePreset[], b: ResumePreset[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface ResumeState {
  vaultBlocks: AccomplishmentBlock[];
  presets: ResumePreset[];
  activePresetId: string;
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
  _hasHydrated: boolean;
  rehydrate: () => Promise<void>;
  commit: (mutator: (draft: ResumeState) => void) => void;
  undo: () => void;
  redo: () => void;
  addBlockToResume: (blockId: string) => void;
  insertBlockOnResume: (blockId: string, beforeBlockId: string | null) => void;
  removeBlockFromResume: (blockId: string) => void;
  reorderInSection: (
    category: AccomplishmentBlock["category"],
    activeId: string,
    overId: string,
  ) => void;
  updateHeader: (header: ResumePreset["header"]) => void;
  updateCustomSkills: (skills: string[]) => void;
  setTemplate: (templateId: TemplateId) => void;
  switchPreset: (presetId: string) => void;
  duplicatePreset: () => void;
  acceptTailorOverride: (
    blockId: string,
    bulletIndex: number,
    text: string,
  ) => void;
  getActivePreset: () => ResumePreset;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      vaultBlocks: SEED_BLOCKS,
      presets: clonePresets(SEED_PRESETS),
      activePresetId: DEFAULT_PRESET_ID,
      past: [],
      future: [],
      _hasHydrated: false,

      rehydrate: async () => {
        await useResumeStore.persist.rehydrate();
        set({ past: [], future: [], _hasHydrated: true });
      },

      getActivePreset: () => {
        const state = get();
        const preset = state.presets.find((p) => p.id === state.activePresetId);
        if (!preset) {
          throw new Error("Active preset missing");
        }
        return preset;
      },

      commit: (mutator) => {
        const state = get();
        const before = snapshot(state);
        const draft: ResumeState = {
          ...state,
          presets: clonePresets(state.presets),
        };
        mutator(draft);
        const afterPresets = draft.presets;
        const afterActive = draft.activePresetId;
        if (
          presetsEqual(before.presets, afterPresets) &&
          before.activePresetId === afterActive
        ) {
          return;
        }
        set((state) => {
          const past = [...state.past, before].slice(-HISTORY_LIMIT);
          return {
            presets: afterPresets,
            activePresetId: afterActive,
            past,
            future: [],
          };
        });
      },

      undo: () => {
        const { past, future, presets, activePresetId } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const current = snapshot({ presets, activePresetId });
        set({
          presets: previous.presets,
          activePresetId: previous.activePresetId,
          past: past.slice(0, -1),
          future: [...future, current],
        });
      },

      redo: () => {
        const { past, future, presets, activePresetId } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        const current = snapshot({ presets, activePresetId });
        set({
          presets: next.presets,
          activePresetId: next.activePresetId,
          past: [...past, current],
          future: future.slice(0, -1),
        });
      },

      insertBlockOnResume: (blockId, beforeBlockId) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!preset || preset.activeBlockIds.includes(blockId)) return;
          const block = draft.vaultBlocks.find((b) => b.id === blockId);
          if (!block) return;

          const filtered = preset.activeBlockIds.filter((id) => id !== blockId);
          let sectionIds = filtered.filter((id) => {
            const b = draft.vaultBlocks.find((x) => x.id === id);
            return b?.category === block.category;
          });

          if (
            beforeBlockId &&
            sectionIds.includes(beforeBlockId)
          ) {
            const insertAt = sectionIds.indexOf(beforeBlockId);
            sectionIds = [
              ...sectionIds.slice(0, insertAt),
              blockId,
              ...sectionIds.slice(insertAt),
            ];
          } else {
            sectionIds = [...sectionIds, blockId];
          }

          const next: string[] = [];
          for (const cat of SECTION_ORDER) {
            if (cat === block.category) {
              next.push(...sectionIds);
            } else {
              next.push(
                ...filtered.filter((id) => {
                  const b = draft.vaultBlocks.find((x) => x.id === id);
                  return b?.category === cat;
                }),
              );
            }
          }
          preset.activeBlockIds = next;
        });
      },

      addBlockToResume: (blockId) => {
        get().insertBlockOnResume(blockId, null);
      },

      removeBlockFromResume: (blockId) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!preset) return;
          preset.activeBlockIds = preset.activeBlockIds.filter(
            (id) => id !== blockId,
          );
        });
      },

      reorderInSection: (category, activeId, overId) => {
        if (activeId === overId) return;
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!preset) return;
          const sectionIds = preset.activeBlockIds.filter((id) => {
            const b = draft.vaultBlocks.find((x) => x.id === id);
            return b?.category === category;
          });
          const oldIndex = sectionIds.indexOf(activeId);
          const newIndex = sectionIds.indexOf(overId);
          if (oldIndex < 0 || newIndex < 0) return;
          const nextSection = [...sectionIds];
          const [moved] = nextSection.splice(oldIndex, 1);
          nextSection.splice(newIndex, 0, moved);

          const rebuilt: string[] = [];
          for (const cat of SECTION_ORDER) {
            if (cat === category) {
              rebuilt.push(...nextSection);
            } else {
              rebuilt.push(
                ...preset.activeBlockIds.filter((id) => {
                  const b = draft.vaultBlocks.find((x) => x.id === id);
                  return b?.category === cat;
                }),
              );
            }
          }
          preset.activeBlockIds = rebuilt;
        });
      },

      updateHeader: (header) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (preset) preset.header = header;
        });
      },

      updateCustomSkills: (skills) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (preset) preset.customSkillsSection = skills;
        });
      },

      setTemplate: (templateId) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (preset) preset.templateId = templateId;
        });
      },

      switchPreset: (presetId) => {
        get().commit((draft) => {
          if (draft.presets.some((p) => p.id === presetId)) {
            draft.activePresetId = presetId;
          }
        });
      },

      duplicatePreset: () => {
        get().commit((draft) => {
          const active = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!active) return;
          const newId = `${active.id}-copy-${Date.now()}`;
          const copy: ResumePreset = {
            ...clonePresets([active])[0],
            id: newId,
            name: `${active.name} (copy)`,
          };
          draft.presets.push(copy);
          draft.activePresetId = newId;
        });
      },

      acceptTailorOverride: (blockId, bulletIndex, text) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!preset) return;
          if (!preset.bulletOverrides[blockId]) {
            preset.bulletOverrides[blockId] = {};
          }
          preset.bulletOverrides[blockId][bulletIndex] = text;
        });
      },
    }),
    {
      name: "reuseme-resume",
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        vaultBlocks: state.vaultBlocks,
        presets: state.presets,
        activePresetId: state.activePresetId,
      }),
      skipHydration: true,
      migrate: (persisted) => {
        const p = persisted as Partial<ResumeState>;
        return {
          vaultBlocks: SEED_BLOCKS,
          presets: clonePresets(SEED_PRESETS),
          activePresetId: p.activePresetId ?? DEFAULT_PRESET_ID,
        };
      },
    },
  ),
);
