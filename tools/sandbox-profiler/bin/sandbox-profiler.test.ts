import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { main } from "./sandbox-profiler.js";

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
});
