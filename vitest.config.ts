import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/abis/**",
        "src/app/**",
        "src/test/**",
        // Thin wagmi wiring — behavior is covered via lib helpers + component tests.
        "src/hooks/use-kipubank.ts",
        "src/components/providers.tsx",
        "src/config/wagmi.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
