# Frontmatter rules

Every markdown page declares YAML frontmatter at the top. Parsed with `gray-matter` and validated with `zod` in `src/plugin.ts`. Unknown fields warn but do not fail the build; declared fields come from the schema and the type definitions, extended there first, in the same change.

## Always

1. `title: string` is required. Use sentence case.

## Sometimes

1. `slug` shortens the sidebar label. Use when the title is descriptive but the sidebar needs to stay tight.

2. `path` overrides the route. Use when the file location and the URL should differ. Two pages sharing an effective path raise a build error.

3. `order: number` pins position inside the parent sidebar group. Use sparingly, the default alphabetical order is fine for most cases.

3.1. `sidebar` inserts the page under a named sidebar group without changing its URL: required `name` as the verbatim label, optional `icon` and `style` decorating the group row, optional `path` overriding the group route. On a folder `index.md` the block changes and styles the folder's own sidebar entry instead of nesting a group; this works on every page type.

4. `description` gets used as a meta description and a search excerpt. Add it for any page expected to land via search.

5. `visibility` controls where the page appears, one of `visible`, `hidden`, `dev-only`. `visible` is the default. `hidden` removes the page from sidebar, search, and the build, use it for drafts. `dev-only` keeps the page in `nimpress dev` but excludes it from the built bundle, use it for pages that must never ship.

6. `noToc: true` hides the right rail. Use on hero pages and short pages where the TOC would feel empty.

7. `footer: string` renders a centered, muted line at the bottom. Use for "Last reviewed", attribution, or a contact pointer.

8. `tags` is a comma separated string or a YAML array of short keywords. The search index boosts tag matches and shows matched tags as pills under each result. Query syntax: a token ending in `/` like `api/` scopes the result set to pages whose sidebar path starts with that segment, case insensitive. Combine: `api/ device` returns device results inside the api folder.

9. `gate: <string>` marks the page guarded. Any string works; the build's guard function maps gated pages into guarded bundles under `dist/_guarded/<bundle>/` and the runtime checks the viewer against the gate. Public pages omit it. Booleans stay unquoted (`true`, not `'true'`) everywhere in frontmatter.

## Choosing `type`

| You want | Set `type:` |
|----------|-------------|
| A normal documentation page | omit or `doc` |
| A reference page rendered from an OpenAPI 3.1 spec | `openapi` |
| A page combining several release notes into one collapsible list | `changelog` |
| A landing page with an oversized hero band on top | `hero` |
| A vertical roadmap timeline of milestones, epics, features, and bugs | `roadmap` |
| A live workshop page for one component in a library | `component` |

## Type specific fields

1. `type: openapi` requires `spec: ./path/to/spec.json` relative to the markdown file.

2. `type: changelog` requires `data.version: '1.2.3'`, `data.release_date` as an RFC 3339 date, `data.title` for the per release headline, and `data.description` for the per release summary. Top level `title` is the shared collection title and the grouping key, every entry file in the same folder uses the exact same string. The route comes from the folder, so entries carry no `path` field. Optional `data.issue: <relative path>` plus `data.status` link the entry to a roadmap issue. See [changelog-entries.md](./changelog-entries.md).

3. `type: hero` reads `data.eyebrow`, `data.logo`, `data.banner`, `data.tagline`, `data.lead`, `data.image`, `data.align`. Action buttons and feature grids compose as `:::actions` and `:::features` in the markdown body, `data` carries only the band fields. See `docs/hero.md` and `docs/markdown.md`.

4. `type: roadmap` reads `title`, optional `description`, optional `background`, and optional `data.changelog`, `data.issues` to scope which sibling folders feed the timeline. The markdown body renders as the page header above the timeline. Sibling files of `type: milestone | epic | feature | bug` become the timeline items.

5. `type: milestone | epic | feature | bug` (issue pages) require `title`, `description`, and `data.date` as an RFC 3339 string. Optional `data.parent` references another issue by relative filename. Each issue page renders at its own URL with a kind chip and date header. See [roadmap-entries.md](./roadmap-entries.md).

6. `type: component` requires `data.system` naming a configured module system and `data.component` naming the component. Optional `data.package`, `data.file`, `data.version`, and `data.schema` as an inline schema layer merged over the schema file. One `type: component` page per folder; the sibling story files are its stories. See [component-modules.md](./component-modules.md).

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

Structured payloads beyond `meta` live inside `data` as structured objects, never as loose top level fields. Defaults flow from `frontmatter.description` and the site level `site` config in `createNimpressApp`. Full reference in `docs/seo.md`.

## Gating

1. `gate` is the single gating field. The value is an arbitrary string the site's guard function and access checker interpret; nimpress assigns it no meaning of its own.

2. At build, gated pages leave the public bundle and land in `dist/_guarded/<bundle>/`, where the bundle name comes from the `auth.guard` function in the nimpress config, or the gate value itself without one. `dist/guard.map.json` records what went where.

3. `visibility: hidden` removes a page from the build entirely, and `dev-only` from the built bundle, independent of `gate`. A viewer who satisfies the gate still cannot reach a page whose visibility excludes it.
