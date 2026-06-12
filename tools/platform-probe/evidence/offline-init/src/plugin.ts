import type { SandboxedPlugin } from "emdash/plugin";

/**
 * Sandboxed plugin entry. The explicit annotation keeps declaration
 * generation portable under the probed pnpm + TypeScript toolchain.
 */
const plugin: SandboxedPlugin = {
	routes: {
		hello: {
			handler: async (_routeCtx, ctx) => {
				ctx.log.info("hello route called", { pluginId: ctx.plugin.id });
				return { greeting: "hello", pluginId: ctx.plugin.id };
			},
		},
	},
};

export default plugin;
