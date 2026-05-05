import { describe, it, expect } from "vitest";
import {
  assertResponse,
  blocks,
  elements,
  validateBlocks,
  type Block,
  type Element,
} from "./index.js";

describe("@dateline/blocks", () => {
  it("builds every supported block type and element type", () => {
    // Arrange
    const actionButton = elements.button("save", "Save");
    const textField = elements.textInput("title", "Title");
    const chartSeries = [{ name: "Views", data: [[1767225600000, 42] as [number, number]] }];
    const tableColumns = [{ key: "title", text: "Title" }];
    const fieldPairs = [{ text: "Venue", value: "Main Hall" }];

    // Act
    const validBlocks = [
      blocks.header("Events"),
      blocks.section("Publish upcoming events", { accessory: actionButton }),
      blocks.divider(),
      blocks.fields(fieldPairs),
      blocks.table({ columns: tableColumns, rows: [{ title: "Launch" }], pageActionId: "next" }),
      blocks.actions([actionButton]),
      blocks.stats([{ text: "RSVPs", value: 12 }]),
      blocks.form({ fields: [textField], submit: { text: "Save", actionId: "submit" } }),
      blocks.image({ url: "https://example.com/event.png", alt: "Event" }),
      blocks.context("Updated just now"),
      blocks.columns([[blocks.section("Left")], [blocks.section("Right")]]),
      blocks.timeseriesChart({ series: chartSeries }),
      blocks.customChart({ options: { title: { text: "Registrations" } } }),
      blocks.banner({ title: "Draft", variant: "alert" }),
      blocks.meter({ text: "Capacity", value: 40, max: 100 }),
      blocks.code({ code: "const event = true;", language: "ts" }),
      blocks.empty({ title: "No events", actions: [actionButton] }),
      blocks.accordion({ text: "Advanced", blocks: [blocks.section("Settings")] }),
    ] satisfies Block[];

    // Assert
    expect(validateBlocks(validBlocks)).toEqual({ valid: true, errors: [] });
  });

  it("builds every supported standalone element type", () => {
    // Arrange
    const options = [{ text: "Published", value: "published" }];
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

  it("rejects Dateline Block Kit gotchas and required-field omissions", () => {
    // Arrange
    const malformedBlocks = [
      { type: "stats", items: [{ text: "Wrong key", value: 1 }] },
      { type: "actions", elements: [{ type: "button", action_id: "save", label: "Save" }] },
      { type: "section" },
    ];

    // Act
    const validation = validateBlocks(malformedBlocks);

    // Assert
    expect(validation.valid).toBe(false);
    expect(validation.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["0.stats", "1.elements.0.text", "2.text"]),
    );
  });

  it("rejects one missing required field for each supported block type", () => {
    // Arrange
    const missingRequiredFieldCases = [
      { type: "header" },
      { type: "section" },
      { type: "fields" },
      { type: "table", rows: [], page_action_id: "next" },
      { type: "actions" },
      { type: "stats" },
      { type: "form", submit: { text: "Save", action_id: "save" } },
      { type: "image", alt: "Missing URL" },
      { type: "context" },
      { type: "columns" },
      { type: "chart" },
      { type: "banner" },
      { type: "meter", value: 1 },
      { type: "code" },
      { type: "empty" },
      { type: "accordion", blocks: [] },
    ];

    // Act
    const validations = missingRequiredFieldCases.map((block) => validateBlocks([block]));

    // Assert
    expect(validations.every((validation) => validation.valid === false)).toBe(true);
  });

  it("accepts only BlockResponse keys in assertResponse", () => {
    // Arrange
    const validResponse = {
      blocks: [blocks.section("Saved")],
      toast: { text: "Saved", type: "success" as const },
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

  it("keeps block-level options outside chart config", () => {
    // Arrange
    const chartBlock = blocks.timeseriesChart({
      blockId: "registrations-chart",
      series: [{ name: "Registrations", data: [[1767225600000, 7] as [number, number]] }],
    });

    // Act
    const validation = validateBlocks([chartBlock]);

    // Assert
    expect(validation).toEqual({ valid: true, errors: [] });
    expect(chartBlock.config).not.toHaveProperty("blockId");
  });
});
