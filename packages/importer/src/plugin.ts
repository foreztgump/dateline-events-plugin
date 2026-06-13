import type { SandboxedPlugin, SandboxedRouteContext } from "emdash/plugin";
import { adminHandlers } from "./admin.js";
import { activate, afterSave, cron, install } from "./hooks.js";
import { importCsv, importICal, importJson, importTec } from "./routes.js";
import type { ImporterContext } from "./types.js";

const plugin: SandboxedPlugin = {
  hooks: {
    "plugin:install": async (event, ctx) => {
      await install(event, ctx);
    },
    "plugin:activate": async (event, ctx) => {
      await activate(event, ctx);
    },
    "content:afterSave": (event) => {
      afterSave(event);
      return Promise.resolve();
    },
    cron: async (event, ctx) => {
      await cron(event, ctx);
    },
  },
  routes: {
    admin: (routeCtx) => Promise.resolve(adminRoute(routeCtx)),
    "admin/import/tec": async (routeCtx, ctx) => jsonRoute(importTec, routeCtx, ctx),
    "admin/import/ical": async (routeCtx, ctx) => jsonRoute(importICal, routeCtx, ctx),
    "admin/import/csv": async (routeCtx, ctx) => jsonRoute(importCsv, routeCtx, ctx),
    "admin/import/json": async (routeCtx, ctx) => jsonRoute(importJson, routeCtx, ctx),
    "admin/import/settings": () => Promise.resolve(adminHandlers.settings()),
  },
};

export default plugin;

const DEFAULT_ADMIN_PAGE = "settings";

function adminRoute(routeCtx: SandboxedRouteContext) {
  const page = new URL(routeCtx.request.url).searchParams.get("page") ?? DEFAULT_ADMIN_PAGE;
  if (page === "tec") return adminHandlers.tec();
  if (page === "ical") return adminHandlers.ical();
  if (page === "csv") return adminHandlers.csv();
  if (page === "json") return adminHandlers.json();
  return adminHandlers.settings();
}

type ResponseRoute = (input: { request: Request; ctx: ImporterContext }) => Promise<Response>;

async function jsonRoute(route: ResponseRoute, routeCtx: SandboxedRouteContext, ctx: ImporterContext): Promise<unknown> {
  const response = await route({ request: toRequest(routeCtx), ctx });
  const responseBody: unknown = await response.json();
  return { status: response.status, body: responseBody };
}

function toRequest(routeCtx: SandboxedRouteContext): Request {
  return new Request(routeCtx.request.url, {
    method: routeCtx.request.method,
    headers: routeCtx.request.headers,
    body: routeBody(routeCtx),
  });
}

function routeBody(routeCtx: SandboxedRouteContext): string | undefined {
  return routeCtx.input === undefined ? undefined : JSON.stringify(routeCtx.input);
}
