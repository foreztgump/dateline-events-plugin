import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      "examples/reference-site",
    ],
    reporter: "default",
    coverage: {
      provider: "v8",
    },
  },
});
