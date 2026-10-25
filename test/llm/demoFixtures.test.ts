import { describe, expect, it } from "vitest";
import { DEMO_JD_TEXT } from "../fixtures/demoJd";
import { matchVault } from "@/data/fixtures";
import { SEED_BLOCKS } from "../fixtures/seed";

function demoMatch() {
  const result = matchVault(DEMO_JD_TEXT, SEED_BLOCKS);
  if ("error" in result) throw new Error(result.error);
  return result;
}

// Demo mode (MOCK_AI=1) serves this fixture from /api/jd/match, and the e2e suite depends on it.
describe("matchVault fixture", () => {
  it("parses title, company, and skill lists from the demo JD", () => {
    const { parsedJD } = demoMatch();
    expect(parsedJD.roleTitle).toBe("Senior Distributed Systems Engineer");
    expect(parsedJD.companyName).toBe("Nimbus Analytics");
    expect(parsedJD.requiredSkills).toEqual([
      "Python",
      "Go",
      "PostgreSQL",
      "Distributed systems",
      "Raft consensus",
      "Docker",
      "AWS",
      "Kubernetes",
      "Terraform",
    ]);
    expect(parsedJD.preferredSkills).toEqual([
      "React",
      "TypeScript",
      "gRPC",
      "Prometheus",
      "Machine learning",
    ]);
  });

  it("ranks every vault block in descending match order", () => {
    const { rankings } = demoMatch();
    expect(rankings.map((r) => r.blockId).sort()).toEqual(
      SEED_BLOCKS.map((b) => b.id).sort(),
    );
    for (let i = 1; i < rankings.length; i++) {
      expect(rankings[i - 1].matchScore).toBeGreaterThanOrEqual(
        rankings[i].matchScore,
      );
    }
    for (const r of rankings) {
      expect(r.matchScore).toBeGreaterThanOrEqual(0);
      expect(r.matchScore).toBeLessThanOrEqual(100);
      expect(r.matchExplanation).not.toBe("");
    }
  });

  it("keeps the existing fixture scores", () => {
    const { rankings } = demoMatch();
    const scores = Object.fromEntries(
      rankings.map((r) => [r.blockId, r.matchScore]),
    );
    expect(scores).toMatchObject({
      "exp-6": 76,
      "proj-2": 74,
      "exp-4": 72,
      "proj-1": 70,
      "exp-1": 65,
      "proj-7": 53,
      "proj-5": 25,
    });
    expect(rankings.map((r) => r.blockId).slice(0, 3)).toEqual([
      "exp-6",
      "proj-2",
      "exp-4",
    ]);
  });

  it("marks cards relevant when semanticScore is at least 70", () => {
    const { rankings } = demoMatch();
    for (const r of rankings) {
      expect(r.relevant).toBe(r.semanticScore >= 70);
    }
    expect(rankings.some((r) => r.relevant)).toBe(true);
    expect(rankings.some((r) => !r.relevant)).toBe(true);
  });

  it("returns matched tags that belong to each card", () => {
    const { rankings } = demoMatch();
    for (const r of rankings) {
      const block = SEED_BLOCKS.find((b) => b.id === r.blockId)!;
      for (const tag of r.matchedTags) expect(block.tags).toContain(tag);
    }
    const raft = rankings.find((r) => r.blockId === "exp-6")!;
    expect(raft.matchedTags).toEqual(
      expect.arrayContaining(["raft", "consensus", "distributed-systems"]),
    );
  });

  it("picks an in-range best bullet for every card", () => {
    const { rankings } = demoMatch();
    for (const r of rankings) {
      const block = SEED_BLOCKS.find((b) => b.id === r.blockId)!;
      expect(r.bestBulletIndex).toBeGreaterThanOrEqual(0);
      expect(r.bestBulletIndex).toBeLessThan(block.bullets.length);
    }
    expect(rankings.find((r) => r.blockId === "exp-1")!.bestBulletIndex).toBe(2);
  });

  it("maps JD requirements to vault tags", () => {
    const { parsedJD, tagMatches } = demoMatch();
    expect(tagMatches.map((m) => m.requirement)).toEqual([
      ...parsedJD.requiredSkills,
      ...parsedJD.preferredSkills,
    ]);
    const vaultTags = new Set(SEED_BLOCKS.flatMap((b) => b.tags));
    for (const m of tagMatches) {
      for (const tag of m.tags) expect(vaultTags.has(tag)).toBe(true);
    }
    const raft = tagMatches.find((m) => m.requirement === "Raft consensus");
    expect(raft?.tags).toEqual(expect.arrayContaining(["raft", "consensus"]));
    expect(tagMatches.find((m) => m.requirement === "Kubernetes")?.tags).toEqual(
      [],
    );
  });
});
