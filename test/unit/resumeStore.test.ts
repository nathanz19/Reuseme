// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { SEED_PRESETS } from "../fixtures/seed";
import { RESUME_STORAGE_KEY } from "@/data/starterData";
import { useResumeStore } from "@/store/resumeStore";
import { seedResumeState } from "../support/seedWorkspace";

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
  store.setState(seedResumeState());
  useTrimmedFrontendPreset();
});

describe("resume store", () => {
  it("reorders document tabs without changing the active document and supports undo", () => {
    const before = store.getState().presets.map((preset) => preset.id);
    const activeId = store.getState().activePresetId;
    store.getState().reorderDocuments(before[0], before[1]);
    expect(store.getState().presets.map((preset) => preset.id)).toEqual([before[1], before[0]]);
    expect(store.getState().activePresetId).toBe(activeId);
    store.getState().undo();
    expect(store.getState().presets.map((preset) => preset.id)).toEqual(before);
  });

  it("renames documents, rejects blank names, and supports undo", () => {
    const original = active();
    store.getState().renameDocument(original.id, "  Backend Resume  ");
    expect(active().name).toBe("Backend Resume");
    store.getState().renameDocument(original.id, "   ");
    expect(active().name).toBe("Backend Resume");
    store.getState().undo();
    expect(active().name).toBe(original.name);
  });

  it("closes active tabs safely and keeps a blank document after closing the last", () => {
    const source = structuredClone(active());
    const vault = store.getState().vaultBlocks;
    store.getState().closeDocument(source.id);
    expect(active().id).toBe("systems-eng");
    store.getState().undo();
    expect(active()).toEqual(source);
    store.getState().closeDocument("systems-eng");
    expect(active()).toEqual(source);
    store.getState().closeDocument(source.id);
    expect(store.getState().presets).toHaveLength(1);
    expect(active().id).not.toBe(source.id);
    expect(active().activeBlockIds).toEqual([]);
    expect(store.getState().vaultBlocks).toEqual(vault);
  });

  it("creates a separate empty document without changing the source or vault", () => {
    const source = structuredClone(active());
    const vault = store.getState().vaultBlocks;
    store.getState().createDocument();
    expect(active().id).not.toBe(source.id);
    expect(active().activeBlockIds).toEqual([]);
    expect(active().customSkillsSection).toEqual([]);
    expect(active().bulletOverrides).toEqual({});
    expect(store.getState().presets.find((preset) => preset.id === source.id)).toEqual(source);
    expect(store.getState().vaultBlocks).toEqual(vault);
    store.getState().undo();
    expect(active()).toEqual(source);
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

  it("reorders whole sections on the active document as one undo step", () => {
    store.getState().reorderSections("project", "education");
    expect(active().sectionOrder?.slice(0, 3)).toEqual(["project", "education", "experience"]);
    expect(active().activeBlockIds).toEqual(["edu-1", "exp-1", "exp-3", "proj-1"]);
    expect(
      store.getState().presets.find((p) => p.id === "systems-eng")?.sectionOrder,
    ).toBeUndefined();
    expect(store.getState().past).toHaveLength(1);

    store.getState().undo();
    expect(active().sectionOrder).toBeUndefined();
    store.getState().redo();
    expect(active().sectionOrder?.[0]).toBe("project");
  });

  it("starts new documents with the default section order", () => {
    store.getState().reorderSections("skills", "education");
    store.getState().createDocument();
    expect(active().sectionOrder).toBeUndefined();
  });

  it("does not record history for no-op changes", () => {
    store.getState().reorderSections("project", "project");
    store.getState().reorderSections("project", "not-a-section");
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
    const raw = localStorage.getItem(RESUME_STORAGE_KEY) ?? "{}";
    const saved = JSON.parse(raw);
    expect(saved.state.activePresetId).toBe("frontend-swe");
    expect(
      saved.state.presets.find((p: { id: string }) => p.id === "frontend-swe")
        .activeBlockIds,
    ).not.toContain("proj-1");
    expect(saved.state.past).toBeUndefined();

    // Resetting writes through persist, so restore the saved payload like a page reload would see it.
    store.setState(store.getInitialState(), true);
    localStorage.setItem(RESUME_STORAGE_KEY, raw);
    await store.getState().rehydrate();
    expect(active().activeBlockIds).not.toContain("proj-1");
    expect(store.getState().past).toEqual([]);
    expect(store.getState()._hasHydrated).toBe(true);
  });

  describe("vault edits and undo", () => {
    it("undoes and redoes a vault block deletion", () => {
      store.getState().deleteVaultBlock("exp-1");
      expect(store.getState().vaultBlocks.some((b) => b.id === "exp-1")).toBe(false);
      expect(active().activeBlockIds).not.toContain("exp-1");

      store.getState().undo();
      expect(store.getState().vaultBlocks.some((b) => b.id === "exp-1")).toBe(true);
      expect(active().activeBlockIds).toContain("exp-1");

      store.getState().redo();
      expect(store.getState().vaultBlocks.some((b) => b.id === "exp-1")).toBe(false);
    });

    it("undoes a vault block edit and restores tailored rewrites", () => {
      store.getState().commit((d) => {
        d.presets.find((p) => p.id === d.activePresetId)!.bulletOverrides = {
          "exp-1": { 0: "Rewrite" },
        };
      });
      const original = store.getState().vaultBlocks.find((b) => b.id === "exp-1")!;
      store.getState().updateVaultBlock({ ...original, bullets: ["New bullet"] });
      expect(active().bulletOverrides["exp-1"]).toBeUndefined();

      store.getState().undo();
      expect(store.getState().vaultBlocks.find((b) => b.id === "exp-1")).toEqual(original);
      expect(active().bulletOverrides["exp-1"]).toEqual({ 0: "Rewrite" });
    });

    it("undoes a created vault block", () => {
      const original = store.getState().vaultBlocks[0];
      store.getState().createVaultBlock({ ...original, id: "new-1" });
      expect(store.getState().vaultBlocks.some((b) => b.id === "new-1")).toBe(true);
      store.getState().undo();
      expect(store.getState().vaultBlocks.some((b) => b.id === "new-1")).toBe(false);
    });
  });
});
