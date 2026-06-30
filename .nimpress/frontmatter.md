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
| `hidden` | boolean | Remove the page from the sidebar, search, and routing. Use for drafts |
| `noToc` | boolean | Hide the right rail on short pages |
| `footer` | string | Centered muted line at the bottom of the page |
| `lastUpdated` | boolean | Show the last commit date for the file |

## Type

| You want | Set `type` |
|----------|-----------|
| A normal documentation page | omit or `doc` |
| A page rendered from an OpenAPI 3.1 spec | `openapi` |
| A stack of release notes on one page | `changelog` |
| A landing page with an oversized hero band | `hero` |
| A vertical roadmap timeline | `roadmap` |
| One item on a roadmap timeline | `milestone`, `epic`, `feature`, `bug` |

See [page types](./page-types) for the full description of each.

## Type specific fields

1. `type: openapi` requires `spec`, a path to the spec relative to the markdown file.

2. `type: changelog` requires `data.version`, `data.release_date`, `data.title`, and `data.description`. Optional `data.issue` and `data.status` link the entry to a roadmap item.

3. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, and `data.align`. Action buttons and feature grids are written in the body with `:::actions` and `:::features`, not in `data`.

4. `type: roadmap` reads optional `description`, `background`, and `data.changelog`, `data.issues` to scope the timeline.

5. Issue pages require `title`, `description`, and `data.date`. Optional `data.parent` references another issue by relative filename.

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
