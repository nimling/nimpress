---
title: Frontmatter
sidebar:
  name: Authoring
  path: authoring
tags: Authoring, Frontmatter
order: 4
---

nimpress supports the inclusion of metadata in the frontmatter of a markdown file that is stripped from the file contents before the rest of the content is handed over to the markdown parser. It selects the renderer, names the page, places it in the sidebar, and carries the data a page type reads. The block is YAML, parsed with `gray-matter` and validated with `zod`; unknown fields warn but do not fail the build.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string, required | Page heading rendered as h1 |
| `slug` | string | Short label rendered in the sidebar, falls back to `title` |
| `type` | page type | Renderer selection, defaults to `doc`, see [page-types.md](/page-types) |
| `path` | string | Route override, default derived from the file location |
| `spec` | string | Required when `type: openapi` or `type: dbml`, path to the spec JSON or the `.dbml` file, relative to the markdown file |
| `gate` | string | Marks the page guarded; the guard function maps it to a guarded bundle |
| `link` | string | Absolute url. The file becomes a sidebar entry that opens that url in a new tab and routes to no page of its own |
| `description` | string | Meta description and search excerpt |
| `order` | number | Sort position inside the parent sidebar group |
| `icon` | string | Icon field for custom renderers; the sidebar renders `sidebar.icon` |
| `sidebar` | object | Sidebar group definition: required `name`, optional `icon`, `style`, and `path`, groups the page without changing its URL. `icon` takes literal text or ascii art, inline `<svg>` markup, or a `.svg` path inlined at build time |
| `visibility` | `visible` \| `hidden` \| `dev-only` | `hidden` removes the page from sidebar, search, and the build entirely. `dev-only` shows it in `nimpress dev` but excludes it from the built bundle. Defaults to `visible` |
| `collapsed` | boolean | Starts the sidebar group collapsed |
| `lastUpdated` | boolean | Show the last updated stamp in the page footer area |
| `redirect` | string | Send the visitor to another path on load |
| `hide` | list | Page elements to hide: `navigation`, `toc`, `path`, `footer`, `tags`, `feedback`, see below |
| `status` | string | Status identifier rendered as a mark on the sidebar row, see below |
| `footer` | string | Centered, muted text rendered at the bottom of the page |
| `background` | string | Banner image behind the header, used by `hero` and `roadmap` |
| `tags` | string \| string[] | Comma separated string or YAML array of tags, shown at the bottom of the page, boosted in search, and listed on the tags page |
| `rss` | boolean | Serve a `changelog` collection as an RSS feed |
| `subscribe` | boolean | Show a subscribe control on a `changelog` collection |
| `meta` | object | SEO and social card metadata, see [seo.md](/seo) |
| `data` | object | Renderer specific payload, see below |

## `visibility`

Three states, enforced in `src/plugin.ts`:

1. `visible` is the default. The page routes, appears in the sidebar, and indexes into search.

2. `hidden` removes the page from the sidebar, from search, and from the build output. Use it for drafts.

3. `dev-only` keeps the page in `nimpress dev` so you can work on it locally, but excludes it from the built bundle. Its sidebar row carries a red dot marking it as local. Use it for pages that should never ship, like internal scratch pages.

## `hide`

Use the hide front matter property to hide one or more elements of a page. The value is a list of element names.

```yaml
hide:
  - navigation
  - toc
```

| Value | Hides |
|-------|-------|
| `navigation` | The sidebar column and the menu button |
| `toc` | The right rail table of contents |
| `path` | The breadcrumbs in the header |
| `footer` | The page footer line, from the page or from the site config |
| `tags` | The tag row under the title |

A `hide` list in `defaultFrontmatter` merges with the page's own list, so a site wide `hide: [footer]` and a page level `hide: [toc]` hide both.

## `status`

A status can be assigned to each page and displayed in the navigation sidebar. The value is an identifier; the sidebar row renders a `np-sidebar-status` mark carrying the identifier's label as its title.

```yaml
status: new
```

`new` labels as `Recently added` and `deprecated` as `Deprecated` without configuration. The `status` field in `nimpress.config` maps further identifiers to labels, and an identifier without a label shows as itself.

```ts
status: { beta: 'Beta' }
```

Every mark carries `np-sidebar-status-<identifier>` beside `np-sidebar-status`, so a site colors `np-sidebar-status-new`, `np-sidebar-status-deprecated`, or its own identifiers from its stylesheet. See [Shell](/styling/shell).

## `sidebar`

A top level `sidebar` block places the page under a named sidebar group without moving its folder or changing its URL. `name` is required and renders verbatim. `icon` and `style` decorate the group row; `icon` takes literal text or ascii art, inline `<svg>` markup, or a path ending in `.svg` resolved against the declaring file, or against `contentDir` when it starts with `/`, and inlined at build time. `path` overrides the group's route; without it the route falls back to the physical folder. On a folder `index.md` the block changes and styles the folder's own sidebar entry instead of nesting a group, for every page type. On the root `index.md` the block inserts the page into the sidebar as the entry for the directory named by `path`, so the root page serves as a clickable top level item. See [sidebar.md](/sidebar).

```yaml
sidebar:
  name: Inputs
  icon: "▤"
  style: "color: var(--np-brand)"
```

## `link`

An absolute url turns the file into a sidebar entry pointing outward. The file carries frontmatter and no body, it produces no route, no search entry, and no page in the build, and its position in the sidebar comes from where the file sits exactly as it does for a normal page. `title` or `sidebar.name` is the label, `order` places it, and `sidebar.icon` and `sidebar.style` decorate it.

```yaml
---
title: Samna docs
link: https://developer.samna.io
order: 90
sidebar:
  icon: /assets/samna.svg
---
```

The rendered entry opens in a new tab with `rel="noreferrer"`, carries an outbound glyph, and never highlights as the active route. `redirect` is the internal counterpart: it routes into a page on this site and sends the visitor to another path on this site.

## `gate`

One field guards a page. The value is an arbitrary string; the build's guard function maps every gated page into a guarded bundle under `dist/_guarded/<bundle>/`, `dist/guard.map.json` records what went where, and the runtime checks the viewer against the gate. See [auth.md](/auth).

```yaml
gate: internal
```

## `meta`

SEO and social card metadata written to `<head>` at build time and re applied on every navigation. Full reference in [seo.md](/seo). Top level keys:

1. `description`, `canonical`, `robots`, `keywords`, `author`, `themeColor` for standard HTML head tags.

2. `og` for OpenGraph: `title`, `description`, `type`, `image`, `imageAlt`, `url`, `siteName`, `locale`.

3. `twitter` for Twitter Card: `card`, `site`, `creator`, `title`, `description`, `image`, `imageAlt`.

4. `jsonLd` for structured data, written as `<script type="application/ld+json">`.

## `data`

Arbitrary object handed to the renderer the page selected.

1. `type: changelog` reads `data.version` for sort order, `data.release_date` for the date, `data.title` for the per release headline, and `data.description` for the per release summary. The top level `title` is the shared collection title and the grouping key.

2. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, `data.align`. Action buttons and feature grids live in the markdown body via the directives in [Markdown](/authoring/markdown), not in `data`.

2.1. `type: fullpage` reads `data.eyebrow`, `data.logo`, `data.background`, `data.tagline`, `data.lead`, `data.align`, and `data.width`. The type hides `navigation`, `path`, `toc`, and `footer` by itself. See [Full pages](/page-types/fullpage).

2.2. `type: 404` needs `title` alone. The build writes the page as `404.html` at the output root, the app routes an unknown path to it, and it stays out of the sidebar, search, and the sitemap. One per site. See [Not found page](/page-types/404).

2.3. `type: section` belongs on a folder `index.md` and reads `data.columns` and `data.depth`. The body renders first and every child page follows as a card in sidebar order. See [Section pages](/page-types/section).

2.4. `type: tags` needs `title` alone and lists every tag with its pages under the body. One per site. Every page shows its `tags` at the bottom, hidden with `hide: [tags]`, and the `tags` config block maps tags to identifiers and identifiers to icons. See [Tags page](/page-types/tags).

2.5. `type: glossary` needs `title` and a definition list body. Every term gets an anchor, the rail lists the terms, and the first occurrence of a term in each paragraph of every other page renders as an abbreviation with a tooltip. One per site. See [Glossary page](/page-types/glossary).

2.6. `type: team` requires `data.members`, each with `name` and optional `role`, `image`, `bio`, and `links`; `data.columns` and `data.align` shape the grid. `type: pricing` requires `data.tiers`, each with `name` and optional `price`, `period`, `description`, `benefits`, `action`, and `highlight`; `data.columns` and `data.footnote` shape the row. See [Team pages](/page-types/team) and [Pricing pages](/page-types/pricing).

3. `type: roadmap` reads `data.issues` and `data.changelog` to scope the timeline. The issue kinds read `data.date` and `data.parent`.

4. `type: component` reads `data.system` and `data.component`, with optional `data.package`, `data.file`, `data.version`, and `data.schema` as an inline schema layer merged over the schema file. See [modules.md](/modules).

5. `type: dbml` takes the schema from `spec` and shapes its header from `data.eyebrow`, `data.lead`, `data.logo`, `data.banner`, `data.align`, `data.download`, `data.fullscreen`, `data.actions`, and `data.height`. See [DBML pages](/page-types/dbml).

6. Custom renderers read whatever they need.

## Path derivation

Default `path` for `docs/guide/intro.md` is `/guide/intro`. For `docs/guide/index.md` it is `/guide`. For `docs/index.md` it is `/`.

A frontmatter `path` overrides this entirely.

## Duplicate paths

Two pages sharing the same effective `path` raise a build error. `type: changelog` entries do not declare `path` at all; they are grouped by `(parent folder, title)` and collapse into one rendered page mounted at the folder's path. See [Changelog renderer](/page-types/changelog).

## Outside contentDir

The plugin throws a build error if a content file resolves outside `contentDir`. This usually means the working directory you run Vite from is not the docs root, or the linked `dist/` is stale. Rebuild nimpress and restart the dev server.
