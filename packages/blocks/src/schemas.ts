import { z } from "zod";

const TEXT_VALUE_OPTION = z.object({ text: z.string(), value: z.string() }).strict();
const BLOCK_ID = { block_id: z.string().optional() };
const CONFIRM_DIALOG = z
  .object({
    title: z.string(),
    text: z.string(),
    confirm: z.string(),
    deny: z.string(),
    style: z.literal("danger").optional(),
  })
  .strict();

const BUTTON = z
  .object({
    type: z.literal("button"),
    action_id: z.string(),
    text: z.string(),
    style: z.enum(["primary", "danger", "secondary"]).optional(),
    value: z.unknown().optional(),
    confirm: CONFIRM_DIALOG.optional(),
  })
  .strict();

const TEXT_INPUT = z
  .object({
    type: z.literal("text_input"),
    action_id: z.string(),
    text: z.string(),
    placeholder: z.string().optional(),
    initial_value: z.string().optional(),
    multiline: z.boolean().optional(),
  })
  .strict();

const NUMBER_INPUT = z
  .object({
    type: z.literal("number_input"),
    action_id: z.string(),
    text: z.string(),
    initial_value: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

const OPTIONS_ELEMENT_BASE = {
  action_id: z.string(),
  text: z.string(),
  options: z.array(TEXT_VALUE_OPTION),
  initial_value: z.string().optional(),
};

const SELECT = z.object({ type: z.literal("select"), ...OPTIONS_ELEMENT_BASE, options_route: z.string().optional() }).strict();
const COMBOBOX = z.object({ type: z.literal("combobox"), ...OPTIONS_ELEMENT_BASE, placeholder: z.string().optional() }).strict();
const RADIO = z.object({ type: z.literal("radio"), ...OPTIONS_ELEMENT_BASE }).strict();

const TOGGLE = z
  .object({
    type: z.literal("toggle"),
    action_id: z.string(),
    text: z.string(),
    description: z.string().optional(),
    initial_value: z.boolean().optional(),
  })
  .strict();

const SECRET_INPUT = z
  .object({
    type: z.literal("secret_input"),
    action_id: z.string(),
    text: z.string(),
    placeholder: z.string().optional(),
    has_value: z.boolean().optional(),
  })
  .strict();

const CHECKBOX = z
  .object({
    type: z.literal("checkbox"),
    action_id: z.string(),
    text: z.string(),
    options: z.array(TEXT_VALUE_OPTION),
    initial_value: z.array(z.string()).optional(),
  })
  .strict();

const DATE_INPUT = z
  .object({
    type: z.literal("date_input"),
    action_id: z.string(),
    text: z.string(),
    initial_value: z.string().optional(),
    placeholder: z.string().optional(),
  })
  .strict();

type ElementSchema = z.ZodType<unknown>;

const REPEATER_SUB_FIELD: ElementSchema = z.lazy(() => z.discriminatedUnion("type", [TEXT_INPUT, NUMBER_INPUT, SELECT, TOGGLE]));

const REPEATER = z
  .object({
    type: z.literal("repeater"),
    action_id: z.string(),
    text: z.string(),
    fields: z.array(REPEATER_SUB_FIELD),
    item_text: z.string().optional(),
    min_items: z.number().optional(),
    max_items: z.number().optional(),
    initial_value: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .strict();

const MEDIA_PICKER = z
  .object({
    type: z.literal("media_picker"),
    action_id: z.string(),
    text: z.string(),
    mime_type_filter: z.string().optional(),
    initial_value: z.string().optional(),
    placeholder: z.string().optional(),
  })
  .strict();

const ELEMENT = z.discriminatedUnion("type", [
  BUTTON,
  TEXT_INPUT,
  NUMBER_INPUT,
  SELECT,
  TOGGLE,
  SECRET_INPUT,
  CHECKBOX,
  DATE_INPUT,
  COMBOBOX,
  RADIO,
  REPEATER,
  MEDIA_PICKER,
]);

const CHART_SERIES = z.object({ name: z.string(), data: z.array(z.tuple([z.number(), z.number()])), color: z.string().optional() }).strict();
const TIMESERIES_CONFIG = z.object({ chart_type: z.literal("timeseries"), style: z.enum(["line", "bar"]).optional(), series: z.array(CHART_SERIES), height: z.number().optional() }).strict();
const CUSTOM_CONFIG = z.object({ chart_type: z.literal("custom"), options: z.record(z.string(), z.unknown()), height: z.number().optional() }).strict();
const CHART_CONFIG = z.discriminatedUnion("chart_type", [TIMESERIES_CONFIG, CUSTOM_CONFIG]);
const BANNER = z
  .object({
    type: z.literal("banner"),
    title: z.string().optional(),
    description: z.string().optional(),
    variant: z.enum(["default", "alert", "error"]).optional(),
    ...BLOCK_ID,
  })
  .strict();

type BlockSchema = z.ZodType<unknown>;

const BLOCK: BlockSchema = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("header"), text: z.string(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("section"), text: z.string(), accessory: ELEMENT.optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("divider"), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("fields"), fields: z.array(TEXT_VALUE_OPTION), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("table"), columns: z.array(z.object({ key: z.string(), text: z.string(), format: z.enum(["text", "badge", "relative_time", "number", "code"]).optional(), sortable: z.boolean().optional() }).strict()), rows: z.array(z.record(z.string(), z.unknown())), page_action_id: z.string(), next_cursor: z.string().optional(), empty_text: z.string().optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("actions"), elements: z.array(ELEMENT), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("stats"), stats: z.array(z.object({ text: z.string(), value: z.union([z.string(), z.number()]), description: z.string().optional(), trend: z.enum(["up", "down", "neutral"]).optional() }).strict()), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("form"), fields: z.array(ELEMENT), submit: z.object({ text: z.string(), action_id: z.string() }).strict(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("image"), url: z.string(), alt: z.string(), title: z.string().optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("context"), text: z.string(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("columns"), columns: z.array(z.array(BLOCK)), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("chart"), config: CHART_CONFIG, ...BLOCK_ID }).strict(),
    BANNER,
    z.object({ type: z.literal("meter"), text: z.string(), value: z.number(), max: z.number().optional(), min: z.number().optional(), custom_value: z.string().optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("code"), code: z.string(), language: z.enum(["ts", "tsx", "jsonc", "bash", "css"]).optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("empty"), title: z.string(), description: z.string().optional(), command_line: z.string().optional(), size: z.enum(["sm", "base", "lg"]).optional(), actions: z.array(ELEMENT).optional(), ...BLOCK_ID }).strict(),
    z.object({ type: z.literal("accordion"), text: z.string(), blocks: z.array(BLOCK), default_open: z.boolean().optional(), ...BLOCK_ID }).strict(),
  ]),
);

export const BLOCKS = z.array(BLOCK);

export const BLOCK_RESPONSE = z
  .object({
    blocks: BLOCKS,
    toast: z.object({ text: z.string(), type: z.enum(["success", "error", "info"]) }).strict().optional(),
  })
  .strict();
