import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      "examples/reference-site",
      "tools/*",
    ],
    reporter: "default",
    coverage: {
      provider: "v8",
    },
  },
});
