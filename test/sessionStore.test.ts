import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JD_TEXT } from "@/data/demo-jd";
import { matchVault, tailorBullet } from "@/data/fixtures";
import { SEED_BLOCKS } from "@/data/seed";
import { useSessionStore } from "@/store/sessionStore";

const store = useSessionStore;

beforeEach(() => {
  store.setState(store.getInitialState(), true);
});

describe("session store", () => {
  it("starts with the demo JD but allows it to stay cleared", () => {
    expect(store.getState().jdText).toBe(DEMO_JD_TEXT);
    store.getState().setJdText("");
    store.getState().setLeftTab("vault");
    store.getState().setLeftTab("jd");
    expect(store.getState().jdText).toBe("");
  });

  it("clears filter values while keeping the search query", () => {
    store.getState().setSearchQuery("engineer");
    store.getState().toggleSection("project");
    store.getState().setDateFrom("2020-01");
    store.getState().setDateTo("2024-12");
    store.getState().toggleTag("go");
    store.getState().setIncludeArchived(true);
    store.getState().clearFilters();
    expect(store.getState()).toMatchObject({ searchQuery: "engineer", selectedSections: [], selectedTags: [], dateFrom: "", dateTo: "", includeArchived: false });
  });

  it("toggles tag filters on and off", () => {
    store.getState().toggleTag("go");
    store.getState().toggleTag("react");
    expect(store.getState().selectedTags).toEqual(["go", "react"]);
    store.getState().toggleTag("go");
    expect(store.getState().selectedTags).toEqual(["react"]);
  });

  it("indexes match results by block id and clears the last error", () => {
    store.getState().setMatchError("boom");
    const result = matchVault(DEMO_JD_TEXT, SEED_BLOCKS);
    if ("error" in result) throw new Error(result.error);

    store.getState().setMatchResult(result.parsedJD, result.rankings, result.tagMatches);
    const state = store.getState();
    expect(state.lastMatchError).toBeNull();
    expect(state.parsedJD?.companyName).toBe("Nimbus Analytics");
    expect(Object.keys(state.rankings)).toHaveLength(SEED_BLOCKS.length);
    expect(state.tagMatches).toEqual(result.tagMatches);
    expect(state.rankings["exp-6"]).toBe(
      state.rankingsList.find((r) => r.blockId === "exp-6"),
    );
  });

  it("keeps previous rankings when a later match fails", () => {
    const result = matchVault(DEMO_JD_TEXT, SEED_BLOCKS);
    if ("error" in result) throw new Error(result.error);
    store.getState().setMatchResult(result.parsedJD, result.rankings, result.tagMatches);

    store.getState().setMatchError("Fixture match failed");
    expect(store.getState().lastMatchError).toBe("Fixture match failed");
    expect(store.getState().rankingsList).toHaveLength(SEED_BLOCKS.length);
    expect(store.getState().tagMatches.length).toBeGreaterThan(0);
  });

  it("tracks the match loading flag", () => {
    expect(store.getState().matchLoading).toBe(false);
    store.getState().setMatchLoading(true);
    expect(store.getState().matchLoading).toBe(true);
  });

  it("changes tone only when a proposal exists and resets on close", async () => {
    store.getState().setTailorTone("concise");
    expect(store.getState().tailorProposal).toBeNull();

    const result = matchVault(DEMO_JD_TEXT, SEED_BLOCKS);
    if ("error" in result) throw new Error(result.error);
    const block = SEED_BLOCKS[0];
    store.getState().openTailorDialog(block.id, 0);
    store.getState().setTailorProposal(
      await tailorBullet({
        block,
        bulletIndex: 0,
        bulletText: block.bullets[0],
        parsedJD: result.parsedJD,
        presetId: "frontend-swe",
      }),
    );
    store.getState().setTailorTone("leadership");
    expect(store.getState().tailorProposal?.selectedTone).toBe("leadership");

    store.getState().closeTailorDialog();
    expect(store.getState().tailorDialog).toBeNull();
    expect(store.getState().tailorProposal).toBeNull();
    expect(store.getState().tailorLoading).toBe(false);
  });
});
