import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import EventPage from "./[slug].astro";
import { eventBySlug } from "../../lib/fixtures.js";

describe("event detail page", () => {
  it("renders schema.org JSON-LD and the RSVP form for RSVP-required events", async () => {
    // Arrange
    const container = await AstroContainer.create();
    const event = eventBySlug("friday-meetup");

    // Act
    const html = await container.renderToString(EventPage, { props: { event }, params: { slug: "friday-meetup" } });

    // Assert
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('data-dateline-component="RsvpForm"');
    expect(html).toContain('action="/api/rsvp"');
  });
});
