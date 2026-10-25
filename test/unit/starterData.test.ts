// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { RESUME_STORAGE_KEY } from "@/data/starterData";
import { useResumeStore } from "@/store/resumeStore";
import { useSessionStore } from "@/store/sessionStore";
import { DEFAULT_PRESET_ID, SEED_BLOCKS, SEED_PRESETS } from "../fixtures/seed";

beforeEach(() => {
  localStorage.clear();
  useResumeStore.setState(useResumeStore.getInitialState(), true);
  useSessionStore.setState(useSessionStore.getInitialState(), true);
});

it("starts with a blank document, vault, and job description", () => {
  const state = useResumeStore.getState();
  expect(state.vaultBlocks).toEqual([]);
  expect(state.presets).toHaveLength(1);
  expect(state.getActivePreset()).toMatchObject({
    name: "Untitled document",
    activeBlockIds: [],
    customSkillsSection: [],
    header: { fullName: "", email: "", phone: "", location: "", links: [] },
  });
  expect(useSessionStore.getState().jdText).toBe("");
  expect(RESUME_STORAGE_KEY).toBe("reuseme-resume-user");
  state.renameDocument(state.activePresetId, "My actual resume");
  expect(JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY)!).state.presets[0].name).toBe("My actual resume");
});

it("keeps an existing user's saved content", async () => {
  const state = useResumeStore.getState();
  state.updateHeader({ fullName: "A real user", email: "user@example.test", phone: "", location: "", links: [] });
  const raw = localStorage.getItem(RESUME_STORAGE_KEY)!;
  useResumeStore.setState(useResumeStore.getInitialState(), true);
  localStorage.setItem(RESUME_STORAGE_KEY, raw);
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().getActivePreset().header.fullName).toBe("A real user");
});

it("does not reopen the legacy seeded workspace and leaves it intact as a backup", async () => {
  const legacy = JSON.stringify({
    state: { vaultBlocks: SEED_BLOCKS, presets: SEED_PRESETS, activePresetId: DEFAULT_PRESET_ID },
    version: 1,
  });
  localStorage.setItem("reuseme-resume", legacy);
  await useResumeStore.getState().rehydrate();
  expect(useResumeStore.getState().vaultBlocks).toEqual([]);
  expect(useResumeStore.getState().getActivePreset().header.fullName).toBe("");
  expect(useResumeStore.getState().presets).toHaveLength(1);
  useResumeStore.getState().renameDocument("untitled-document", "My resume");
  expect(localStorage.getItem("reuseme-resume")).toBe(legacy);
});

it("loads the sample workspace when the demo flag is 1", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_DATA", "1");
  vi.resetModules();
  const { useResumeStore: demoResume } = await import("@/store/resumeStore");
  const { useSessionStore: demoSession } = await import("@/store/sessionStore");
  const { RESUME_STORAGE_KEY: demoKey } = await import("@/data/starterData");
  expect(demoKey).toBe("reuseme-resume-demo");
  expect(demoResume.getState().vaultBlocks.length).toBeGreaterThan(0);
  expect(demoResume.getState().getActivePreset().header.fullName).toBe("Alex Morgan");
  expect(demoSession.getState().jdText).toContain("Nimbus Analytics");
  vi.unstubAllEnvs();
});
