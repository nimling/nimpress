# Frontmatter

YAML at the top of every markdown file, parsed with `gray-matter` and validated with `zod`. Unknown fields warn but do not fail the build.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string, required | Page heading rendered as h1 |
| `slug` | string | Short label rendered in the sidebar, falls back to `title` |
| `type` | `doc` \| `openapi` \| `changelog` \| `hero` | Renderer selection, defaults to `doc` |
| `path` | string | Route override, default derived from the file location |
| `spec` | string | Required when `type: openapi`, path to the spec JSON, relative to the markdown file |
| `scope` | string | Auth scope required to view the page |
| `claim` | string | Auth claim required to view the page |
| `description` | string | Meta description and search excerpt |
| `order` | number | Sort position inside the parent sidebar group |
| `icon` | string | Optional icon next to the sidebar entry |
| `group` | object | Sidebar group definition: required `name`, optional `icon` and `style`, groups the page without changing its URL |
| `hidden` | boolean | Excludes the page from sidebar, search, and direct routing |
| `collapsed` | boolean | Starts the sidebar group collapsed |
| `lastUpdated` | boolean | Show the last updated stamp in the page footer area |
| `redirect` | string | Send the visitor to another path on load |
| `noToc` | boolean | Hide the right rail table of contents |
| `footer` | string | Centered, muted text rendered at the bottom of the page |
| `meta` | object | SEO and social card metadata, see [seo.md](./seo.md) |
| `data` | object | Renderer specific payload, see below |

## `meta`

SEO and social card metadata written to `<head>` at build time and re applied on every navigation. Full reference in [seo.md](./seo.md). Top level keys:

1. `description`, `canonical`, `robots`, `keywords`, `author`, `themeColor` for standard HTML head tags.

2. `og` for OpenGraph: `title`, `description`, `type`, `image`, `imageAlt`, `url`, `siteName`, `locale`.

3. `twitter` for Twitter Card: `card`, `site`, `creator`, `title`, `description`, `image`, `imageAlt`.

4. `jsonLd` for structured data, written as `<script type="application/ld+json">`.

## `data`

Arbitrary object handed to the renderer the page selected.

1. `type: changelog` reads `data.version` for sort order, `data.title` for the per release headline, and `data.description` for the per release summary line. The top level `title` is the shared collection title and the grouping key.

2. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, `data.align`. Action buttons and feature grids live in the markdown body via the directives in [markdown.md](./markdown.md), not in `data`.

3. Custom renderers read whatever they need.

## Path derivation

Default `path` for `docs/guide/intro.md` is `/guide/intro`. For `docs/guide/index.md` it is `/guide`. For `docs/index.md` it is `/`.

A frontmatter `path` overrides this entirely.

## Duplicate paths

Two pages sharing the same effective `path` raise a build error. `type: changelog` entries do not declare `path` at all; they are grouped by `(parent folder, title)` and collapse into one rendered page mounted at the folder's path. See [changelog.md](./changelog.md).

## Outside contentDir

The plugin throws a build error if a content file resolves outside `contentDir`. This usually means the working directory you run Vite from is not the docs root, or the linked `dist/` is stale. Rebuild nimpress and restart the dev server.
