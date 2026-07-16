---
title: Auth
order: 2
group:
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

Two frontmatter fields:

```yaml
---
title: Internal runbook
scope: docs.internal
claim: docs.read
---
```

`scope` and `claim` are opaque strings. The runtime hands them to `pageGuard` along with the current viewer. The default `pageGuard` returns true when the viewer has the matching claim. Pass your own `accessChecker` to `createNimpressApp` to apply different rules per project.

## Hidden until allowed

Sidebar entries the viewer cannot reach disappear. Search hits the viewer cannot reach are excluded. Direct navigation to a gated page redirects to the login flow.

## Login flow

`startLogin(returnTo)` redirects to `<authEndpoint>/api/auth/login?clientSlug=<clientSlug>&returnTo=<encoded>`. After login, the prophet sets the session cookie on the docs origin and redirects back.

## Logout

`endSession()` calls `<authEndpoint>/api/auth/logout` with `credentials: 'include'` and clears the viewer store.

## Gated artifacts and the guard command

A `scope` or `claim` on a page does more than hide it at runtime. The build separates gated pages from the public bundle so their content never ships to the static host, and the `nimpress guard` command wires the built site to the artifacts once they live behind the auth provider.

1. `nimpress build` writes `dist/access.json`, the route requirements and the gated path prefix, and emits every gated file under `dist/_gated/` instead of into the public tree.

2. `nimpress guard map` reads `dist/access.json` and `dist/_gated/` and writes `dist/guard-map.json`: the prefix, the route requirements, and one entry per gated file with its `sha256`, `size`, `mime`, and the `scope` and `claim` it resolves from `access.json`. Pass `--dist=<dir>` to point at a build folder other than the configured `outDir`, and `--out=<path>` to write the map elsewhere.

3. You upload the gated files to the auth provider, keyed by `guard-map.json`, with a deploy artifact claim. The provider returns a mapping json carrying a `base` url where the artifacts now live.

4. `nimpress guard apply --map=<uploaded mapping json>` reads that `base`, writes it into `dist/access.json`, then removes `dist/_gated/` and `dist/guard-map.json` from the build. The public bundle now carries no gated content, and the runtime resolves gated paths against the provider base, which serves them only to a viewer whose session satisfies the claim.

This is the last step before publishing a site that mixes public and gated pages. A build with no gated pages produces no `_gated/` folder and needs no guard step.

## Threat model

1. No client id, no client secret, no token refresh path in the browser. The prophet owns all of them.

2. The viewer surface is read only. Claims cannot be elevated client side.

3. Hidden pages are also unreachable via the page loader. The build emits every page module, but the runtime refuses to render gated pages when the viewer fails the check.
