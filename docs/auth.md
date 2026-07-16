---
title: Auth
order: 2
sidebar:
  name: Pipeline
---

Page level gating through `samna_auth`. Sessions arrive via cookies. There is no client secret in the browser.

## How it works

The runtime calls `@nimling/samna-auth-middleware` (TypeScript edge client) to:

1. Read the session cookie issued by the prophet at `samna_auth`.

2. Validate the JWT against the JWKS for the configured authority.

3. Expose a `viewer` store with the resolved user.

The viewer store is consumed by `AccountMenu`, `pageGuard`, and any component that wants to react to login state.

## Page gating

One frontmatter field:

```yaml
---
title: Internal runbook
gate: internal
---
```

`gate` is an opaque string. The runtime hands it to `pageGuard` along with the current viewer. The default checker requires an authenticated viewer for any gated page. Pass your own `accessChecker` to `createNimpressApp` to interpret gate values however the project needs, for example comparing header token claims against the gate.

## Hidden until allowed

Sidebar entries the viewer cannot reach disappear. Search hits the viewer cannot reach are excluded. Direct navigation to a gated page redirects to the login flow.

## Login flow

`startLogin(returnTo)` redirects to `<authEndpoint>/api/auth/login?clientSlug=<clientSlug>&returnTo=<encoded>`. After login, the prophet sets the session cookie on the docs origin and redirects back.

## Logout

`endSession()` calls `<authEndpoint>/api/auth/logout` with `credentials: 'include'` and clears the viewer store.

## Guarded bundles and the guard command

A `gate` on a page does more than hide it at runtime. The build separates gated pages from the public bundle so their content never ships to the static host, and the `nimpress guard` command wires the built site to the artifacts once they live behind the auth provider.

1. The `auth.guard` function in `nimpress.config.ts` decides the bundling: `guard(frontmatter, filePath, relatedFiles) => string` runs once per gated page at build time and the returned string names the bundle the page lands in. Without a guard function the gate value is the bundle name. The build knows every page's related files, its stories, schema, and page css, and passes them in.

2. `nimpress build` emits every gated page into `dist/_guarded/<bundle>/` with a per bundle `manifest.json`, `search.json`, and `body/` payloads, writes `dist/access.json` with the gate and bundle per route, and writes `dist/guard.map.json` recording which content went into which bundle under which gate.

3. `nimpress guard map` enriches `guard.map.json` with one entry per guarded file: `sha256`, `size`, `mime`, its bundle, and the gates that bundle serves, ready for upload. Pass `--dist=<dir>` for a build folder other than the configured `outDir`, and `--out=<path>` to write the map elsewhere.

4. You upload the guarded bundles to the auth provider, keyed by `guard.map.json`, with a deploy artifact claim. The provider returns a mapping json carrying a `base` url where the artifacts now live.

5. `nimpress guard apply --map=<uploaded mapping json>` reads that `base`, writes it into `dist/access.json`, then removes `dist/_guarded/` and `dist/guard.map.json` from the build. The public bundle now carries no gated content, and the runtime resolves guarded bundles against the provider base, which serves each bundle only to a viewer whose session satisfies its gates.

This is the last step before publishing a site that mixes public and gated pages. A build with no gated pages produces no `_guarded/` folder and needs no guard step.

## Threat model

1. No client id, no client secret, no token refresh path in the browser. The prophet owns all of them.

2. The viewer surface is read only. Claims cannot be elevated client side.

3. Hidden pages are also unreachable via the page loader. The build emits every page module, but the runtime refuses to render gated pages when the viewer fails the check.
