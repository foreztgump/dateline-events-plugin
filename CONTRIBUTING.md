# Contributing to Dateline

## Releasing

Dateline ships all six `@dateline/*` packages together from this monorepo using
[Changesets](https://github.com/changesets/changesets). Releases publish to the
public npm registry under the `@dateline` scope (npm org `dateline`).

> **⚠️ First publish (0.3.0) is a one-time manual exception.** Do NOT push a
> `v0.3.0` tag to trigger CI. The Release workflow attaches provenance, which
> npm cannot generate for a first-ever publish (no trusted-publisher mapping
> exists yet). Instead, for 0.3.0 only:
>
> 1. Make the repository public (provenance and source links require it).
> 2. Run `pnpm -r build` then `pnpm -r publish --access public` locally. This
>    creates all six packages on npm **without** provenance.
> 3. Configure [trusted publishing](https://docs.npmjs.com/trusted-publishers)
>    for each of the six packages on npmjs.com (repo `foreztgump/dateline-events-plugin`,
>    workflow `release.yml`).
>
> Every release from **0.3.1 onward** uses the tagged CI flow below and carries
> provenance automatically.

### Cutting a release (0.3.1 and later)

1. **Add a changeset** for your change:
   ```bash
   pnpm changeset
   ```
   Pick the affected packages and a bump type (`patch` / `minor` / `major`).
   Commit the generated `.changeset/*.md` file with your PR.

2. **Version the packages** on `main` after the PR merges:
   ```bash
   pnpm version-packages   # runs `changeset version`
   ```
   This rewrites `package.json` versions, updates `CHANGELOG.md` files, and
   rewrites internal `workspace:*` ranges. Commit the result.

3. **Tag and push** to trigger the publish:
   ```bash
   git tag v0.3.0
   git push origin v0.3.0
   ```
   The `Release` workflow (`.github/workflows/release.yml`) builds the workspace
   and runs `changeset publish` on the tag.

4. **Dry-run first (optional).** Run the `Release` workflow via
   *workflow_dispatch* with `dry_run: true` to see exactly what would publish
   without authenticating or pushing anything to the registry.

### Provenance

Published packages carry [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
attestations, generated automatically when **all** of these hold:

- the publish runs in GitHub Actions with `id-token: write` (configured in the
  workflow), **and**
- the source repository is **public** (npm does not support provenance for
  private repos, even for public packages), **and**
- [trusted publishing](https://docs.npmjs.com/trusted-publishers) is configured
  for the package on npmjs.com.

> **First-publish note.** Trusted publishing cannot authenticate a *first-ever*
> publish (the package must already exist to configure a trusted publisher).
> The initial `0.3.0` was therefore published locally and does **not** carry
> provenance. Every release from `0.3.1` onward publishes through CI with
> provenance.

### Rolling back a bad release

npm is **append-only** for anything older than 72 hours. Plan accordingly.

- **Within 72h of publish** you *may* `npm unpublish @dateline/<pkg>@<version>`,
  but prefer deprecation even here — unpublishing breaks anyone who already
  installed it.
- **After 72h** unpublish is **not allowed** by registry policy. Instead:
  ```bash
  npm deprecate "@dateline/<pkg>@<version>" "Broken release — upgrade to <next-version>"
  ```
- **Ship the fix forward.** Add a changeset, version a patch (e.g. `0.3.1`),
  tag `v0.3.1`, and let CI publish the corrected version.
- **Do not make the repo private** to "hide" a release. Provenance source links
  on already-published versions stop resolving if the repo goes private.
