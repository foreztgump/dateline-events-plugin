import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("@dateline/reference-site", () => {
  it("exports its npm package name", () => {
    expect(PACKAGE_NAME).toBe("@dateline/reference-site");
  });
});
