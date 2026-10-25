// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { useResumeStore } from "@/store/resumeStore";
import { DEMO_REFERENCE_FORMAT } from "@/schemas/referenceFormat";
import { resolveSectionOrder } from "@/lib/sectionOrder";

beforeEach(() => { localStorage.clear(); useResumeStore.setState(useResumeStore.getInitialState(), true); });
it("deletes a saved template permanently while keeping documents already using it", async () => {
  const state = useResumeStore.getState();
  state.applyReferenceFormat(state.activePresetId, DEMO_REFERENCE_FORMAT, "Removable template");
  const saved = useResumeStore.getState().savedReferenceFormats[0];
  useResumeStore.getState().deleteReferenceFormat(saved.id);
  expect(useResumeStore.getState().savedReferenceFormats).toEqual([]);
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toEqual(DEMO_REFERENCE_FORMAT);
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().savedReferenceFormats).toEqual([]);
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toEqual(DEMO_REFERENCE_FORMAT);
});
it("keeps uploaded styles in a persistent library after switching templates", async () => {
  const id = useResumeStore.getState().activePresetId;
  useResumeStore.getState().applyReferenceFormat(id, DEMO_REFERENCE_FORMAT, "My reference.pdf");
  expect(useResumeStore.getState().savedReferenceFormats[0].name).toBe("My reference");
  useResumeStore.getState().setTemplate("modern-tech");
  await useResumeStore.getState().rehydrate();
  const saved = useResumeStore.getState().savedReferenceFormats[0];
  expect(saved.name).toBe("My reference");
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toBeUndefined();
  useResumeStore.getState().applyReferenceFormat(id, saved.format, saved.name);
  expect(useResumeStore.getState().savedReferenceFormats).toHaveLength(1);
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toEqual(DEMO_REFERENCE_FORMAT);
});
it("recovers an already-applied legacy uploaded style into the template library", async () => {
  const state = useResumeStore.getState();
  useResumeStore.setState({ presets: state.presets.map((preset) => preset.id === state.activePresetId ? { ...preset, referenceFormat: DEMO_REFERENCE_FORMAT } : preset) });
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().savedReferenceFormats).toHaveLength(1);
  expect(useResumeStore.getState().getActivePreset().referenceFormatId).toBe(useResumeStore.getState().savedReferenceFormats[0].id);
});
it("applies only formatting and section order to the selected document, with undo and redo", () => {
  const state = useResumeStore.getState();
  const before = structuredClone(state.getActivePreset());
  const other = structuredClone(state.presets.find((preset) => preset.id !== before.id));
  state.applyReferenceFormat(before.id, DEMO_REFERENCE_FORMAT);
  const after = useResumeStore.getState().getActivePreset();
  expect(after.referenceFormat).toEqual(DEMO_REFERENCE_FORMAT);
  expect(after.header).toEqual(before.header);
  expect(after.activeBlockIds).toEqual(before.activeBlockIds);
  expect(after.bulletOverrides).toEqual(before.bulletOverrides);
  expect(after.customSkillsSection).toEqual(before.customSkillsSection);
  expect(new Set(resolveSectionOrder(after))).toEqual(new Set(resolveSectionOrder(before)));
  expect(useResumeStore.getState().presets.find((preset) => preset.id === other?.id)).toEqual(other);
  useResumeStore.getState().undo();
  expect(useResumeStore.getState().getActivePreset()).toEqual(before);
  useResumeStore.getState().redo();
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toEqual(DEMO_REFERENCE_FORMAT);
  useResumeStore.getState().setTemplate("modern-tech");
  expect(useResumeStore.getState().getActivePreset().referenceFormat).toBeUndefined();
});
