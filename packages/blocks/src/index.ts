// @dateline/blocks rebased on @emdash-cms/blocks@0.18.
//
// Upstream 0.18 now ships the canonical Block Kit builders (`blocks`,
// `elements`), the `validateBlocks` validator, and every block/element type via
// the React-free `./server` subpath. Dateline re-exports those directly instead
// of maintaining a divergent hand-rolled copy (the pre-0.18 copy emitted the old
// `stats`/button-`text` shapes that upstream now rejects in favour of
// `items`/`label`). The only value Dateline still adds is `assertResponse`, the
// plugin-route envelope guard upstream does not provide.
// Runtime builders/validator come from the React-free `./server` subpath so
// `@dateline/blocks` stays safe to bundle into sandboxed plugins.
export { blocks, elements, validateBlocks } from "@emdash-cms/blocks/server";
export { assertResponse, type ValidationResult } from "./validation.js";

// Types come from the package root (the `./server` subpath omits the chart,
// repeater, media-picker, and other element/block types). `export type` is
// erased at compile time, so this never pulls upstream's React runtime into the
// emitted JS.
export type {
  AccordionBlock,
  ActionsBlock,
  BannerBlock,
  Block,
  BlockResponse,
  ButtonElement,
  ChartBlock,
  ChartConfig,
  ChartSeries,
  CheckboxElement,
  CodeBlock,
  ColumnsBlock,
  ComboboxElement,
  ConfirmDialog,
  ContextBlock,
  DateInputElement,
  DividerBlock,
  Element,
  EmptyBlock,
  FieldsBlock,
  FormBlock,
  FormField,
  HeaderBlock,
  ImageBlock,
  MediaPickerElement,
  MeterBlock,
  NumberInputElement,
  RadioElement,
  RepeaterElement,
  RepeaterSubField,
  SecretInputElement,
  SectionBlock,
  SelectElement,
  StatItem,
  StatsBlock,
  TableBlock,
  TableColumn,
  TextInputElement,
  ToggleElement,
} from "@emdash-cms/blocks";
