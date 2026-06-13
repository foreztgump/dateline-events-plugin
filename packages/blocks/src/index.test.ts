import { describe, it, expect } from "vitest";
import {
  assertResponse,
  blocks,
  elements,
  validateBlocks,
  type Block,
  type Element,
} from "./index.js";

describe("@dateline/blocks (rebased on @emdash-cms/blocks@0.18)", () => {
  it("builds every supported block type via the upstream builders", () => {
    // Arrange
    const actionButton = elements.button("save", "Save");
    const textField = elements.textInput("title", "Title");
    const chartSeries = [{ name: "Views", data: [[1767225600000, 42] as [number, number]] }];
    const tableColumns = [{ key: "title", label: "Title" }];
    const fieldPairs = [{ label: "Venue", value: "Main Hall" }];

    // Act
    const validBlocks = [
      blocks.header("Events"),
      blocks.section("Publish upcoming events", { accessory: actionButton }),
      blocks.divider(),
      blocks.fields(fieldPairs),
      blocks.table({ columns: tableColumns, rows: [{ title: "Launch" }], pageActionId: "next" }),
      blocks.actions([actionButton]),
      blocks.stats([{ label: "RSVPs", value: 12 }]),
      blocks.form({ fields: [textField], submit: { label: "Save", actionId: "submit" } }),
      blocks.image({ url: "https://example.com/event.png", alt: "Event" }),
      blocks.context("Updated just now"),
      blocks.columns([[blocks.section("Left")], [blocks.section("Right")]]),
      blocks.timeseriesChart({ series: chartSeries }),
      blocks.customChart({ options: { title: { text: "Registrations" } } }),
      blocks.banner({ title: "Draft", variant: "alert" }),
      blocks.meter({ label: "Capacity", value: 40, max: 100 }),
      blocks.code({ code: "const event = true;", language: "ts" }),
      blocks.empty({ title: "No events", actions: [actionButton] }),
      blocks.accordion({ label: "Advanced", blocks: [blocks.section("Settings")] }),
    ] satisfies Block[];

    // Assert
    expect(validateBlocks(validBlocks)).toEqual({ valid: true, errors: [] });
  });

  it("builds every supported standalone element type via the upstream builders", () => {
    // Arrange
    const options = [{ label: "Published", value: "published" }];
    const scalarField = elements.textInput("faq_answer", "Answer");

    // Act
    const validElements = [
      elements.button("open", "Open"),
      elements.textInput("title", "Title", { placeholder: "Event title" }),
      elements.numberInput("capacity", "Capacity", { min: 0 }),
      elements.select("status", "Status", options),
      elements.toggle("featured", "Featured", { initialValue: true }),
      elements.secretInput("api_key", "API key", { hasValue: false }),
      elements.checkbox("categories", "Categories", options),
      elements.dateInput("starts_at", "Starts at"),
      elements.combobox("venue", "Venue", options),
      elements.radio("visibility", "Visibility", options),
      elements.repeater("faq", "FAQ", [scalarField]),
      elements.mediaPicker("hero", "Hero image", { mimeTypeFilter: "image/" }),
    ] satisfies Element[];

    // Assert
    expect(validateBlocks([blocks.actions(validElements)])).toEqual({ valid: true, errors: [] });
  });

  it("rejects malformed blocks via the upstream validator (0.18 uses items/label)", () => {
    // Arrange — 0.18 requires stats `items` and button `label`; the old
    // `items`/`text`-omitting shapes are now the malformed cases.
    const malformedBlocks = [
      { type: "stats", stats: [{ text: "Wrong key", value: 1 }] },
      { type: "actions", elements: [{ type: "button", action_id: "save", text: "Save" }] },
      { type: "section" },
    ];

    // Act
    const validation = validateBlocks(malformedBlocks);

    // Assert
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("accepts only BlockResponse keys in assertResponse", () => {
    // Arrange
    const validResponse = {
      blocks: [blocks.section("Saved")],
      toast: { message: "Saved", type: "success" as const },
    };

    // Act
    const assertedResponse = assertResponse(validResponse);

    // Assert
    expect(assertedResponse).toEqual(validResponse);
  });

  it("rejects route response transport keys and unknown keys", () => {
    // Arrange
    const invalidResponses = [
      { blocks: [], redirect: "/admin" },
      { blocks: [], body: "raw" },
      { blocks: [], headers: {} },
      { blocks: [], status: 302 },
    ];

    // Act
    const assertions = invalidResponses.map((response) => () => assertResponse(response));

    // Assert
    for (const assertion of assertions) {
      expect(assertion).toThrow("Invalid BlockResponse");
    }
  });

  it("rejects a response whose blocks fail upstream validation", () => {
    // Arrange — button without the required `label` should fail block validation.
    const response = {
      blocks: [{ type: "actions", elements: [{ type: "button", action_id: "save", text: "Save" }] }],
    };

    // Act & Assert
    expect(() => assertResponse(response)).toThrow("Invalid BlockResponse");
  });
});
