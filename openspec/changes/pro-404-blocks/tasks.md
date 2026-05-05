# PRO-404 Tasks

- [x] Add tests for every Block Kit builder and element builder.
  - Acceptance: all block and element builders produce shapes accepted by `validateBlocks()`.
  - Test file: `packages/blocks/src/index.test.ts`.
- [x] Add regression tests for Dateline gotchas.
  - Acceptance: stats blocks with `items`, buttons with `label`, and missing required fields are rejected.
  - Test file: `packages/blocks/src/index.test.ts`.
- [x] Add `assertResponse()` tests.
  - Acceptance: only `{ blocks, toast? }` is accepted; `redirect`, `body`, `headers`, and unknown keys are rejected.
  - Test file: `packages/blocks/src/index.test.ts`.
- [x] Implement builders, Zod validation schemas, and response assertion.
  - Acceptance: package typecheck/lint/test/build commands exit 0.
  - Quality: functions stay under 40 lines and 3 parameters, with all meaningful constants named.
- [x] Document the gotcha catalog.
  - Acceptance: README shows correct vs incorrect stats/button examples and route response shape.
