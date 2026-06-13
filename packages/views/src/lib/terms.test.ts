import { describe, expect, it } from "vitest";
import { entryTerms, entryTermSlugs } from "./terms.js";

describe("entryTerms", () => {
  it("reads inline entry.data.terms for a taxonomy without a separate lookup call", () => {
    // Arrange — EmDash 0.18 populates entry.data.terms on every entry (release PR #1409).
    const entry = {
      id: "evt-1",
      data: {
        title: "Launch",
        terms: {
          category: [
            { id: "t1", name: "Community", slug: "community", label: "Community", children: [], locale: "en", translationGroup: null },
          ],
        },
      },
    };

    // Act
    const categories = entryTerms(entry, "category");

    // Assert
    expect(categories).toEqual([
      { id: "t1", name: "Community", slug: "community", label: "Community", children: [], locale: "en", translationGroup: null },
    ]);
  });

  it("returns an empty array when the entry has no inline terms", () => {
    // Arrange
    const entry = { id: "evt-2", data: { title: "No terms" } };

    // Act & Assert
    expect(entryTerms(entry, "category")).toEqual([]);
    expect(entryTermSlugs(entry, "category")).toEqual([]);
  });

  it("projects inline term slugs for a taxonomy", () => {
    // Arrange
    const entry = {
      id: "evt-3",
      data: {
        terms: {
          tag: [
            { id: "t2", name: "RSVP", slug: "rsvp", label: "RSVP", children: [], locale: "en", translationGroup: null },
            { id: "t3", name: "Recurring", slug: "recurring", label: "Recurring", children: [], locale: "en", translationGroup: null },
          ],
        },
      },
    };

    // Act
    const slugs = entryTermSlugs(entry, "tag");

    // Assert
    expect(slugs).toEqual(["rsvp", "recurring"]);
  });
});
