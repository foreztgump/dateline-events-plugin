import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import EventDetail from "./EventDetail.astro";
import type { DatelineOrganizer, DatelineVenue, DatelineViewEvent } from "../lib/types.js";

const event: DatelineViewEvent = {
  id: "launch",
  title: "Dateline Launch",
  shortDescription: "Preview release",
  description: [{ _type: "block", children: [{ text: "Join us for launch." }] }],
  startsAt: "2026-05-20T17:00:00.000Z",
  endsAt: "2026-05-20T18:30:00.000Z",
  timezone: "America/Los_Angeles",
  allDay: false,
  status: "live",
  locationType: "physical",
  organizers: ["org-1"],
  categories: ["release"],
};

const venue: DatelineVenue = {
  id: "venue-1",
  name: "Cloudflare Theater",
  address: { line1: "101 Edge St", city: "San Francisco", region: "CA", postalCode: "94107", country: "US" },
  geo: { lat: 37.78, lng: -122.4 },
};

const organizers: DatelineOrganizer[] = [{ id: "org-1", name: "Dateline Team", website: "https://dateline.example" }];

describe("EventDetail", () => {
  it("renders event detail content and schema.org Event JSON-LD", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(EventDetail, { props: { event, venue, organizers } });
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);

    // Assert
    expect(html).toContain("Dateline Launch");
    expect(html).toContain("Cloudflare Theater");
    expect(jsonLdMatch?.[1]).toBeDefined();
    const jsonLd = parseJsonLd(jsonLdMatch?.[1] ?? "{}");
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Event");
    expect(jsonLd.location["@type"]).toBe("Place");
    expect(jsonLd.organizer[0]?.["@type"]).toBe("Organization");
  });
});


interface EventJsonLd {
  "@context"?: string;
  "@type"?: string;
  location: { "@type"?: string };
  organizer: Array<{ "@type"?: string }>;
}

function parseJsonLd(value: string): EventJsonLd {
  return JSON.parse(value) as EventJsonLd;
}
