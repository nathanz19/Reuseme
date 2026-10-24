// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { SEED_PRESETS } from "@/data/seed";
import { useResumeStore } from "@/store/resumeStore";

const store = useResumeStore;
const active = () => store.getState().getActivePreset();

/** Seed presets start over the line budget, so most tests begin from a trimmed canvas. */
function useTrimmedFrontendPreset() {
  store.setState({
    presets: SEED_PRESETS.map((p) =>
      p.id === "frontend-swe"
        ? { ...p, activeBlockIds: ["edu-1", "exp-1", "exp-3", "proj-1"] }
        : p,
    ),
  });
}

beforeEach(() => {
  localStorage.clear();
  store.setState(store.getInitialState(), true);
  useTrimmedFrontendPreset();
});

describe("resume store", () => {
  it("starts on the default preset with no history", () => {
    const state = store.getState();
    expect(state.activePresetId).toBe("frontend-swe");
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
  });

  it("adds a block into its section order and supports undo/redo", () => {
    expect(store.getState().addBlockToResume("exp-2")).toBe(true);
    expect(active().activeBlockIds).toEqual([
      "edu-1",
      "exp-1",
      "exp-3",
      "exp-2",
      "proj-1",
    ]);

    store.getState().undo();
    expect(active().activeBlockIds).not.toContain("exp-2");
    expect(store.getState().future).toHaveLength(1);

    store.getState().redo();
    expect(active().activeBlockIds).toContain("exp-2");
    expect(store.getState().future).toHaveLength(0);
  });

  it("refuses duplicates and inserts that overflow the page", () => {
    expect(store.getState().addBlockToResume("exp-1")).toBe(false);

    store.setState({ presets: SEED_PRESETS });
    expect(store.getState().addBlockToResume("exp-2")).toBe(false);
    expect(store.getState().past).toHaveLength(0);
  });

  it("inserts before a given block in the same section", () => {
    store.getState().insertBlockOnResume("exp-2", "exp-1");
    expect(active().activeBlockIds).toEqual([
      "edu-1",
      "exp-2",
      "exp-1",
      "exp-3",
      "proj-1",
    ]);
  });

  it("removes and reorders blocks", () => {
    store.getState().removeBlockFromResume("proj-1");
    expect(active().activeBlockIds).toEqual(["edu-1", "exp-1", "exp-3"]);

    store.getState().reorderInSection("experience", "exp-3", "exp-1");
    expect(active().activeBlockIds).toEqual(["edu-1", "exp-3", "exp-1"]);
  });

  it("does not record history for no-op changes", () => {
    store.getState().reorderInSection("experience", "exp-1", "exp-1");
    store.getState().removeBlockFromResume("not-on-canvas");
    store.getState().switchPreset("missing-preset");
    expect(store.getState().past).toHaveLength(0);
  });

  it("switches presets and templates as undoable changes", () => {
    store.getState().switchPreset("systems-eng");
    expect(active().id).toBe("systems-eng");

    store.getState().setTemplate("classic-ats");
    expect(active().templateId).toBe("classic-ats");

    store.getState().undo();
    store.getState().undo();
    expect(active().id).toBe("frontend-swe");
    expect(
      store.getState().presets.find((p) => p.id === "systems-eng")?.templateId,
    ).toBe("modern-tech");
  });

  it("duplicates the active preset as an independent copy", () => {
    store.getState().duplicatePreset();
    const copy = active();
    expect(copy.id).toMatch(/^frontend-swe-copy-/);
    expect(copy.name).toBe("Frontend SWE (copy)");
    expect(store.getState().presets).toHaveLength(3);

    store.getState().removeBlockFromResume("exp-1");
    const original = store
      .getState()
      .presets.find((p) => p.id === "frontend-swe")!;
    expect(original.activeBlockIds).toContain("exp-1");
  });

  it("stores tailor overrides on the active preset only", () => {
    const vaultBefore = JSON.stringify(store.getState().vaultBlocks);
    expect(
      store.getState().acceptTailorOverride("exp-1", 0, "Shipped dashboards."),
    ).toBe(true);
    expect(active().bulletOverrides).toEqual({
      "exp-1": { 0: "Shipped dashboards." },
    });
    expect(
      store.getState().presets.find((p) => p.id === "systems-eng")
        ?.bulletOverrides,
    ).toEqual({});
    expect(JSON.stringify(store.getState().vaultBlocks)).toBe(vaultBefore);

    store.getState().undo();
    expect(active().bulletOverrides).toEqual({});
  });

  it("rejects a tailor override that would overflow the page", () => {
    const longText = "word ".repeat(2000);
    expect(store.getState().acceptTailorOverride("exp-1", 0, longText)).toBe(
      false,
    );
    expect(active().bulletOverrides).toEqual({});
  });

  it("persists presets to localStorage and rehydrates without history", async () => {
    store.getState().removeBlockFromResume("proj-1");
    const raw = localStorage.getItem("reuseme-resume") ?? "{}";
    const saved = JSON.parse(raw);
    expect(saved.state.activePresetId).toBe("frontend-swe");
    expect(
      saved.state.presets.find((p: { id: string }) => p.id === "frontend-swe")
        .activeBlockIds,
    ).not.toContain("proj-1");
    expect(saved.state.past).toBeUndefined();

    // Resetting writes through persist, so restore the saved payload like a page reload would see it.
    store.setState(store.getInitialState(), true);
    localStorage.setItem("reuseme-resume", raw);
    await store.getState().rehydrate();
    expect(active().activeBlockIds).not.toContain("proj-1");
    expect(store.getState().past).toEqual([]);
    expect(store.getState()._hasHydrated).toBe(true);
  });
});
