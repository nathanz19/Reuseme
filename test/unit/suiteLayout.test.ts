import { readdirSync } from "node:fs";
import { expect, it } from "vitest";

// Vitest and Playwright only collect files from their suite folders, so a test
// added anywhere else would silently never run.
it("keeps every test file inside a suite folder", () => {
  const files = readdirSync("test", { recursive: true }).map((file) => String(file).replaceAll("\\", "/"));
  expect(files.filter((file) => file.endsWith(".test.ts") && !/^(unit|llm)\//.test(file))).toEqual([]);
  expect(files.filter((file) => file.endsWith(".spec.ts") && !file.startsWith("e2e/"))).toEqual([]);
});
