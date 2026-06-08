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

Many markdown files sharing one `title` and living in the same folder collapse into one long page. Each file becomes one entry headed by its `data.version` pill and `data.title`. Entries are ordered newest first by version, parsed semver style.

```yaml
---
title: Changelog
type: changelog
data:
  version: 1.4.2
  title: Booking calendars, code actions, full user management
  description: One short sentence summary of this release.
---
```

See [changelog.md](./changelog.md) for the rendered structure, grouping rules, and version sort.

## `hero`

Oversized landing page with a title, eyebrow, tagline, and optional image or banner. The hero band sits at the top. The markdown body renders below the band through the standard prose shell. Action buttons and feature grids live in the markdown body, not in `data`. See [markdown.md](./markdown.md#action-buttons) and [markdown.md](./markdown.md#feature-grid) for the directives.

```yaml
---
title: Welcome to the docs
type: hero
data:
  eyebrow: Documentation
  tagline: Build great docs with Svelte
  image: /hero.svg
  align: start
---

:::actions
[Get started](/guide){"variant":"primary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"secondary"}
:::

::::features
:::feature {"icon":"⚡","title":"Fast","link":"/guide"}
Vite plugin, shiki at build time.
:::

:::feature {"icon":"/icons/themable.svg","title":"Themable","link":"/docs/theming"}
Tokens overridable in your own CSS.
:::
::::
```

See [hero.md](./hero.md) for the band field reference.

## Notes

Pages with type `changelog` are grouped by `(parent folder, title)` and collapse into one collection page. Pages of any other type that share a route raise a build error so duplicate routes never reach the runtime.
