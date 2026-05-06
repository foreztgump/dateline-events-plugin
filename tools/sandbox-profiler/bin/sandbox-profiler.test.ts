import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { main } from "./sandbox-profiler.js";

// Must exceed the 50ms sandbox CPU budget to trigger a deterministic breach.
const SLOW_HANDLER_SLEEP_MS = 60;

describe("sandbox-profiler CLI", () => {
  it("skips cleanly when no sandbox manifests exist", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "dateline-profiler-empty-"));
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const exitCode = await main(cwd);

    expect(exitCode).toBe(0);
    expect(writeSpy.mock.calls.join("\n")).toContain("no sandboxed.json manifests");
    writeSpy.mockRestore();
  });

  it("returns non-zero and reports the handler that breaches budget", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "dateline-profiler-breach-"));
    await writeFile(
      join(cwd, "handler.mjs"),
      `export default async () => new Promise((r) => setTimeout(r, ${SLOW_HANDLER_SLEEP_MS}));`,
    );
    await writeFile(join(cwd, "sandboxed.json"), JSON.stringify({
      handlers: [{ id: "slow-hook", module: "./handler.mjs" }],
    }));
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const exitCode = await main(cwd);

    expect(exitCode).toBe(1);
    expect(writeSpy.mock.calls.join("\n")).toContain("slow-hook");
    writeSpy.mockRestore();
  });

  it("finds a package manifest from the workspace root when pnpm runs from the profiler package", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "dateline-profiler-workspace-"));
    const profilerCwd = join(workspaceRoot, "tools", "sandbox-profiler");
    const corePackage = join(workspaceRoot, "packages", "core");
    await mkdir(profilerCwd, { recursive: true });
    await mkdir(join(corePackage, "dist"), { recursive: true });
    await writeFile(join(workspaceRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n  - tools/*\n");
    await writeFile(join(corePackage, "package.json"), JSON.stringify({ name: "@dateline/core" }));
    await writeFile(join(corePackage, "dist", "handler.mjs"), "export default async () => undefined;");
    await writeFile(join(corePackage, "sandboxed.json"), JSON.stringify({
      handlers: [{ id: "core-hook", module: "./dist/handler.mjs" }],
    }));
    vi.stubEnv("INIT_CWD", workspaceRoot);
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      const exitCode = await main(profilerCwd, ["--", "--pkg", "@dateline/core"]);

      expect(exitCode).toBe(0);
      expect(writeSpy.mock.calls.join("\n")).toContain("core-hook");
      expect(writeSpy.mock.calls.join("\n")).not.toContain("no sandboxed.json manifests");
    } finally {
      writeSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
