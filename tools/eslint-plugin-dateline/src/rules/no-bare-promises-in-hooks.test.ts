import parser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import rule from "./no-bare-promises-in-hooks.js";

type TestedRule = Parameters<RuleTester["run"]>[1];

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    parser,
    sourceType: "module",
  },
});

describe("no-bare-promises-in-hooks", () => {
  it("flags only bare async work in hook handlers", () => {
    ruleTester.run("no-bare-promises-in-hooks", rule as unknown as TestedRule, {
      valid: [
        `export default { hooks: { "content:afterSave": async (ctx) => { ctx.waitUntil(someAsyncFn()); } } };`,
        `export default { hooks: { "content:afterSave": async () => { await someAsyncFn(); } } };`,
        `async function notAHook() { someAsyncFn(); }`,
        `export default { hooks: { cron: async () => { // dateline-allow-bare-promise because this SDK owns retry lifecycle
          someAsyncFn();
        } } };`,
      ],
      invalid: [
        {
          code: `export default { hooks: { "content:afterSave": async () => { someAsyncFn(); } } };`,
          errors: [{ messageId: "barePromise" }],
        },
        {
          code: `export default { hooks: { "content:afterSave": async () => { someAsyncFn().then(reportDone); } } };`,
          errors: [{ messageId: "barePromise" }],
        },
        {
          code: `export default { hooks: { "content:afterSave": async () => { someAsyncFn().catch(reportError); } } };`,
          errors: [{ messageId: "barePromise" }],
        },
      ],
    });
  });
});
