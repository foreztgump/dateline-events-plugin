# dateline-platform-probe

A sandboxed plugin for [EmDash CMS](https://emdashcms.com).

## Develop

```sh
pnpm install
pnpm typecheck
pnpm test
```

To test against a running EmDash site, run `pnpm dev` in this
directory (rebuilds on save) and `pnpm add file:../path/to/this`
in the site. Then `import datelinePlatformProbe from "dateline-platform-probe"` and pass
it into `emdash({ sandboxed: [datelinePlatformProbe] })`.

## Publish

```sh
emdash-plugin login        # if you're not already logged in
emdash-plugin bundle       # produces dist/dateline-platform-probe-<version>.tar.gz
# upload that tarball to a public URL, then:
emdash-plugin publish --url https://your-host/...
```

## Version bumps

Bump `version` in `package.json` when you ship a release. The
scaffold's `emdash-plugin.jsonc` deliberately omits `version` —
the build pipeline reads it from `package.json` so there's a single
source of truth. **Bump major** for breaking changes, **bump minor**
for new routes or hooks, **bump patch** for fixes.

You MUST bump version whenever you change `capabilities`, `allowedHosts`,
or `storage` in the manifest. Installed users have consented to the
old trust contract; a change without a version bump would let new
behaviour slip past consent.
