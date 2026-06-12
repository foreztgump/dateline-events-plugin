import { describe, expect, it } from "vitest";

import plugin from "../src/plugin.js";

describe("platform probe plugin", () => {
	it("exposes the hook ids used by the platform probe", () => {
		expect(Object.keys(plugin.hooks ?? {}).sort()).toEqual([
			"content:afterSave",
			"content:beforeSave",
			"cron",
			"plugin:activate",
			"plugin:install",
		]);
	});

	it("dumps the ctx surface from a route", async () => {
		const route = plugin.routes?.["dump-ctx"];
		if (!route || typeof route === "function") throw new Error("dump-ctx route handler not found");
		const result = await route.handler(
			{
				input: { label: "test" },
				request: { url: "http://localhost/probe", method: "POST", headers: {} },
			},
			makeTestContext(),
		);
		expect(result).toMatchObject({
			ctxSurface: {
				plugin: { id: "test-plugin" },
				capabilityPresence: {
					cron: true,
					http: true,
				},
				storageCollections: ["probe_records"],
			},
		});
	});
});

function makeTestContext() {
	return {
		plugin: { id: "test-plugin", version: "0.1.0" },
		storage: {
			probe_records: {
				get: async () => null,
				put: async () => {},
				delete: async () => false,
				exists: async () => false,
				getMany: async () => new Map(),
				putMany: async () => {},
				deleteMany: async () => 0,
				query: async () => ({ items: [], hasMore: false }),
				count: async () => 0,
			},
		},
		kv: {
			get: async () => null,
			set: async () => {},
			delete: async () => false,
			list: async () => [],
		},
		log: {
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
		},
		site: { name: "Test", url: "http://localhost", locale: "en" },
		url: (path: string) => `http://localhost${path}`,
		cron: {
			schedule: async () => {},
			cancel: async () => {},
			list: async () => [],
		},
		http: {
			fetch: async () => new Response("ok"),
		},
	} as import("emdash/plugin").PluginContext;
}
