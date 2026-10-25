import { cleanBlockReferences } from "@/lib/vaultEditing";
import { useSessionStore } from "@/store/sessionStore";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_PRESET_ID,
  SEED_BLOCKS,
  SEED_PRESETS,
} from "@/data/seed";
import {
  activeBlockIdsAfterInsert,
  canApplyTailorOverride,
  canInsertBlockOnResume,
} from "@/lib/lineCount";
import { moveSection, resolveSectionOrder } from "@/lib/sectionOrder";
import { HISTORY_LIMIT, PERSIST_VERSION } from "@/lib/tunables";
import type {
  AccomplishmentBlock,
  ResumePreset,
  TemplateId,
} from "@/types/resume";
import { SECTION_ORDER } from "@/types/resume";
import { ReferenceFormatSchema, type ReferenceFormat } from "@/schemas/referenceFormat";

function invalidateBlockSession(blockId: string) {
  useSessionStore.setState((state) => {
    const rankings = { ...state.rankings };
    delete rankings[blockId];
    return {
      rankings,
      rankingsList: state.rankingsList.filter((ranking) => ranking.blockId !== blockId),
      ...(state.tailorDialog?.blockId === blockId ? {
        tailorDialog: null, tailorProposal: null, tailorLoading: false,
      } : {}),
    };
  });
}

interface CanvasSnapshot {
  presets: ResumePreset[];
  activePresetId: string;
  // Vault blocks are replaced immutably, so holding a reference is safe.
  vaultBlocks: AccomplishmentBlock[];
}

function clonePresets(presets: ResumePreset[]): ResumePreset[] {
  return JSON.parse(JSON.stringify(presets)) as ResumePreset[];
}

function snapshot(state: {
  presets: ResumePreset[];
  activePresetId: string;
  vaultBlocks: AccomplishmentBlock[];
}): CanvasSnapshot {
  return {
    presets: clonePresets(state.presets),
    activePresetId: state.activePresetId,
    vaultBlocks: state.vaultBlocks,
  };
}

function presetsEqual(a: ResumePreset[], b: ResumePreset[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface ResumeState {
  savedReferenceFormats: { id: string; name: string; format: ReferenceFormat }[];
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
  addBlockToResume: (blockId: string) => boolean;
  insertBlockOnResume: (
    blockId: string,
    beforeBlockId: string | null,
  ) => boolean;
  removeBlockFromResume: (blockId: string) => void;
  reorderInSection: (
    category: AccomplishmentBlock["category"],
    activeId: string,
    overId: string,
  ) => void;
  reorderSections: (activeId: string, overId: string) => void;
  updateHeader: (header: ResumePreset["header"]) => void;
  updateCustomSkills: (skills: string[]) => void;
  setTemplate: (templateId: TemplateId) => void;
  applyReferenceFormat: (presetId: string, format: ReferenceFormat, name?: string) => void;
  deleteReferenceFormat: (id: string) => void;
  switchPreset: (presetId: string) => void;
  duplicatePreset: () => void;
  createDocument: () => void;
  renameDocument: (id: string, name: string) => void;
  closeDocument: (id: string) => void;
  reorderDocuments: (activeId: string, overId: string) => void;
  acceptTailorOverride: (
    blockId: string,
    bulletIndex: number,
    text: string,
  ) => boolean;
  updateVaultBlock: (block: AccomplishmentBlock) => void;
  deleteVaultBlock: (blockId: string) => void;
  createVaultBlock: (block: AccomplishmentBlock) => void;
  getActivePreset: () => ResumePreset;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      savedReferenceFormats: [],
      vaultBlocks: SEED_BLOCKS,
      presets: clonePresets(SEED_PRESETS),
      activePresetId: DEFAULT_PRESET_ID,
      past: [],
      future: [],
      _hasHydrated: false,

      rehydrate: async () => {
        await useResumeStore.persist.rehydrate();
        const state = get();
        const library = [...state.savedReferenceFormats];
        const presets = state.presets.map((preset) => {
          if (!preset.referenceFormat || preset.referenceFormatId) return preset;
          const known = library.find((entry) => entry.id === preset.referenceFormatId || JSON.stringify(entry.format) === JSON.stringify(preset.referenceFormat));
          const saved = known ?? { id: crypto.randomUUID(), name: `${preset.name} format`, format: preset.referenceFormat };
          if (!known) library.push(saved);
          return { ...preset, referenceFormatId: saved.id };
        });
        set({ presets, savedReferenceFormats: library, past: [], future: [], _hasHydrated: true });
      },

      updateVaultBlock: (block) => {
        const previous = get().vaultBlocks.find((entry) => entry.id === block.id);
        if (!previous) return;
        const bulletsChanged = JSON.stringify(previous.bullets) !== JSON.stringify(block.bullets);
        get().commit((draft) => {
          draft.vaultBlocks = draft.vaultBlocks.map((entry) => entry.id === block.id ? block : entry);
          if (bulletsChanged) draft.presets = cleanBlockReferences(draft.presets, block.id, false);
        });
        invalidateBlockSession(block.id);
      },

      deleteVaultBlock: (blockId) => {
        get().commit((draft) => {
          draft.vaultBlocks = draft.vaultBlocks.filter((block) => block.id !== blockId);
          draft.presets = cleanBlockReferences(draft.presets, blockId, true);
        });
        invalidateBlockSession(blockId);
      },

      createVaultBlock: (block) => {
        get().commit((draft) => {
          draft.vaultBlocks = [...draft.vaultBlocks, block];
        });
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
        const afterVault = draft.vaultBlocks;
        if (
          presetsEqual(before.presets, afterPresets) &&
          before.activePresetId === afterActive &&
          before.vaultBlocks === afterVault
        ) {
          return;
        }
        set((state) => {
          const past = [...state.past, before].slice(-HISTORY_LIMIT);
          return {
            presets: afterPresets,
            activePresetId: afterActive,
            vaultBlocks: afterVault,
            past,
            future: [],
          };
        });
      },

      undo: () => {
        const { past, future, presets, activePresetId, vaultBlocks } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const current = snapshot({ presets, activePresetId, vaultBlocks });
        set({
          presets: previous.presets,
          activePresetId: previous.activePresetId,
          vaultBlocks: previous.vaultBlocks,
          past: past.slice(0, -1),
          future: [...future, current],
        });
      },

      redo: () => {
        const { past, future, presets, activePresetId, vaultBlocks } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        const current = snapshot({ presets, activePresetId, vaultBlocks });
        set({
          presets: next.presets,
          activePresetId: next.activePresetId,
          vaultBlocks: next.vaultBlocks,
          past: [...past, current],
          future: future.slice(0, -1),
        });
      },

      insertBlockOnResume: (blockId, beforeBlockId) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === state.activePresetId);
        if (
          !preset ||
          !canInsertBlockOnResume(
            preset,
            state.vaultBlocks,
            blockId,
            beforeBlockId,
          )
        ) {
          return false;
        }
        const nextIds = activeBlockIdsAfterInsert(
          preset,
          state.vaultBlocks,
          blockId,
          beforeBlockId,
        );
        if (!nextIds) return false;

        get().commit((draft) => {
          const draftPreset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!draftPreset) return;
          draftPreset.activeBlockIds = nextIds;
        });
        return true;
      },

      addBlockToResume: (blockId) => {
        return get().insertBlockOnResume(blockId, null);
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

      reorderSections: (activeId, overId) => {
        get().commit((draft) => {
          const preset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!preset) return;
          const next = moveSection(resolveSectionOrder(preset), activeId, overId);
          if (next) preset.sectionOrder = next;
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
          if (preset) { preset.templateId = templateId; delete preset.referenceFormat; delete preset.referenceFormatId; }
        });
      },

      applyReferenceFormat: (presetId, input, name) => {
        const format = ReferenceFormatSchema.parse(input);
        if (!get().presets.some((entry) => entry.id === presetId)) return;
        const cleanName = name?.replace(/\.(pdf|png|jpe?g)$/i, "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
        const existingFormat = get().savedReferenceFormats.find((entry) => JSON.stringify(entry.format) === JSON.stringify(format) && (!cleanName || entry.name === cleanName));
        const saved = existingFormat ?? {
          id: crypto.randomUUID(),
          name: cleanName || "Uploaded format",
          format,
        };
        // The template library survives document Undo and switching templates.
        if (!existingFormat) set({ savedReferenceFormats: [...get().savedReferenceFormats, saved] });
        get().commit((draft) => {
          const preset = draft.presets.find((entry) => entry.id === presetId);
          if (!preset) return;
          preset.referenceFormat = format;
          preset.referenceFormatId = saved.id;
          preset.templateId = "classic-ats";
          const existing = resolveSectionOrder(preset);
          const ordered: string[] = [...new Set(format.sectionOrder)].filter((id) => existing.includes(id));
          preset.sectionOrder = [...ordered, ...existing.filter((id) => !ordered.includes(id))];
        });
      },

      deleteReferenceFormat: (id) => {
        // Documents retain their style snapshot; only remove it from the library.
        set({ savedReferenceFormats: get().savedReferenceFormats.filter((entry) => entry.id !== id) });
      },

      switchPreset: (presetId) => {
        get().commit((draft) => {
          if (draft.presets.some((p) => p.id === presetId)) {
            draft.activePresetId = presetId;
          }
        });
      },

      reorderDocuments: (activeId, overId) => {
        if (activeId === overId) return;
        get().commit((draft) => {
          const from = draft.presets.findIndex((preset) => preset.id === activeId);
          const to = draft.presets.findIndex((preset) => preset.id === overId);
          if (from < 0 || to < 0) return;
          const [document] = draft.presets.splice(from, 1);
          draft.presets.splice(to, 0, document);
        });
      },

      renameDocument: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        get().commit((draft) => {
          const document = draft.presets.find((preset) => preset.id === id);
          if (document) document.name = trimmed;
        });
      },

      closeDocument: (id) => {
        get().commit((draft) => {
          const index = draft.presets.findIndex((preset) => preset.id === id);
          if (index < 0) return;
          const closed = draft.presets[index];
          draft.presets.splice(index, 1);
          if (!draft.presets.length) {
            const blank: ResumePreset = {
              ...clonePresets([closed])[0],
              id: crypto.randomUUID(), name: "Untitled document",
              activeBlockIds: [], bulletOverrides: {}, customSkillsSection: [], additionalSections: [],
              sectionOrder: undefined,
            };
            draft.presets.push(blank);
          }
          if (draft.activePresetId === id) {
            draft.activePresetId = draft.presets[Math.min(index, draft.presets.length - 1)].id;
          }
        });
      },

      createDocument: () => {
        get().commit((draft) => {
          const active = draft.presets.find((preset) => preset.id === draft.activePresetId);
          if (!active) return;
          const document: ResumePreset = {
            ...clonePresets([active])[0],
            id: crypto.randomUUID(),
            name: `Untitled document ${draft.presets.length + 1}`,
            activeBlockIds: [],
            bulletOverrides: {},
            customSkillsSection: [],
            additionalSections: [],
            sectionOrder: undefined,
          };
          draft.presets.push(document);
          draft.activePresetId = document.id;
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
        const state = get();
        const preset = state.presets.find((p) => p.id === state.activePresetId);
        if (
          !preset ||
          !canApplyTailorOverride(
            preset,
            state.vaultBlocks,
            blockId,
            bulletIndex,
            text,
          )
        ) {
          return false;
        }
        get().commit((draft) => {
          const draftPreset = draft.presets.find(
            (p) => p.id === draft.activePresetId,
          );
          if (!draftPreset) return;
          if (!draftPreset.bulletOverrides[blockId]) {
            draftPreset.bulletOverrides[blockId] = {};
          }
          draftPreset.bulletOverrides[blockId][bulletIndex] = text;
        });
        return true;
      },
    }),
    {
      name: "reuseme-resume",
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedReferenceFormats: state.savedReferenceFormats,
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
