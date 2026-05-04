# Security Rules

## Secrets

- Never commit `.env`, credentials, API keys, JWT signing secrets, or private keys
- All secrets via env vars or a secret manager
- `.env.example` documents the required variable names with placeholder values
- pre-edit-secrets.sh hook blocks commits containing detected patterns

## Input handling

- Validate at every boundary — user input, external API responses, file contents, env vars
- Use parameterized queries / prepared statements; never string-interpolate SQL
- Escape output by context: HTML escape for HTML, URL encode for URLs, JSON encode for JSON
- Schema-validate JSON inputs (zod/pydantic/serde) at the boundary

## Auth

- Tokens in HttpOnly + Secure + SameSite=Strict cookies, not localStorage
- Session expiry enforced server-side
- Rate-limit login + password-reset endpoints
- Hash passwords with argon2id; never bcrypt with default cost in 2026

## Dependencies

- AgentShield scan blocks high-severity findings (existing /work step 8B)
- Dependabot/Renovate enabled on every repo
- Pin transitive deps via lockfile in CI
- Audit new deps for: maintained (commit in last 6mo), licensed compatibly, no known CVEs

## Network

- TLS 1.3 minimum; no plain HTTP outside localhost
- HSTS header on every response
- CSP without `unsafe-inline` / `unsafe-eval`

## Logging

- Never log secrets, PII, full auth headers, or session cookies
- Structured logging (JSON); never `print()` in production code
- Log levels: ERROR (action required) / WARN (anomaly) / INFO (state change) / DEBUG (development only)
