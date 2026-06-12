import type { SandboxedPlugin, SandboxedRouteContext } from "emdash/plugin";
import { adminHandlers } from "./admin.js";
import { activate, afterSave, cron, install } from "./hooks.js";
import { rsvpSubmit, waitlistJoin } from "./routes.js";
import { boundaryError } from "./errors.js";
import type { RsvpContext } from "./types.js";

const plugin: SandboxedPlugin = {
  hooks: {
    "plugin:install": async (event, ctx) => {
      await install(event, ctx);
    },
    "plugin:activate": async (event, ctx) => {
      await activate(event, ctx);
    },
    "content:afterSave": async (event, ctx) => {
      await afterSave(event, ctx);
    },
    cron: async (event, ctx) => {
      await cron(event, ctx);
    },
  },
  routes: {
    "rsvp-submit": { public: true, handler: async (routeCtx, ctx) => jsonRoute(rsvpSubmit, routeCtx, ctx) },
    waitlist: { public: true, handler: async (routeCtx, ctx) => jsonRoute(waitlistJoin, routeCtx, ctx) },
    "admin/attendees": () => Promise.resolve(adminHandlers.attendees()),
    "admin/waitlist": () => Promise.resolve(adminHandlers.waitlist()),
  },
};

export default plugin;

type ResponseRoute = (input: { request: Request; ctx: RsvpContext }) => Promise<Response>;

async function jsonRoute(route: ResponseRoute, routeCtx: SandboxedRouteContext, ctx: RsvpContext): Promise<unknown> {
  const response = await route({ request: toRequest(routeCtx), ctx });
  return { status: response.status, body: await readJsonBody(response) };
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

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    const bodyText = await response.text();
    const parsedBody: unknown = bodyText ? JSON.parse(bodyText) : null;
    return parsedBody;
  } catch (error) {
    throw boundaryError("plugin.route.readJsonBody", error);
  }
}
