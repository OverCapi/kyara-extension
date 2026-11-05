import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// Tests : API browser simulée en mémoire (fakeBrowser), DOM simulé par happy-dom.
// Seuils de couverture : voir CLAUDE.md §7.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/entrypoints/**", "src/**/*.d.ts"],
      thresholds: { lines: 85, branches: 80 },
    },
  },
});
