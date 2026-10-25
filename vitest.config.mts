import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    env: { NEXT_PUBLIC_ENABLE_DEMO_DATA: "1" },
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "llm",
          include: ["test/llm/**/*.test.ts"],
          setupFiles: ["test/llm/support/setup.ts"],
        },
      },
    ],
  },
});
