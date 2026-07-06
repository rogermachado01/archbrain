import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./src/*" path mapping: vitest doesn't
    // read tsconfig `paths` on its own, so anything under src/ that's reached
    // transitively (e.g. scripts/okf-scan/e2e.test.ts -> src/lib/okf-import.ts
    // -> src/lib/aws-icons.ts's `import manifest from "@/data/..."`) needs this
    // alias registered here too, or module resolution fails at test time.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
  },
});
