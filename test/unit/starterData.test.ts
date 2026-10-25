// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); localStorage.clear(); });

it("starts with a blank document, vault, and JD when the demo flag is absent", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", undefined);
  vi.resetModules();
  const { useResumeStore } = await import("@/store/resumeStore");
  const { useSessionStore } = await import("@/store/sessionStore");
  const state = useResumeStore.getState();
  expect(state.vaultBlocks).toEqual([]);
  expect(state.presets).toHaveLength(1);
  expect(state.getActivePreset()).toMatchObject({ name: "Untitled document", activeBlockIds: [], customSkillsSection: [], header: { fullName: "", email: "", phone: "", location: "", links: [] } });
  expect(useSessionStore.getState().jdText).toBe("");
  state.renameDocument(state.activePresetId, "My actual resume");
  const { RESUME_STORAGE_KEY } = await import("@/data/starterData");
  expect(RESUME_STORAGE_KEY).toBe("reuseme-resume-user");
  expect(JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY)!).state.presets[0].name).toBe("My actual resume");
});

it("loads testing fixtures only when explicitly enabled and uses separate storage", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", "1");
  vi.resetModules();
  const { useResumeStore } = await import("@/store/resumeStore");
  const { useSessionStore } = await import("@/store/sessionStore");
  const { RESUME_STORAGE_KEY } = await import("@/data/starterData");
  expect(RESUME_STORAGE_KEY).toBe("reuseme-resume-demo");
  expect(useResumeStore.getState().vaultBlocks.length).toBeGreaterThan(0);
  expect(useResumeStore.getState().presets).toHaveLength(2);
  expect(useSessionStore.getState().jdText).toContain("Nimbus Analytics");
  localStorage.setItem("reuseme-resume", JSON.stringify({ marker: "real data" }));
  useResumeStore.getState().createDocument();
  expect(JSON.parse(localStorage.getItem("reuseme-resume")!)).toEqual({ marker: "real data" });
});

it("keeps an existing user's saved content when demo data is disabled", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", "0");
  vi.resetModules();
  const { useResumeStore } = await import("@/store/resumeStore");
  const state = useResumeStore.getState();
  state.updateHeader({ fullName: "A real user", email: "user@example.test", phone: "", location: "", links: [] });
  const raw = localStorage.getItem("reuseme-resume-user")!;
  useResumeStore.setState(useResumeStore.getInitialState(), true);
  localStorage.setItem("reuseme-resume-user", raw);
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().getActivePreset().header.fullName).toBe("A real user");
});


it("does not reopen the legacy seeded workspace and leaves it intact as a backup", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", "0");
  vi.resetModules();
  const { SEED_BLOCKS, SEED_PRESETS, DEFAULT_PRESET_ID } = await import("@/data/seed");
  const legacy = JSON.stringify({ state: { vaultBlocks: SEED_BLOCKS, presets: SEED_PRESETS, activePresetId: DEFAULT_PRESET_ID }, version: 1 });
  localStorage.setItem("reuseme-resume", legacy);
  const { useResumeStore } = await import("@/store/resumeStore");
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().vaultBlocks).toEqual([]);
  expect(useResumeStore.getState().getActivePreset().header.fullName).toBe("");
  expect(useResumeStore.getState().presets).toHaveLength(1);
  useResumeStore.getState().renameDocument("untitled-document", "My resume");
  expect(localStorage.getItem("reuseme-resume")).toBe(legacy);
});
