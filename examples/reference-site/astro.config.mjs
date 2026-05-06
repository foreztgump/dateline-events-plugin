import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

const isVitest = process.env.VITEST === "true";

export default defineConfig({
  output: isVitest ? "static" : "server",
  adapter: isVitest
    ? undefined
    : cloudflare({
        platformProxy: {
          enabled: true,
          configPath: "./wrangler.jsonc",
        },
      }),
  vite: {
    ssr: {
      noExternal: ["@dateline/views", "@dateline/core"],
    },
  },
});
