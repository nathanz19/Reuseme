import { afterEach, beforeEach, vi } from "vitest";
import { LIVE_AI_ENV, blockNetwork } from "./fakeAi";

// Override any real credentials from the shell so a test can never spend quota.
beforeEach(() => {
  for (const [name, value] of Object.entries(LIVE_AI_ENV)) vi.stubEnv(name, value);
  blockNetwork();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
