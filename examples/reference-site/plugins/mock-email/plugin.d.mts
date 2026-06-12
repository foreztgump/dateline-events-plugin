export interface MockEmailEvent {
  source?: string;
  message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  };
}

export declare function captureMessage(event: MockEmailEvent): void;
export declare const LOG_PATH: string;

declare const plugin: unknown;
export default plugin;
