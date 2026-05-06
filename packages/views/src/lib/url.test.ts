import { describe, expect, it } from "vitest";
import { safeHref } from "./url.js";

describe("safeHref", () => {
  it("rejects javascript: protocol URLs", () => {
    // Arrange
    const malicious = "javascript:alert(1)";

    // Act
    const result = safeHref(malicious);

    // Assert
    expect(result).toBeUndefined();
  });

  it("rejects data: protocol URLs", () => {
    // Arrange
    const malicious = "data:text/html,<script>alert(1)</script>";

    // Act
    const result = safeHref(malicious);

    // Assert
    expect(result).toBeUndefined();
  });

  it("rejects vbscript: protocol URLs", () => {
    // Arrange
    const malicious = "vbscript:msgbox";

    // Act
    const result = safeHref(malicious);

    // Assert
    expect(result).toBeUndefined();
  });

  it("rejects file: protocol URLs", () => {
    // Arrange
    const malicious = "file:///etc/passwd";

    // Act
    const result = safeHref(malicious);

    // Assert
    expect(result).toBeUndefined();
  });

  it("allows https URLs", () => {
    // Arrange
    const safe = "https://example.com";

    // Act
    const result = safeHref(safe);

    // Assert
    expect(result).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    // Arrange
    const safe = "http://example.com";

    // Act
    const result = safeHref(safe);

    // Assert
    expect(result).toBe("http://example.com");
  });

  it("rejects strings that are not URLs", () => {
    // Arrange
    const garbage = "not a url";

    // Act
    const result = safeHref(garbage);

    // Assert
    expect(result).toBeUndefined();
  });

  it("rejects relative paths (URL constructor without base throws)", () => {
    // Arrange
    const relative = "/relative";

    // Act
    const result = safeHref(relative);

    // Assert
    expect(result).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    // Arrange / Act
    const result = safeHref(undefined);

    // Assert
    expect(result).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    // Arrange / Act
    const result = safeHref(null);

    // Assert
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty string input", () => {
    // Arrange / Act
    const result = safeHref("");

    // Assert
    expect(result).toBeUndefined();
  });
});
