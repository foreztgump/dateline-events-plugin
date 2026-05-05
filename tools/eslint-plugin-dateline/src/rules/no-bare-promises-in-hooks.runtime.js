import { createNoBarePromisesInHooks } from "./rule-logic.js";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require ctx.waitUntil() or await for async work in EmDash hook handlers.",
    },
    messages: {
      barePromise: "Async work in hook handlers must be awaited or wrapped in ctx.waitUntil().",
    },
    schema: [],
  },
  create: createNoBarePromisesInHooks,
};
