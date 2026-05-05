import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import { createNoBarePromisesInHooks } from "./rule-logic.js";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://dateline.events/eslint/${name}`,
);

const create: TSESLint.RuleCreateFunction<"barePromise", []> = (context) =>
  // rule-logic.js is shared with eslint.config.js, which cannot import TS before build.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  createNoBarePromisesInHooks(context) as TSESLint.RuleListener;

const noBarePromisesInHooks = createRule({
  name: "no-bare-promises-in-hooks",
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
  defaultOptions: [],
  create,
});

export default noBarePromisesInHooks;
