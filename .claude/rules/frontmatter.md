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

## Choosing `type`

| You want | Set `type:` |
|----------|-------------|
| A normal documentation page | omit or `doc` |
| A reference page rendered from an OpenAPI 3.1 spec | `openapi` |
| A page combining several release notes into one collapsible list | `changelog` |
| A landing page with a tagline, action buttons, and feature grid | `hero` |

## Type specific fields

1. `type: openapi` requires `spec: ./path/to/spec.json` relative to the markdown file.

2. `type: changelog` requires `data.version: '1.2.3'`. Multiple files share the same `path`. The plugin groups them.

3. `type: hero` reads `data.tagline`, `data.lead`, `data.image`, `data.actions`, `data.features`. See `docs/hero.md`.

## Auth

1. `scope` and `claim` gate the page through the viewer's session claims.

2. Public pages omit both.

3. Hidden pages cannot be reached even with the right claim.

## Never

1. Never invent fields the schema does not declare. Add them to the schema and the type definitions first, in the same change.

2. Never set `path` to a value that conflicts with another page's `path`. The build raises an error. The only exception is multiple `type: changelog` pages sharing one `path`.

3. Never write multi line strings or nested objects in frontmatter beyond `data`. If a renderer needs more, lift it into `data` as a structured object.

4. Never write Boolean values as quoted strings (`'true'`). Use unquoted booleans (`true`, `false`).
