# @dateline/blocks

Thin Block Kit wrapper for Dateline, rebased on **`@emdash-cms/blocks@^0.18`**. Re-exports the upstream typed builders (`blocks`, `elements`), the `validateBlocks` validator, and every block/element type from the React-free `@emdash-cms/blocks/server` subpath, so the package stays safe to bundle into sandboxed plugins. The only Dateline-specific addition is `assertResponse`, the plugin-route envelope guard upstream does not provide.

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
    toast: { message: "Loaded settings", type: "info" },
  });
}
```

## 0.18 shape notes

Upstream 0.18 is the source of truth for Block Kit shapes. The pre-0.18 Dateline
copy used different field names that 0.18 now rejects — use the upstream shapes:

- **Stats blocks use `items`** (not `stats`): `blocks.stats([{ label: "RSVPs", value: 42 }])`.
- **Buttons/inputs/columns use `label`** (not `text`): `elements.button("save", "Save")`, `{ key, label }` table columns, `submit: { label, actionId }`.
- **Toasts use `message`** (not `text`): `{ message: "Saved", type: "success" }`.

## assertResponse

`assertResponse()` enforces the EmDash plugin-route contract: the response must be
exactly `{ blocks, toast? }`. It rejects transport keys (`redirect`, `body`,
`headers`, `status`) and any other unknown keys, then runs the upstream
`validateBlocks` over the `blocks` array. Dateline plugin routes should validate
responses with it before returning them to EmDash.

## See also

- [Plugin development](/docs/plugin-development.md) — Block Kit patterns and best practices
