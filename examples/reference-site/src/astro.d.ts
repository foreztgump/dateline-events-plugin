declare module "*.astro" {
  const Component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default Component;
}

declare module "astro:content" {
  export function defineLiveCollection<TConfig extends object>(config: TConfig): TConfig;
}

declare module "emdash/runtime" {
  export function emdashLoader(): unknown;
}
