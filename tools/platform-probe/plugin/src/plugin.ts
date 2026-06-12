import type { PluginContext, SandboxedPlugin } from "emdash/plugin";
import { z } from "zod";

type ProbeRecord = {
	kind: string;
	eventId: string;
	email: string;
	sequence: number;
	note?: string;
};

type ProbeResult = {
	ok: boolean;
	operation: string;
	details: Record<string, unknown>;
};

const routeInput = z.object({
	message: z.string().min(1),
	count: z.number().int().min(1).max(5).default(1),
});

const storageInput = z.object({
	nonce: z.string().min(1),
});

const limitInput = z.object({
	mode: z.enum(["cpu", "subrequests", "wall", "memory"]),
	target: z.number().int().positive(),
	url: z.string().url().optional(),
});

const plugin: SandboxedPlugin = {
	hooks: {
		"plugin:install": {
			priority: 25,
			handler: async (event, ctx) => {
				ctx.log.info("probe plugin:install", summarizeEvent(event));
				await ctx.cron?.schedule("probe-install-heartbeat", {
					schedule: "*/15 * * * *",
					data: { registeredBy: "plugin:install" },
				});
			},
		},
		"plugin:activate": async (event, ctx) => {
			ctx.log.info("probe plugin:activate", summarizeEvent(event));
			await ctx.cron?.schedule("probe-activate-heartbeat", {
				schedule: "*/20 * * * *",
				data: { registeredBy: "plugin:activate" },
			});
		},
		"content:beforeSave": {
			priority: 50,
			timeout: 5000,
			errorPolicy: "abort",
			handler: async (event, ctx) => {
				ctx.log.info("probe content:beforeSave", summarizeEvent(event));
				return event.content;
			},
		},
		"content:afterSave": async (event, ctx) => {
			ctx.log.info("probe content:afterSave", summarizeEvent(event));
		},
		cron: async (event, ctx) => {
			ctx.log.info("probe cron", summarizeEvent(event));
		},
	},
	routes: {
		"dump-ctx": {
			input: z.object({ label: z.string().optional() }),
			handler: async (routeCtx, ctx) => {
				return {
					routeInput: routeCtx.input,
					ctxSurface: describeContext(ctx),
				};
			},
		},
		"echo-zod": {
			input: routeInput,
			handler: async (routeCtx, ctx) => {
				const parsed = routeInput.parse(routeCtx.input);
				ctx.log.info("probe echo-zod", parsed);
				return {
					input: parsed,
					pluginId: ctx.plugin.id,
					inputType: typeof parsed,
				};
			},
		},
		"storage-kv": {
			input: storageInput,
			handler: async (routeCtx, ctx) => {
				const parsed = storageInput.parse(routeCtx.input);
				const collection = ctx.storage.probe_records;
				if (!collection) {
					throw new Error("probe_records storage collection is unavailable");
				}
				const baseRecord: ProbeRecord = {
					kind: "capacity-check",
					eventId: `event-${parsed.nonce}`,
					email: "dupe@example.com",
					sequence: 1,
				};
				const duplicateRecord: ProbeRecord = {
					...baseRecord,
					sequence: 2,
					note: "same eventId+email, different document id",
				};

				await collection.put(`primary-${parsed.nonce}`, baseRecord);
				const primary = await collection.get(`primary-${parsed.nonce}`);
				const indexedQuery = await collection.query({
					where: { kind: "capacity-check" },
					orderBy: { eventId: "asc" },
					limit: 10,
				});
				let nonIndexedError: ProbeResult | null = null;
				try {
					await collection.query({ where: { note: "not-indexed" } });
				} catch (error) {
					nonIndexedError = describeError("non-indexed-query", error);
				}

				let duplicateOutcome: ProbeResult;
				try {
					await collection.put(`duplicate-${parsed.nonce}`, duplicateRecord);
					duplicateOutcome = {
						ok: true,
						operation: "duplicate-unique-index-put",
						details: {
							message: "duplicate insert succeeded",
							primary: await collection.get(`primary-${parsed.nonce}`),
							duplicate: await collection.get(`duplicate-${parsed.nonce}`),
						},
					};
				} catch (error) {
					duplicateOutcome = describeError("duplicate-unique-index-put", error);
				}

				await ctx.kv.set(`probe:${parsed.nonce}:one`, { status: "set" });
				await ctx.kv.set(`probe:${parsed.nonce}:two`, "second");
				const kvGet = await ctx.kv.get(`probe:${parsed.nonce}:one`);
				const kvList = await ctx.kv.list(`probe:${parsed.nonce}:`);
				const kvDelete = await ctx.kv.delete(`probe:${parsed.nonce}:two`);
				const kvListAfterDelete = await ctx.kv.list(`probe:${parsed.nonce}:`);

				return {
					primary,
					indexedQuery,
					nonIndexedError,
					duplicateOutcome,
					kv: {
						get: kvGet,
						list: kvList,
						deleteReturned: kvDelete,
						listAfterDelete: kvListAfterDelete,
					},
				};
			},
		},
		limits: {
			input: limitInput,
			handler: async (routeCtx, ctx) => {
				const parsed = limitInput.parse(routeCtx.input);
				if (parsed.mode === "cpu") return runCpuProbe(parsed.target);
				if (parsed.mode === "subrequests") {
					if (!ctx.http) throw new Error("ctx.http is unavailable");
					if (!parsed.url) throw new Error("url is required for subrequest probes");
					return runSubrequestProbe(ctx.http, parsed.url, parsed.target);
				}
				if (parsed.mode === "wall") return runWallProbe(parsed.target);
				return runMemoryProbe(parsed.target);
			},
		},
	},
};

export default plugin;

function summarizeEvent(event: unknown): Record<string, unknown> {
	if (!event || typeof event !== "object") return { type: typeof event, value: event };
	const record = event as Record<string, unknown>;
	return {
		keys: Object.keys(record).sort(),
		types: Object.fromEntries(Object.entries(record).map(([key, value]) => [key, getType(value)])),
		sample: record,
	};
}

function describeContext(ctx: PluginContext) {
	const record = ctx as unknown as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	return {
		keys,
		types: Object.fromEntries(keys.map((key) => [key, getType(record[key])])),
		plugin: ctx.plugin,
		site: ctx.site,
		urlSample: ctx.url("/probe"),
		storageCollections: Object.keys(ctx.storage ?? {}).sort(),
		capabilityPresence: {
			content: Boolean(ctx.content),
			http: Boolean(ctx.http),
			media: Boolean(ctx.media),
			users: Boolean(ctx.users),
			email: Boolean(ctx.email),
			cron: Boolean(ctx.cron),
		},
		kvMethods: Object.keys(ctx.kv).sort(),
		cronMethods: ctx.cron ? Object.keys(ctx.cron).sort() : [],
		httpMethods: ctx.http ? Object.keys(ctx.http).sort() : [],
	};
}

function getType(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

function describeError(operation: string, error: unknown): ProbeResult {
	const err = error as {
		name?: string;
		message?: string;
		code?: string;
		stack?: string;
		cause?: unknown;
	};
	return {
		ok: false,
		operation,
		details: {
			name: err.name ?? typeof error,
			message: err.message ?? String(error),
			code: err.code,
			cause: err.cause ? String(err.cause) : undefined,
			stackFirstLine: err.stack?.split("\n")[0],
		},
	};
}

function runCpuProbe(targetMs: number) {
	const startedAt = performance.now();
	let iterations = 0;
	while (performance.now() - startedAt < targetMs) {
		iterations += 1;
	}
	return {
		mode: "cpu",
		targetMs,
		elapsedMs: performance.now() - startedAt,
		iterations,
	};
}

async function runSubrequestProbe(http: { fetch(url: string, init?: RequestInit): Promise<Response> }, url: string, target: number) {
	const responses: Array<{ index: number; status?: number; ok?: boolean; error?: string }> = [];
	for (let index = 1; index <= target; index += 1) {
		try {
			const response = await http.fetch(`${url}?i=${index}`);
			responses.push({ index, status: response.status, ok: response.ok });
		} catch (error) {
			responses.push({ index, error: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}
	return { mode: "subrequests", attempted: target, responses };
}

async function runWallProbe(targetMs: number) {
	const startedAt = Date.now();
	await new Promise((resolve) => setTimeout(resolve, targetMs));
	return { mode: "wall", targetMs, elapsedMs: Date.now() - startedAt };
}

function runMemoryProbe(targetMb: number) {
	const chunks: Uint8Array[] = [];
	for (let index = 0; index < targetMb; index += 1) {
		chunks.push(new Uint8Array(1024 * 1024).fill(index % 255));
	}
	return {
		mode: "memory",
		targetMb,
		allocatedChunks: chunks.length,
		firstByte: chunks[0]?.[0] ?? null,
		lastByte: chunks[chunks.length - 1]?.[0] ?? null,
	};
}
