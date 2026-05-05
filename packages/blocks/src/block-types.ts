import type { BannerVariant, CodeLanguage, Element, EmptySize, TextValueOption } from "./types.js";

export interface BlockBase {
  block_id?: string;
}

export interface HeaderBlock extends BlockBase {
  type: "header";
  text: string;
}

export interface SectionBlock extends BlockBase {
  type: "section";
  text: string;
  accessory?: Element;
}

export interface DividerBlock extends BlockBase {
  type: "divider";
}

export interface FieldsBlock extends BlockBase {
  type: "fields";
  fields: TextValueOption[];
}

export interface TableColumn {
  key: string;
  text: string;
  format?: "text" | "badge" | "relative_time" | "number" | "code";
  sortable?: boolean;
}

export interface TableBlock extends BlockBase {
  type: "table";
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  next_cursor?: string;
  page_action_id: string;
  empty_text?: string;
}

export interface ActionsBlock extends BlockBase {
  type: "actions";
  elements: Element[];
}

export interface StatItem {
  text: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

export interface StatsBlock extends BlockBase {
  type: "stats";
  stats: StatItem[];
}

export type FormField = Exclude<Element, import("./types.js").RepeaterElement | import("./types.js").MediaPickerElement>;

export interface FormBlock extends BlockBase {
  type: "form";
  fields: FormField[];
  submit: { text: string; action_id: string };
}

export interface ImageBlock extends BlockBase {
  type: "image";
  url: string;
  alt: string;
  title?: string;
}

export interface ContextBlock extends BlockBase {
  type: "context";
  text: string;
}

export interface ColumnsBlock extends BlockBase {
  type: "columns";
  columns: Block[][];
}

export interface ChartSeries {
  name: string;
  data: [number, number][];
  color?: string;
}

export type ChartConfig =
  | { chart_type: "timeseries"; style?: "line" | "bar"; series: ChartSeries[]; height?: number }
  | { chart_type: "custom"; options: Record<string, unknown>; height?: number };

export interface ChartBlock extends BlockBase {
  type: "chart";
  config: ChartConfig;
}

export interface BannerBlock extends BlockBase {
  type: "banner";
  title?: string;
  description?: string;
  variant?: BannerVariant;
}

export interface MeterBlock extends BlockBase {
  type: "meter";
  text: string;
  value: number;
  max?: number;
  min?: number;
  custom_value?: string;
}

export interface CodeBlock extends BlockBase {
  type: "code";
  code: string;
  language?: CodeLanguage;
}

export interface EmptyBlock extends BlockBase {
  type: "empty";
  title: string;
  description?: string;
  command_line?: string;
  size?: EmptySize;
  actions?: Element[];
}

export interface AccordionBlock extends BlockBase {
  type: "accordion";
  text: string;
  blocks: Block[];
  default_open?: boolean;
}

export type Block =
  | HeaderBlock
  | SectionBlock
  | DividerBlock
  | FieldsBlock
  | TableBlock
  | ActionsBlock
  | StatsBlock
  | FormBlock
  | ImageBlock
  | ContextBlock
  | ColumnsBlock
  | ChartBlock
  | BannerBlock
  | MeterBlock
  | CodeBlock
  | EmptyBlock
  | AccordionBlock;
