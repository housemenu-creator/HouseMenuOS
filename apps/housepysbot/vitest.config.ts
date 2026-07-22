import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest-setup.ts"],
    env: {
      LOG_LEVEL: "silent",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/rateLimit.ts", "src/agents/router.ts", "src/lib/branch.ts"],
    },
  },
});
