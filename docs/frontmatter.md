---
title: Frontmatter
order: 2
sidebar:
  name: Core
---

YAML at the top of every markdown file, parsed with `gray-matter` and validated with `zod`. Unknown fields warn but do not fail the build.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string, required | Page heading rendered as h1 |
| `slug` | string | Short label rendered in the sidebar, falls back to `title` |
| `type` | page type | Renderer selection, defaults to `doc`, see [page-types.md](/page-types) |
| `path` | string | Route override, default derived from the file location |
| `spec` | string | Required when `type: openapi`, path to the spec JSON, relative to the markdown file |
| `gate` | string | Marks the page guarded; the guard function maps it to a guarded bundle |
| `description` | string | Meta description and search excerpt |
| `order` | number | Sort position inside the parent sidebar group |
| `icon` | string | Optional icon next to the sidebar entry |
| `sidebar` | object | Sidebar group definition: required `name`, optional `icon`, `style`, and `path`, groups the page without changing its URL |
| `visibility` | `visible` \| `hidden` \| `dev-only` | `hidden` removes the page from sidebar, search, and the build entirely. `dev-only` shows it in `nimpress dev` but excludes it from the built bundle. Defaults to `visible` |
| `collapsed` | boolean | Starts the sidebar group collapsed |
| `lastUpdated` | boolean | Show the last updated stamp in the page footer area |
| `redirect` | string | Send the visitor to another path on load |
| `noToc` | boolean | Hide the right rail table of contents |
| `footer` | string | Centered, muted text rendered at the bottom of the page |
| `background` | string | Banner image behind the header, used by `hero` and `roadmap` |
| `tags` | string \| string[] | Comma separated string or YAML array of search keywords |
| `rss` | boolean | Serve a `changelog` collection as an RSS feed |
| `subscribe` | boolean | Show a subscribe control on a `changelog` collection |
| `meta` | object | SEO and social card metadata, see [seo.md](/seo) |
| `data` | object | Renderer specific payload, see below |

## `visibility`

Replaces a plain hidden flag with three states, enforced in `src/plugin.ts`:

1. `visible` is the default. The page routes, appears in the sidebar, and indexes into search.

2. `hidden` removes the page from the sidebar, from search, and from the build output. Use it for drafts.

3. `dev-only` keeps the page in `nimpress dev` so you can work on it locally, but excludes it from the built bundle. Use it for pages that should never ship, like internal scratch pages.

## `sidebar`

A top level `sidebar` block places the page under a named sidebar group without moving its folder or changing its URL. `name` is required and renders verbatim. `icon` and `style` decorate the group row. `path` overrides the group's route; without it the route falls back to the physical folder. On a folder `index.md` the block changes and styles the folder's own sidebar entry instead of nesting a group, for every page type. See [sidebar.md](/sidebar).

```yaml
sidebar:
  name: Inputs
  icon: "▤"
  style: "color: var(--np-brand)"
```

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

2. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, `data.align`. Action buttons and feature grids live in the markdown body via the directives in [markdown.md](/markdown), not in `data`.

3. `type: roadmap` reads `data.issues` and `data.changelog` to scope the timeline. The issue kinds read `data.date` and `data.parent`.

4. `type: component` reads `data.system` and `data.component`, with optional `data.package`, `data.file`, `data.version`, and `data.controls`. See [modules.md](/modules).

5. Custom renderers read whatever they need.

## Path derivation

Default `path` for `docs/guide/intro.md` is `/guide/intro`. For `docs/guide/index.md` it is `/guide`. For `docs/index.md` it is `/`.

A frontmatter `path` overrides this entirely.

## Duplicate paths

Two pages sharing the same effective `path` raise a build error. `type: changelog` entries do not declare `path` at all; they are grouped by `(parent folder, title)` and collapse into one rendered page mounted at the folder's path. See [changelog.md](/changelog).

## Outside contentDir

The plugin throws a build error if a content file resolves outside `contentDir`. This usually means the working directory you run Vite from is not the docs root, or the linked `dist/` is stale. Rebuild nimpress and restart the dev server.
