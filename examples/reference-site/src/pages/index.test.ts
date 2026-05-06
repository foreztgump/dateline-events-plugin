import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import IndexPage from "./index.astro";

describe("reference landing page", () => {
  it("renders the Dateline views calendar showcase with seeded events", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(IndexPage);

    // Assert
    expect(html).toContain('data-dateline-component="CalendarMonth"');
    expect(html).toContain('data-dateline-component="CalendarWeek"');
    expect(html).toContain('data-dateline-component="CalendarDay"');
    expect(html).toContain('data-dateline-component="CalendarAgenda"');
    expect(html).toContain("Friday Meetup RSVP Night");
  });
});
