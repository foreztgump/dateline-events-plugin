declare module "*.astro" {
  const Component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default Component;
}

declare module "astro:content" {
  export function defineLiveCollection<TConfig extends object>(config: TConfig): TConfig;
}

declare module "emdash/runtime" {
  export function emdashLoader(): unknown;
  export function getDb(): Promise<ConstructorParameters<typeof import("emdash").PluginStorageRepository>[0]>;
}

declare module "../../../plugins/mock-email/plugin.mjs" {
  export function captureMessage(event: { source?: string; message: { to: string; subject: string; text: string; html?: string } }): void;
}
