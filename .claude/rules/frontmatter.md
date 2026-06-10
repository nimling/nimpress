# Frontmatter rules

Every markdown page declares YAML frontmatter at the top. Parsed with `gray-matter` and validated with `zod` in `src/plugin.ts`. Unknown fields warn but do not fail the build.

## Always

1. `title: string` is required. Use sentence case.

## Sometimes

1. `slug` shortens the sidebar label. Use when the title is descriptive but the sidebar needs to stay tight.

2. `path` overrides the route. Use when the file location and the URL should differ.

3. `order: number` pins position inside the parent sidebar group. Use sparingly, the default alphabetical order is fine for most cases.

4. `description` gets used as a meta description and a search excerpt. Add it for any page expected to land via search.

5. `hidden: true` removes the page from sidebar, search, and direct routing. Use for drafts.

6. `noToc: true` hides the right rail. Use on hero pages and short pages where the TOC would feel empty.

7. `footer: string` renders a centered, muted line at the bottom. Use for "Last reviewed", attribution, or a contact pointer.

8. `tags` is a comma separated string or a YAML array of short keywords. The search index boosts tag matches and shows matched tags as pills under each result. Query syntax: a token ending in `/` like `api/` scopes the result set to pages whose sidebar path starts with that segment, case insensitive. Combine: `api/ device` returns device results inside the api folder.

## Choosing `type`

| You want | Set `type:` |
|----------|-------------|
| A normal documentation page | omit or `doc` |
| A reference page rendered from an OpenAPI 3.1 spec | `openapi` |
| A page combining several release notes into one collapsible list | `changelog` |
| A landing page with an oversized hero band on top | `hero` |
| A vertical roadmap timeline of milestones, epics, features, and bugs | `roadmap` |

## Type specific fields

1. `type: openapi` requires `spec: ./path/to/spec.json` relative to the markdown file.

2. `type: changelog` requires `data.version: '1.2.3'`, `data.release_date` as an RFC 3339 date, `data.title` for the per release headline, and `data.description` for the per release summary. Top level `title` is the shared collection title and the grouping key, every entry file in the same folder uses the exact same string. No `path` field. Optional `data.roadmap: <relative path>` links the entry to a roadmap item. See [changelog-entries.md](./changelog-entries.md).

3. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, `data.align`. Action buttons and feature grids do NOT live in `data`. Compose them as `:::actions` and `:::features` in the markdown body. See `docs/hero.md` and `docs/markdown.md`.

4. `type: roadmap` requires `data.id`, `data.kind` (`milestone | epic | feature | bug`), `data.title`, `data.description`, and `data.date` as an RFC 3339 string. Optional `data.parent`, `data.progress`, `data.issue`, and `data.status`. Top level `title` is the shared collection title and the grouping key. See [roadmap-entries.md](./roadmap-entries.md).

## SEO and social cards

`meta` carries the per page metadata written to `<head>` at build time:

```yaml
meta:
  description: One sentence for search.
  canonical: https://developer.samna.io/path
  robots: index,follow
  keywords: [topic-a, topic-b]
  og:
    image: /og/page.png
    type: article
  twitter:
    card: summary_large_image
    site: '@samnaio'
  jsonLd:
    '@context': https://schema.org
    '@type': TechArticle
    headline: My page
```

Defaults flow from `frontmatter.description` and the site level `site` config in `createNimpressApp`. Full reference in `docs/seo.md`.

## Auth

1. `scope` and `claim` gate the page through the viewer's session claims.

2. Public pages omit both.

3. Hidden pages cannot be reached even with the right claim.

## Never

1. Never invent fields the schema does not declare. Add them to the schema and the type definitions first, in the same change.

2. Never set `path` to a value that conflicts with another page's `path`. The build raises an error. `type: changelog` entries derive their route from the folder, never set `path` on them.

3. Never put action buttons or feature grids inside `data`. They live in the markdown body via `:::actions` and `:::features`.

4. Never write multi line strings or arbitrary nested objects in frontmatter beyond `data` and `meta`. If a renderer needs more, lift it into `data` as a structured object.

5. Never write Boolean values as quoted strings (`'true'`). Use unquoted booleans (`true`, `false`).
