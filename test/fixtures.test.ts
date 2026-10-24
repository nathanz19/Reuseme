import { describe, expect, it } from "vitest";
import { DEMO_JD_TEXT } from "@/data/demo-jd";
import {
  FIXTURE_MATCH_FAIL_TOKEN,
  matchVault,
  tailorBullet,
} from "@/data/fixtures";
import { SEED_BLOCKS } from "@/data/seed";
import { FORGOTTEN_THRESHOLD } from "@/lib/tunables";

function demoMatch() {
  const result = matchVault(DEMO_JD_TEXT, SEED_BLOCKS);
  if ("error" in result) throw new Error(result.error);
  return result;
}

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

  it("surfaces the archived Raft block as forgotten experience", () => {
    const { rankings } = demoMatch();
    const raft = rankings.find((r) => r.blockId === "exp-6");
    expect(raft?.matchScore).toBeGreaterThanOrEqual(FORGOTTEN_THRESHOLD);
    expect(rankings[0].blockId).toBe("exp-6");
  });

  it("returns an error for the simulated failure token", () => {
    const result = matchVault(
      `${DEMO_JD_TEXT}\n${FIXTURE_MATCH_FAIL_TOKEN}`,
      SEED_BLOCKS,
    );
    expect(result).toEqual({
      error: expect.stringContaining("simulated API error"),
    });
  });
});

describe("tailorBullet fixture", () => {
  it("returns three tones grounded in the block notes", async () => {
    const { parsedJD } = demoMatch();
    const block = SEED_BLOCKS.find((b) => b.id === "exp-6")!;
    const proposal = await tailorBullet({
      block,
      bulletIndex: 0,
      bulletText: block.bullets[0],
      parsedJD,
      presetId: "frontend-swe",
    });

    expect(proposal.blockId).toBe("exp-6");
    expect(proposal.originalText).toBe(block.bullets[0]);
    expect(proposal.selectedTone).toBe("technical_ic");
    expect(Object.keys(proposal.variants).sort()).toEqual([
      "concise",
      "leadership",
      "technical_ic",
    ]);
    expect(block.sourceContext).toContain(proposal.sourceQuote);
    expect(proposal.warnings).not.toContain("quote_not_found");
    expect(proposal.unsupportedFlags).toEqual(["Kubernetes", "Terraform"]);
  });
});
