import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// Tests: browser API simulated in memory (fakeBrowser), DOM simulated by happy-dom.
// Coverage thresholds: see CLAUDE.md §7.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/entrypoints/**", "src/test/**", "src/**/*.d.ts"],
      thresholds: { lines: 85, branches: 80 },
    },
  },
});
