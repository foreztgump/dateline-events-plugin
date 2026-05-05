import { fileURLToPath } from "node:url";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import datelinePlugin from "./tools/eslint-plugin-dateline/src/runtime-plugin.js";

const MAX_LINES_PER_FUNCTION = 40;
const MAX_PARAMS = 3;
const MAX_DEPTH = 3;
const MAX_COMPLEXITY = 10;
const MAGIC_NUMBERS_IGNORE = [-1, 0, 1, 2];
const ESLINT_CONFIG_DIRECTORY = fileURLToPath(new URL(".", import.meta.url));

const IGNORED_PATHS = [
  "**/dist/**",
  "**/node_modules/**",
  "**/.wrangler/**",
  "**/.factory-state/**",
];

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: IGNORED_PATHS,
  },
  {
    files: ["packages/**/*.ts", "examples/**/*.ts", "tools/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: ESLINT_CONFIG_DIRECTORY,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      dateline: datelinePlugin,
    },
    rules: {
      ...tseslint.configs["recommended-type-checked"].rules,
      "dateline/no-bare-promises-in-hooks": "error",
      "max-lines-per-function": ["error", { max: MAX_LINES_PER_FUNCTION, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", { max: MAX_PARAMS }],
      "max-depth": ["error", { max: MAX_DEPTH }],
      "complexity": ["error", { max: MAX_COMPLEXITY }],
      "no-magic-numbers": [
        "error",
        {
          ignore: MAGIC_NUMBERS_IGNORE,
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreArrayIndexes: false,
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["packages/**/*.test.ts", "examples/**/*.test.ts", "tools/**/*.test.ts"],
    rules: {
      "max-lines-per-function": "off",
      "no-magic-numbers": "off",
    },
  },
];
