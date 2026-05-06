import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/components", { recursive: true });
await cp("src/components", "dist/components", { recursive: true, filter: (source) => source.endsWith(".astro") || !source.includes(".") });
