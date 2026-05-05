import type {
  AccordionBlock,
  ActionsBlock,
  BannerBlock,
  Block,
  ChartBlock,
  ChartSeries,
  CodeBlock,
  ColumnsBlock,
  ContextBlock,
  DividerBlock,
  EmptyBlock,
  FieldsBlock,
  FormBlock,
  HeaderBlock,
  ImageBlock,
  MeterBlock,
  SectionBlock,
  StatItem,
  StatsBlock,
  TableBlock,
} from "./block-types.js";
import type {
  ButtonElement,
  CheckboxElement,
  ComboboxElement,
  ConfirmDialog,
  DateInputElement,
  Element,
  MediaPickerElement,
  NumberInputElement,
  RadioElement,
  RepeaterElement,
  RepeaterSubField,
  SecretInputElement,
  SelectElement,
  TextInputElement,
  TextValueOption,
  ToggleElement,
} from "./types.js";

type BlockOptions = { blockId?: string };

const blockId = (options?: BlockOptions): { block_id?: string } => ({ block_id: options?.blockId });

function stripUndefined<const T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter((entry) => entry[1] !== undefined)) as T;
}

export const blocks = {
  header: (text: string, options?: BlockOptions): HeaderBlock => stripUndefined({ type: "header", text, ...blockId(options) }),
  section: (text: string, options?: { accessory?: Element; blockId?: string }): SectionBlock =>
    stripUndefined({ type: "section", text, accessory: options?.accessory, ...blockId(options) }),
  divider: (options?: BlockOptions): DividerBlock => stripUndefined({ type: "divider", ...blockId(options) }),
  fields: (fields: TextValueOption[], options?: BlockOptions): FieldsBlock =>
    stripUndefined({ type: "fields", fields, ...blockId(options) }),
  table: (options: {
    columns: TableBlock["columns"];
    rows: TableBlock["rows"];
    pageActionId: string;
    nextCursor?: string;
    emptyText?: string;
    blockId?: string;
  }): TableBlock =>
    stripUndefined({
      type: "table",
      columns: options.columns,
      rows: options.rows,
      page_action_id: options.pageActionId,
      next_cursor: options.nextCursor,
      empty_text: options.emptyText,
      ...blockId(options),
    }),
  actions: (elements: Element[], options?: BlockOptions): ActionsBlock =>
    stripUndefined({ type: "actions", elements, ...blockId(options) }),
  stats: (stats: StatItem[], options?: BlockOptions): StatsBlock => stripUndefined({ type: "stats", stats, ...blockId(options) }),
  form: (options: {
    fields: FormBlock["fields"];
    submit: { text: string; actionId: string };
    blockId?: string;
  }): FormBlock =>
    stripUndefined({
      type: "form",
      fields: options.fields,
      submit: { text: options.submit.text, action_id: options.submit.actionId },
      ...blockId(options),
    }),
  image: (options: { url: string; alt: string; title?: string; blockId?: string }): ImageBlock =>
    stripUndefined({ type: "image", url: options.url, alt: options.alt, title: options.title, ...blockId(options) }),
  context: (text: string, options?: BlockOptions): ContextBlock => stripUndefined({ type: "context", text, ...blockId(options) }),
  columns: (columns: Block[][], options?: BlockOptions): ColumnsBlock =>
    stripUndefined({ type: "columns", columns, ...blockId(options) }),
  timeseriesChart: (options: { series: ChartSeries[]; style?: "line" | "bar"; height?: number; blockId?: string }): ChartBlock =>
    stripUndefined({
      type: "chart",
      config: stripUndefined({ chart_type: "timeseries", series: options.series, style: options.style, height: options.height }),
      ...blockId(options),
    }),
  customChart: (options: { options: Record<string, unknown>; height?: number; blockId?: string }): ChartBlock =>
    stripUndefined({ type: "chart", config: stripUndefined({ chart_type: "custom", options: options.options, height: options.height }), ...blockId(options) }),
  banner: (options: { title?: string; description?: string; variant?: BannerBlock["variant"]; blockId?: string }): BannerBlock =>
    stripUndefined({ type: "banner", title: options.title, description: options.description, variant: options.variant, ...blockId(options) }),
  meter: (options: { text: string; value: number; max?: number; min?: number; customValue?: string; blockId?: string }): MeterBlock =>
    stripUndefined({ type: "meter", text: options.text, value: options.value, max: options.max, min: options.min, custom_value: options.customValue, ...blockId(options) }),
  code: (options: { code: string; language?: CodeBlock["language"]; blockId?: string }): CodeBlock =>
    stripUndefined({ type: "code", code: options.code, language: options.language, ...blockId(options) }),
  empty: (options: { title: string; description?: string; commandLine?: string; size?: EmptyBlock["size"]; actions?: Element[]; blockId?: string }): EmptyBlock =>
    stripUndefined({ type: "empty", title: options.title, description: options.description, command_line: options.commandLine, size: options.size, actions: options.actions, ...blockId(options) }),
  accordion: (options: { text: string; blocks: Block[]; defaultOpen?: boolean; blockId?: string }): AccordionBlock =>
    stripUndefined({ type: "accordion", text: options.text, blocks: options.blocks, default_open: options.defaultOpen, ...blockId(options) }),
};

export const elements = {
  button: (actionId: string, text: string, options?: { style?: ButtonElement["style"]; value?: unknown; confirm?: ConfirmDialog }): ButtonElement =>
    stripUndefined({ type: "button", action_id: actionId, text, style: options?.style, value: options?.value, confirm: options?.confirm }),
  textInput: (actionId: string, text: string, options?: { placeholder?: string; initialValue?: string; multiline?: boolean }): TextInputElement =>
    stripUndefined({ type: "text_input", action_id: actionId, text, placeholder: options?.placeholder, initial_value: options?.initialValue, multiline: options?.multiline }),
  numberInput: (actionId: string, text: string, options?: { initialValue?: number; min?: number; max?: number }): NumberInputElement =>
    stripUndefined({ type: "number_input", action_id: actionId, text, initial_value: options?.initialValue, min: options?.min, max: options?.max }),
  select: (actionId: string, text: string, options: TextValueOption[]): SelectElement => ({ type: "select", action_id: actionId, text, options }),
  toggle: (actionId: string, text: string, options?: { description?: string; initialValue?: boolean }): ToggleElement =>
    stripUndefined({ type: "toggle", action_id: actionId, text, description: options?.description, initial_value: options?.initialValue }),
  secretInput: (actionId: string, text: string, options?: { placeholder?: string; hasValue?: boolean }): SecretInputElement =>
    stripUndefined({ type: "secret_input", action_id: actionId, text, placeholder: options?.placeholder, has_value: options?.hasValue }),
  checkbox: (actionId: string, text: string, options: TextValueOption[]): CheckboxElement => ({ type: "checkbox", action_id: actionId, text, options }),
  dateInput: (actionId: string, text: string, options?: { initialValue?: string; placeholder?: string }): DateInputElement =>
    stripUndefined({ type: "date_input", action_id: actionId, text, initial_value: options?.initialValue, placeholder: options?.placeholder }),
  combobox: (actionId: string, text: string, options: TextValueOption[]): ComboboxElement => ({ type: "combobox", action_id: actionId, text, options }),
  radio: (actionId: string, text: string, options: TextValueOption[]): RadioElement => ({ type: "radio", action_id: actionId, text, options }),
  repeater: (actionId: string, text: string, fields: RepeaterSubField[]): RepeaterElement => ({ type: "repeater", action_id: actionId, text, fields }),
  mediaPicker: (actionId: string, text: string, options?: { mimeTypeFilter?: string; initialValue?: string; placeholder?: string }): MediaPickerElement =>
    stripUndefined({ type: "media_picker", action_id: actionId, text, mime_type_filter: options?.mimeTypeFilter, initial_value: options?.initialValue, placeholder: options?.placeholder }),
};
