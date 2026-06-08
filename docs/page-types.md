# Page types

Every markdown file selects a renderer through the `type` frontmatter field. Four types exist.

## `doc`

Default for any `.md` file with no explicit `type`. Renders the markdown body inside the standard prose shell with a sticky right rail table of contents.

```yaml
---
title: Getting started
---
```

## `openapi`

Embeds an OpenAPI 3.1 spec next to its markdown body. The spec is loaded at build time, `$ref`s are resolved, and descriptions inside the spec are pre rendered as HTML so markdown inside the spec works.

```yaml
---
title: Bookable API
type: openapi
spec: ./bookable.json
---
```

See [openapi.md](./openapi.md) for the rendered structure.

## `changelog`

Many markdown files with the same `path` collapse into one long page. Each file becomes a collapsible entry headed by its `data.version`. Entries are ordered newest first by version, parsed semver style.

```yaml
---
title: 1.2.0 cookie refresh
type: changelog
path: /docs/changelog
data:
  version: 1.2.0
---
```

See [changelog.md](./changelog.md) for the rendered structure and version sort rules.

## `hero`

Oversized landing page with a tagline, action buttons, and a feature grid. Frontmatter `data` carries the hero content. The markdown body below the hero renders through the standard `doc` shell if present.

```yaml
---
title: Welcome to the docs
type: hero
data:
  tagline: Build great docs with Svelte
  actions:
    - text: Get started
      link: /guide
      variant: primary
    - text: GitHub
      link: https://github.com/nimling/nimpress
      variant: secondary
  features:
    - title: Fast
      icon: ⚡
      details: Vite plugin, shiki at build time
    - title: Themable
      icon: 🎨
      details: Tokens overridable in your own CSS
---
```

See [hero.md](./hero.md) for the full schema.

## Notes

Pages with type `changelog` may share a `path` with each other. Pages with any other type that share a `path` raise a build error so duplicate routes never reach the runtime.
