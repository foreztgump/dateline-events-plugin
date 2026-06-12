import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { WorkerdSandboxRunner } from "@emdash-cms/sandbox-workerd";
import { build as esbuild } from "esbuild";
import { Kysely, SqliteDialect } from "kysely";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pluginDir = join(scriptDir, "..");
const distDir = join(pluginDir, "dist");
const outputPath = process.argv[2] ?? join(pluginDir, "..", "evidence", "probe-results.json");

const requestMeta = { ip: "127.0.0.1", userAgent: "platform-probe", referer: null, geo: null };

const manifest = JSON.parse(await readFile(join(distDir, "manifest.json"), "utf8"));
const runtimeManifest = {
	...manifest,
	capabilities: [...new Set([...manifest.capabilities, "network:fetch:any"])],
};
const cliDistCode = await readFile(join(distDir, "plugin.mjs"), "utf8");
const code = await bundleProbeRuntime();

const evidence = {
	versions: {
		node: process.version,
		emdash: await packageVersion("emdash"),
		pluginCli: await packageVersion("@emdash-cms/plugin-cli"),
		sandboxWorkerd: await packageVersion("@emdash-cms/sandbox-workerd"),
	},
	manifest,
	runtimeCode: {
		cliDistImportsZod: cliDistCode.includes('from"zod"') || cliDistCode.includes('from "zod"'),
		workerdProbeCode: "src/plugin.ts bundled with esbuild so zod is embedded for standalone workerd",
		runtimeManifestAddsDeprecatedNetworkFetchAny:
			"@emdash-cms/sandbox-workerd@0.1.6 bridge checks network:fetch:any even though plugin-cli rejects it as deprecated",
	},
	availability: {},
	invocations: {},
	limits: {},
};

const primary = await createLoadedProbe();
let subrequestServer;
try {
	evidence.availability = {
		isAvailable: primary.runner.isAvailable(),
		isHealthyBeforeInvoke: primary.runner.isHealthy(),
	};
	evidence.invocations.dumpCtx = await invokeRoute(primary.instance, "dump-ctx", { label: "surface" });
	evidence.invocations.echoZod = await invokeRoute(primary.instance, "echo-zod", {
		message: "zod input parsed",
		count: 2,
	});
	evidence.invocations.pluginInstall = await invokeHook(primary.instance, "plugin:install", {});
	evidence.invocations.pluginActivate = await invokeHook(primary.instance, "plugin:activate", {});
	evidence.invocations.cronTasksAfterLifecycle = primary.sqlite
		.prepare("select plugin_id, task_name, schedule, data, enabled from _emdash_cron_tasks order by task_name")
		.all();
	evidence.invocations.contentBeforeSave = await invokeHook(primary.instance, "content:beforeSave", {
		collection: "events",
		isNew: true,
		content: { title: "Probe Event", status: "draft" },
	});
	evidence.invocations.contentAfterSave = await invokeHook(primary.instance, "content:afterSave", {
		collection: "events",
		isNew: false,
		content: { title: "Probe Event", status: "published" },
	});
	evidence.invocations.cron = await invokeHook(primary.instance, "cron", {
		name: "probe-install-heartbeat",
		data: { forced: true },
		scheduledAt: new Date().toISOString(),
	});
	evidence.invocations.storageKv = await invokeRoute(primary.instance, "storage-kv", { nonce: "m0" });
	evidence.invocations.sqliteIndexes = primary.sqlite
		.prepare("select name, sql from sqlite_master where type = 'index' and tbl_name = '_plugin_storage' order by name")
		.all();
	evidence.invocations.pluginIndexesRows = primary.sqlite.prepare("select * from _plugin_indexes").all();
	subrequestServer = await startSubrequestServer();
	evidence.limits.cpu = await measureCpuLimit(primary.instance);
	evidence.limits.localSubrequestAttempt = await runLimit(primary.instance, "subrequests", 1, subrequestServer.url);
	evidence.limits.subrequests = await measureSubrequests(primary.instance, "https://example.com/");
	evidence.limits.memory = {
		"32mb": await runLimit(primary.instance, "memory", 32),
		"128mb": await runLimit(primary.instance, "memory", 128),
		"192mb": await runLimit(primary.instance, "memory", 192),
	};
	evidence.limits.wall = {
		"1000ms": await runLimit(primary.instance, "wall", 1000),
		"31000ms": await runLimit(primary.instance, "wall", 31_000),
	};
	evidence.limits.subrequestServerHits = subrequestServer.hits();
	evidence.availability.isHealthyAfterInvoke = primary.runner.isHealthy();
} finally {
	if (subrequestServer) await subrequestServer.close();
	await stopRunner(primary.runner);
	await primary.db.destroy();
}

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
process.exit(0);

async function createLoadedProbe() {
	const sqlite = new Database(":memory:");
	const db = new Kysely({
		dialect: new SqliteDialect({ database: sqlite }),
	});
	await runEmdashMigrations(db);
	const runner = new WorkerdSandboxRunner({
		db,
		limits: {
			cpuMs: 50,
			subrequests: 10,
			wallTimeMs: 30_000,
			memoryMb: 128,
		},
		siteInfo: {
			name: "Dateline Platform Probe",
			url: "http://127.0.0.1:4321",
			locale: "en",
		},
	});
	const instance = await runner.load(runtimeManifest, code);
	return { db, sqlite, runner, instance };
}

async function stopRunner(runner) {
	const pid = runner.workerdProcess?.pid;
	const configDir = runner.configDir;
	await runner.terminateAll().catch((error) => {
		console.error("[platform-probe] runner termination failed", error);
	});
	if (pid) {
		try {
			process.kill(pid, 0);
			process.kill(pid, "SIGTERM");
		} catch {
			// Already exited.
		}
	}
	if (configDir) {
		const marker = `${configDir}/workerd.capnp`;
		const processList = execFileSync("ps", ["-eo", "pid=,cmd="], { encoding: "utf8" });
		for (const line of processList.split("\n")) {
			if (!line.includes(marker)) continue;
			const orphanPid = Number(line.trim().split(/\s+/, 1)[0]);
			if (Number.isInteger(orphanPid) && orphanPid > 1) {
				try {
					process.kill(orphanPid, "SIGTERM");
				} catch {
					// Already exited.
				}
			}
		}
	}
}

async function bundleProbeRuntime() {
	const result = await esbuild({
		entryPoints: [join(pluginDir, "src", "plugin.ts")],
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		write: false,
		logLevel: "silent",
	});
	const output = result.outputFiles[0];
	if (!output) throw new Error("esbuild did not produce bundled plugin code");
	return output.text;
}

async function runEmdashMigrations(db) {
	const distFiles = await readdir(join(pluginDir, "node_modules", "emdash", "dist"));
	const runnerFile = distFiles.find((file) => file.startsWith("runner-") && file.endsWith(".mjs"));
	if (!runnerFile) throw new Error("Could not find EmDash runner migration module");
	const runnerModule = await import(
		pathToFileURL(join(pluginDir, "node_modules", "emdash", "dist", runnerFile)).href
	);
	const runMigrations = runnerModule.runMigrations ?? runnerModule.i;
	if (typeof runMigrations !== "function") {
		throw new Error(`EmDash runner module ${runnerFile} did not export runMigrations`);
	}
	await runMigrations(db);
}

async function packageVersion(name) {
	const packageJson = JSON.parse(await readFile(join(pluginDir, "node_modules", name, "package.json"), "utf8"));
	return packageJson.version;
}

async function invokeRoute(instance, name, input) {
	return capture(async () =>
		instance.invokeRoute(name, input, {
			url: `http://127.0.0.1:4321/_emdash/api/plugins/${manifest.id}/${name}`,
			method: "POST",
			headers: { "content-type": "application/json" },
			meta: requestMeta,
		}),
	);
}

async function invokeHook(instance, name, event) {
	return capture(async () => instance.invokeHook(name, event));
}

async function capture(operation) {
	try {
		return { ok: true, result: await operation() };
	} catch (error) {
		return { ok: false, error: describeError(error) };
	}
}

function describeError(error) {
	return {
		name: error?.name ?? typeof error,
		message: error?.message ?? String(error),
		code: error?.code,
		stackFirstLine: typeof error?.stack === "string" ? error.stack.split("\n")[0] : undefined,
		cause: error?.cause ? String(error.cause) : undefined,
	};
}

async function measureCpuLimit(instance) {
	let lastOk = 0;
	let firstFailure = null;
	for (const target of [10, 25, 50, 75, 100, 150, 250, 500, 1000, 2000]) {
		const outcome = await runLimit(instance, "cpu", target);
		if (outcome.ok) {
			lastOk = target;
		} else {
			firstFailure = { target, outcome };
			break;
		}
	}
	return { lastOkMs: lastOk, firstFailure };
}

async function measureSubrequests(instance, url) {
	const results = {};
	for (const target of [1, 5, 10, 11, 12, 15]) {
		results[target] = await runLimit(instance, "subrequests", target, url);
	}
	return results;
}

async function runLimit(instance, mode, target, url) {
	return invokeRoute(instance, "limits", { mode, target, url });
}

async function startSubrequestServer() {
	let hitCount = 0;
	const server = createServer((request, response) => {
		hitCount += 1;
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ ok: true, hitCount, url: request.url }));
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Unexpected subrequest server address");
	return {
		url: `http://127.0.0.1:${address.port}/subrequest`,
		hits: () => hitCount,
		close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
	};
}
