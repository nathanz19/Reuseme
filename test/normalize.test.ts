import { describe, expect, it } from "vitest";
import {
  collapseWhitespace,
  expandAlias,
  normalizeToken,
  textContainsSkill,
  tokenizeForMatch,
} from "@/lib/normalize";

describe("normalize", () => {
  it("lowercases and strips punctuation but keeps + and #", () => {
    expect(normalizeToken("C++")).toBe("c++");
    expect(normalizeToken("C#.")).toBe("c#");
    expect(normalizeToken("Node.js")).toBe("nodejs");
  });

  it("expands known aliases", () => {
    expect(expandAlias("k8s")).toBe("kubernetes");
    expect(expandAlias("Postgres")).toBe("postgresql");
    expect(expandAlias("golang")).toBe("go");
    expect(expandAlias("Rust")).toBe("rust");
  });

  it("tokenizes on whitespace and list separators", () => {
    expect(tokenizeForMatch("React, TypeScript; Go/Python | AWS")).toEqual([
      "react",
      "typescript",
      "go",
      "python",
      "aws",
    ]);
  });

  it("matches skills through aliases in either direction", () => {
    expect(textContainsSkill("Deployed on k8s clusters", "Kubernetes")).toBe(
      true,
    );
    expect(textContainsSkill("Migrated to PostgreSQL 14", "pg")).toBe(true);
    expect(textContainsSkill("Wrote Rust services", "Kubernetes")).toBe(false);
  });

  it("collapses runs of whitespace", () => {
    expect(collapseWhitespace("  a\n\tb   c ")).toBe("a b c");
  });
});
