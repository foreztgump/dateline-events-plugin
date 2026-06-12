import type { SandboxedPlugin, SandboxedRouteContext } from "emdash/plugin";
import { adminHandlers } from "./admin.js";
import { afterSave, beforeDelete, beforeSave } from "./hooks.js";
import { privacyErase, privacyExport } from "./privacy.js";
import { calendarFeed, iCalFeed } from "./routes.js";
import type { CoreContext } from "./types.js";

const DEFAULT_ADMIN_PAGE = "events";

const plugin: SandboxedPlugin = {
  hooks: {
    "content:beforeSave": (event) => {
      beforeSave(event);
      return Promise.resolve(event.content);
    },
    "content:afterSave": async (event, ctx) => {
      await afterSave(event, ctx);
    },
    "content:beforeDelete": async (event, ctx) => {
      await beforeDelete(event, ctx);
    },
  },
  routes: {
    "calendar-feed": async (routeCtx, ctx) => jsonRoute(calendarFeed, routeCtx, ctx),
    ical: async (routeCtx, ctx) => textRoute(iCalFeed, routeCtx, ctx),
    admin: (routeCtx) => Promise.resolve(adminRoute(routeCtx)),
    "admin/events": () => Promise.resolve(adminHandlers.events()),
    "admin/venues": () => Promise.resolve(adminHandlers.venues()),
    "admin/organizers": () => Promise.resolve(adminHandlers.organizers()),
    "admin/settings": () => Promise.resolve(adminHandlers.settings()),
    "privacy/export": async (routeCtx, ctx) => jsonRoute(privacyExport, routeCtx, ctx),
    "privacy/erase": async (routeCtx, ctx) => jsonRoute(privacyErase, routeCtx, ctx),
  },
};

export default plugin;

type ResponseRoute = (input: { request: Request; ctx: CoreContext }) => Promise<Response>;

async function jsonRoute(route: ResponseRoute, routeCtx: SandboxedRouteContext, ctx: CoreContext): Promise<unknown> {
  const response = await route({ request: toRequest(routeCtx), ctx });
  return response.json();
}

async function textRoute(route: ResponseRoute, routeCtx: SandboxedRouteContext, ctx: CoreContext): Promise<{ body: string; contentType: string | null }> {
  const response = await route({ request: toRequest(routeCtx), ctx });
  return {
    body: await response.text(),
    contentType: response.headers.get("content-type"),
  };
}

function adminRoute(routeCtx: SandboxedRouteContext) {
  const page = new URL(routeCtx.request.url).searchParams.get("page") ?? DEFAULT_ADMIN_PAGE;
  if (page === "venues") return adminHandlers.venues();
  if (page === "organizers") return adminHandlers.organizers();
  if (page === "settings") return adminHandlers.settings();
  return adminHandlers.events();
}

function toRequest(routeCtx: SandboxedRouteContext): Request {
  return new Request(routeCtx.request.url, {
    method: routeCtx.request.method,
    headers: routeCtx.request.headers,
  });
}
