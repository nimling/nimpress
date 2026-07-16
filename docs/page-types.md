---
title: Page types
order: 1
group:
  name: Core
---

Every markdown file selects a renderer through the `type` frontmatter field. Ten types exist. Omit the field and the page is a `doc`.

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

See [openapi.md](/openapi) for the rendered structure.

## `changelog`

Many markdown files sharing one `title` and living in the same folder collapse into one long page. Each file becomes one entry headed by its `data.version` pill and `data.title`. Entries are ordered newest first by version, parsed semver style.

```yaml
---
title: Changelog
type: changelog
data:
  version: 1.4.2
  release_date: 2026-05-04
  title: Booking calendars, code actions, full user management
  description: One short sentence summary of this release.
---
```

See [changelog.md](/changelog) for the rendered structure, grouping rules, and version sort.

## `hero`

Oversized landing page with a title, eyebrow, tagline, and optional image or banner. The hero band sits at the top. The markdown body renders below the band through the standard prose shell. Action buttons and feature grids live in the markdown body, not in `data`. See [markdown.md](/markdown#action-buttons) and [markdown.md](/markdown#feature-grid) for the directives.

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
```

See [hero.md](/hero) for the band field reference.

## `roadmap`

A customer facing timeline. The markdown body renders as the page header above the timeline. Sibling files of `type: milestone | epic | feature | bug` in the same folder become the timeline items. `data.changelog` and `data.issues` scope which sibling folders feed the timeline, and `background` sets a banner behind the header.

```yaml
---
title: Roadmap
type: roadmap
description: What we are building and what has shipped.
data:
  issues: ./items
  changelog: ../changelog
---
```

See [roadmap-entries.md in the packaged rules](/modules) for the timeline structure.

## `milestone`, `epic`, `feature`, `bug`

The roadmap issue kinds. Each file is one standalone page at its own URL, listed under its parent `type: roadmap` page in the sidebar and rendered with a kind chip and date header above the markdown body. `title`, `description`, and `data.date` are required; `data.parent` references another issue in the same roadmap by relative filename.

```yaml
---
title: Booking calendars
type: feature
description: Month and week calendar views for bookables.
data:
  date: 2026-06-01
  parent: ./q2-milestone.md
---
```

## `component`

A live component workshop page. One `type: component` file per folder turns the folder into the sidebar parent; the sibling `.story.ts` files become its stories. `data.system` and `data.component` are required. The component renders inside an isolated iframe harness with a controls panel derived from its props.

```yaml
---
title: MarButton
type: component
data:
  system: nimtech
  component: MarButton
  package: "@nimling/components-nimtech"
---
```

See [modules.md](/modules) for systems, stories, controls, the harness, and the modules CLI.

## Grouping and duplicate routes

Pages of type `changelog` are grouped by `(parent folder, title)` and collapse into one collection page mounted at the folder's route. Pages of any other type that share an effective route raise a build error, so duplicate routes never reach the runtime.
