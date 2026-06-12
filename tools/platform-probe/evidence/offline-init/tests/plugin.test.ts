import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";

describe("hello route", () => {
	it("returns a greeting", async () => {
		const handler = plugin.routes?.hello;
		if (!handler || typeof handler !== "object" || !("handler" in handler)) {
			throw new Error("hello route handler not found");
		}
		const result = await handler.handler({} as never, makeTestContext());
		expect(result).toEqual({ greeting: "hello", pluginId: "test-plugin" });
	});
});

function makeTestContext() {
	// Minimal stub PluginContext: the hello route only reads
	// `ctx.log.info` and `ctx.plugin.id`. Real PluginContext has many
	// more methods; add them as your plugin grows.
	return {
		plugin: { id: "test-plugin", version: "0.1.0" },
		log: {
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
		},
	} as unknown as import("emdash").PluginContext;
}
