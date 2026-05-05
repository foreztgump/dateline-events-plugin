export type ToastType = "success" | "error" | "info";
export type ButtonStyle = "primary" | "danger" | "secondary";
export type BannerVariant = "default" | "alert" | "error";
export type ChartStyle = "line" | "bar";
export type CodeLanguage = "ts" | "tsx" | "jsonc" | "bash" | "css";
export type EmptySize = "sm" | "base" | "lg";

export interface ValidationError {
  path: string;
  message: string;
}

export interface TextValueOption {
  text: string;
  value: string;
}

export interface ConfirmDialog {
  title: string;
  text: string;
  confirm: string;
  deny: string;
  style?: "danger";
}

export interface ButtonElement {
  type: "button";
  action_id: string;
  text: string;
  style?: ButtonStyle;
  value?: unknown;
  confirm?: ConfirmDialog;
}

export interface TextInputElement {
  type: "text_input";
  action_id: string;
  text: string;
  placeholder?: string;
  initial_value?: string;
  multiline?: boolean;
}

export interface NumberInputElement {
  type: "number_input";
  action_id: string;
  text: string;
  initial_value?: number;
  min?: number;
  max?: number;
}

export interface SelectElement {
  type: "select";
  action_id: string;
  text: string;
  options: TextValueOption[];
  initial_value?: string;
  options_route?: string;
}

export interface ToggleElement {
  type: "toggle";
  action_id: string;
  text: string;
  description?: string;
  initial_value?: boolean;
}

export interface SecretInputElement {
  type: "secret_input";
  action_id: string;
  text: string;
  placeholder?: string;
  has_value?: boolean;
}

export interface CheckboxElement {
  type: "checkbox";
  action_id: string;
  text: string;
  options: TextValueOption[];
  initial_value?: string[];
}

export interface DateInputElement {
  type: "date_input";
  action_id: string;
  text: string;
  initial_value?: string;
  placeholder?: string;
}

export interface ComboboxElement {
  type: "combobox";
  action_id: string;
  text: string;
  options: TextValueOption[];
  initial_value?: string;
  placeholder?: string;
}

export interface RadioElement {
  type: "radio";
  action_id: string;
  text: string;
  options: TextValueOption[];
  initial_value?: string;
}

export type RepeaterSubField = TextInputElement | NumberInputElement | SelectElement | ToggleElement;

export interface RepeaterElement {
  type: "repeater";
  action_id: string;
  text: string;
  fields: RepeaterSubField[];
  item_text?: string;
  min_items?: number;
  max_items?: number;
  initial_value?: Array<Record<string, unknown>>;
}

export interface MediaPickerElement {
  type: "media_picker";
  action_id: string;
  text: string;
  mime_type_filter?: string;
  initial_value?: string;
  placeholder?: string;
}

export type Element =
  | ButtonElement
  | TextInputElement
  | NumberInputElement
  | SelectElement
  | ToggleElement
  | SecretInputElement
  | CheckboxElement
  | DateInputElement
  | ComboboxElement
  | RadioElement
  | RepeaterElement
  | MediaPickerElement;
