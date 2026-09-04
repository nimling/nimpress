---
title: Page types
type: section
order: 19
---

Every markdown file selects a renderer through the `type` frontmatter field. Eighteen types exist, and the config registers more. Omit the field and the page is a `doc`.

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

See [OpenAPI pages](/page-types/openapi) for the rendered structure.

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

See [Changelog renderer](/page-types/changelog) for the rendered structure, grouping rules, and version sort.

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

See [Hero pages](/page-types/hero) for the band field reference.

## `fullpage`

A landing page under the header alone. The sidebar column, the breadcrumbs, the right rail, and the previous and next links are hidden by the type, and the band plus every section of the markdown body spans the viewport. `data.eyebrow`, `data.logo`, `data.background`, `data.tagline`, `data.lead`, `data.align`, and `data.width` shape it.

```yaml
---
title: Adaptive docs for evolving ideas
type: fullpage
data:
  eyebrow: Documentation framework
  tagline: A Svelte 5 docs framework that supports it all.
  align: center
---
```

See [Full pages](/page-types/fullpage) for the band fields and the body.

## `404`

The not found page of the site. The build writes it as `404.html` at the output root beside its own route, the app routes an unknown path to it, and it stays out of the sidebar, the search index, and the sitemap. One per site.

```yaml
---
title: This page does not exist
type: 404
---
```

See [Not found page](/page-types/404) for where it is served.

## `section`

A folder `index.md` that lists its children as a card grid under its prose, from the sidebar order, with each child's title, description, and icon. `data.columns` pins the column count and `data.depth: 2` lists grandchildren under a heading per child folder. This page is one.

```yaml
---
title: Page types
type: section
---
```

See [Section pages](/page-types/section) for what is listed.

## `tags`

The page that lists every tag with its pages. Every tagged page shows its tags at the bottom, each one leading to its section here, and the `tags` config block gives tags their icons. One per site.

```yaml
---
title: Tags
type: tags
---
```

See [Tags page](/page-types/tags) for the configuration.

## `glossary`

One definition list that defines the terms of the site. Every term gets an anchor and the right rail lists them, and the first occurrence of a term in each paragraph of every other page renders as an abbreviation with the definition as its tooltip. One per site.

```yaml
---
title: Glossary
type: glossary
---
```

See [Glossary page](/page-types/glossary) for the tooltip forms.

## `team`

A person grid from `data.members`: a photo or a monogram, the name as a heading, a role, a bio, and links. `data.columns` and `data.align` shape the grid.

```yaml
---
title: Team
type: team
data:
  members:
    - name: Ada Lovelace
      role: Founder
---
```

See [Team pages](/page-types/team) for the member fields.

## `pricing`

A row of tiers from `data.tiers`: a name, a price line, a benefit list, and one action, with `highlight` marking the recommended tier and `data.footnote` as the small print.

```yaml
---
title: Pricing
type: pricing
data:
  tiers:
    - name: Spark
      price: "€49"
      period: per month
---
```

See [Pricing pages](/page-types/pricing) for the tier fields.

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

## `dbml`

A full page entity relationship viewer built from one DBML file. `spec` points at the `.dbml` file relative to the markdown file. A hero band carries the title, the description, the markdown body, and the page buttons in the centered content column, and the interactive diagram runs edge to edge below it.

```yaml
---
title: Bookable schema
type: dbml
spec: ./bookable.dbml
description: Every table the booking api reads and writes.
data:
  eyebrow: Database
  download: Download the schema
  fullscreen: Open fullscreen
---
```

See [DBML pages](/page-types/dbml) for what renders, the inline ` ```dbml ` fence, and the interaction surface.

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

## Custom types

The `pageTypes` config block maps a type name to a Svelte component file. A new name registers a type and a built in name replaces its renderer; a `<Component>.schema.json` beside the component declares the `data` fields lint validates.

```json
{
  "pageTypes": { "spotlight": "./docs/types/Spotlight.svelte" }
}
```

See [Custom page types](/page-types/custom) for the component contract.

## Grouping and duplicate routes

Pages of type `changelog` are grouped by `(parent folder, title)` and collapse into one collection page mounted at the folder's route. Pages of any other type that share an effective route raise a build error, so duplicate routes never reach the runtime.

## Restyling a page type

Every page type renders its chrome through documented classes you can override from your own stylesheet. See [Page types styling](/styling/page-types).
