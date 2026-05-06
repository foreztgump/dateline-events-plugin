# @dateline/blocks

Internal Block Kit builder library for Dateline. Provides typed builders and validators for EmDash Block Kit JSON, ensuring all admin UI responses from sandboxed plugins conform to the Block Kit schema. Used by other Dateline packages to construct settings screens, detail views, and action buttons without hand-authoring JSON.

## Usage

```ts
import { assertResponse, blocks, elements } from "@dateline/blocks";

export function settingsPage() {
  return assertResponse({
    blocks: [
      blocks.header("Event settings"),
      blocks.section("Publish this event?", {
        accessory: elements.button("publish", "Publish", { style: "primary" }),
      }),
    ],
    toast: { text: "Loaded settings", type: "info" },
  });
}
```

## Gotcha catalog

### Stats blocks use `stats`, not `items`

```ts
// ✅ Correct
blocks.stats([{ text: "RSVPs", value: 42 }]);

// ❌ Rejected by validateBlocks()
[{ type: "stats", items: [{ text: "RSVPs", value: 42 }] }];
```

### Button elements use `text`, not `label`

```ts
// ✅ Correct
elements.button("save", "Save");

// ❌ Rejected by validateBlocks()
[{ type: "actions", elements: [{ type: "button", action_id: "save", label: "Save" }] }];
```

### Plugin route responses return only `{ blocks, toast? }`

`assertResponse()` rejects `redirect`, `body`, `headers`, `status`, and any other non-Block Kit keys. Dateline plugin routes should validate responses before returning them to EmDash.

## See also

- [Plugin development](/docs/plugin-development.md) — Block Kit patterns and best practices
