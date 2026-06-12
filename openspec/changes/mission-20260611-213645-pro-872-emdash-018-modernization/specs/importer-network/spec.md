# Spec Delta: importer-network (capability honesty)

## ADDED Requirements

### Requirement: Network capability matches behavior
`@dateline/importer` SHALL either implement remote-feed fetching via `ctx.http.fetch` under `network:request:unrestricted` (empty `allowedHosts`, operator-typed feed URLs), or SHALL NOT declare any network capability. Unused capability declarations are prohibited.

#### Scenario: Remote iCal import
- **WHEN** an operator supplies a remote iCal URL and triggers import
- **THEN** the feed is fetched via `ctx.http.fetch`, parsed, and imported, respecting the 10-subrequest per-invocation budget (batching across cron invocations when needed)

#### Scenario: Consent transparency
- **WHEN** the plugin is installed
- **THEN** the consent dialog reflects exactly the declared capability, and the README documents why unrestricted network access is required (or that none is)
