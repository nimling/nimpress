---
title: Frontmatter
description: Every field a markdown page can declare at the top, and what it controls.
order: 3
---

Every page declares YAML frontmatter at the top. `title` is the only required field. Unknown fields warn but do not fail the build.

## Always

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Required. The H1, the breadcrumb label, and the default sidebar label. Sentence case |

## Common

| Field | Type | Purpose |
|-------|------|---------|
| `description` | string | Meta description and search excerpt |
| `slug` | string | Shorten the sidebar label without renaming the file |
| `path` | string | Override the route when the URL and the file location differ |
| `order` | number | Pin the position inside the parent sidebar group |
| `icon` | string | Emoji or icon name next to the sidebar label |
| `tags` | string or list | Boost search matches and show pills under results |
| `visibility` | `visible`, `hidden`, `dev-only` | Where the page appears. Defaults to `visible` |
| `sidebar` | object | Group the page under a named sidebar row without changing its URL. Required `name`, optional `icon`, `style`, `path` |
| `gate` | string | Mark the page guarded so it builds into a guarded bundle instead of the public one |
| `collapsed` | boolean | Start the sidebar group collapsed |
| `redirect` | string | Send the route to another path |
| `noToc` | boolean | Hide the right rail on short pages |
| `footer` | string | Centered muted line at the bottom of the page |
| `lastUpdated` | boolean | Show the last commit date for the file |
| `rss` | boolean | Publish a feed for a changelog collection |
| `subscribe` | boolean | Offer the email subscription beside the feed URL |

## Visibility

`visibility` takes three values and is the only field controlling where a page appears.

1. `visible` is the default and needs no declaration.

2. `hidden` takes the page out of the sidebar, out of search, and out of the build.

3. `dev-only` keeps the page in `nimpress dev` and leaves it out of the built bundle. Its sidebar row carries a red dot so an author can see that the page does not ship.

The schema accepts unknown fields without failing, so a page carrying some other flag builds and publishes as a normal public page. A page meant to stay unpublished declares `visibility`.

## Type

| You want | Set `type` |
|----------|-----------|
| A normal documentation page | omit or `doc` |
| A page rendered from an OpenAPI 3.1 spec | `openapi` |
| A stack of release notes on one page | `changelog` |
| A landing page with an oversized hero band | `hero` |
| A vertical roadmap timeline | `roadmap` |
| One item on a roadmap timeline | `milestone`, `epic`, `feature`, `bug` |
| A live workshop page for one component | `component` |

See [page types](./page-types) for the full description of each.

## Type specific fields

1. `type: openapi` requires `spec`, a path to the spec relative to the markdown file.

2. `type: changelog` requires `data.version`, `data.release_date`, `data.title`, and `data.description`. Optional `data.issue` and `data.status` link the entry to a roadmap item.

3. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, and `data.align`. Action buttons and feature grids are written in the body with `:::actions` and `:::features`, not in `data`.

4. `type: roadmap` reads optional `description`, `background`, and `data.changelog`, `data.issues` to scope the timeline.

5. Issue pages require `title`, `description`, and `data.date`. Optional `data.parent` references another issue by relative filename.

6. `type: component` requires `data.system` naming a configured module system and `data.component` naming the component. Optional `data.package`, `data.file`, and `data.schema` layered over the schema file.

## SEO and social

`meta` carries the per page head metadata.

```yaml
meta:
  description: One sentence for search.
  canonical: https://developer.example.io/path
  robots: index,follow
  og:
    image: /og/page.png
  twitter:
    card: summary_large_image
```

## Never

1. Never invent fields the schema does not declare. Add them to the schema first.

2. Never set `path` to a value another page already uses. The build raises an error.

3. Never write booleans as quoted strings. Use `true` and `false`.
