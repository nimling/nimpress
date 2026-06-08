# Auth

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

## Threat model

1. No client id, no client secret, no token refresh path in the browser. The prophet owns all of them.

2. The viewer surface is read only. Claims cannot be elevated client side.

3. Hidden pages are also unreachable via the page loader. The build emits every page module, but the runtime refuses to render gated pages when the viewer fails the check.
