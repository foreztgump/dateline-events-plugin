# Testing Rules

## Test design

- AAA structure: Arrange / Act / Assert
- One logical assertion per test (multiple `assert` calls grouped on the same Act are OK)
- Test name describes behavior, not implementation: `test_user_login_redirects_to_dashboard` not `test_login_function`
- Failing test must produce a clear error message — never rely on stack-trace archaeology

## TDD discipline

- RED — Write the failing test FIRST. Run it. Confirm it fails with the expected error.
- GREEN — Write the minimum code to pass. Don't generalize.
- REFACTOR — Only after green. Apply CODE_PRINCIPLES.md hard rules.
- Never commit a red test (skip with explicit `xfail` / `t.Skip` if blocked)

## Mocking

- Mock at the boundary: external APIs, database, filesystem, time
- Never mock the system under test
- Prefer fakes (in-memory implementations) over mocks for complex collaborators
- Reset mock state in setup/teardown; never rely on test ordering

## Coverage

- Coverage is a smoke detector, not a goal. 80% with critical-path branches covered > 95% with edge cases ignored
- Hard rules: every public API, every error branch, every state transition

## Performance tests

- Benchmarks live alongside unit tests but skip in CI default; run on demand
- Lighthouse for web frontend (handled by performance-benchmarker droid on UI diffs)
- Measure 95th percentile, not mean
