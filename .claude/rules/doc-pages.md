# Authoring doc pages

Rules for the default page type. Any markdown file without an explicit `type:` renders as a `doc`. Concept guides, references, tutorials, design docs, and one off retrospectives all use this type.

## Default behavior

1. No `type:` field. Setting `type: doc` is allowed and equivalent.

2. The route is derived from the file location under `contentDir`. Override with `path:` only when the URL and the file location must differ.

3. The page mounts inside the same shell as every other page: header, sidebar, content column, right rail TOC. The right rail lists H2 and H3 headings from the body.

## Required frontmatter

```yaml
---
title: How sessions work
---
```

1. `title: string` is required. Use sentence case. This is the H1, the breadcrumb label, and the default sidebar label.

## Recommended frontmatter

1. `description` is a one sentence summary. Used as the meta description and the search excerpt. Add it for any page expected to land via search.

2. `tags` is a comma separated string or a YAML array. The search index boosts tag matches and shows them as pills under each result. Example: `tags: api, sessions, identity`. Search treats a trailing slash like `api/` as a folder scope filter.

3. `order` pins the page inside its parent sidebar group. Use sparingly. Default is alphabetical by title.

4. `icon` is a short emoji or icon name rendered next to the sidebar label.

5. `slug` shortens the sidebar label without renaming the file.

6. `noToc: true` hides the right rail. Use only on short pages where the TOC would feel empty.

7. `footer` renders a centered, muted line at the bottom of the page.

8. `lastUpdated: true` shows the last commit date for the file in the footer.

9. `meta` carries `description`, `canonical`, `robots`, `keywords`, `og`, `twitter`, `jsonLd` for SEO and social cards. Full reference in `frontmatter.md`.

## Body conventions

1. One H1 per page lives in `title`. Start the markdown body at H2.

2. Use H2 to separate top level sections. H3 for sub sections. Avoid H4 unless absolutely necessary.

3. Headings are sentence case.

4. Numbered lists at column zero in the form `1.`, `2.`, with a blank line between entries. Sub items use `1.1.`, `1.2.` at column zero. Never indent.

5. Fence every code block with its language. `bash`, `ts`, `python`, `json`, `yaml`, `http`. Aliases: `curl` renders as bash, `hurl` renders as http.

6. Use `:::code-group` when showing the same example in two or more languages.

7. Callouts are `:::tip`, `:::note`, `:::warning`, `:::info`, `:::check`. Three on a page is a lot.

8. Definition lists for reference grids of terms with one line descriptions. See `docs/definition-lists.md`.

9. Mermaid blocks render `flowchart`, `stateDiagram-v2`, `sequenceDiagram`, `erDiagram` when a flow or state reads more cleanly visually.

## Linking

1. Relative links within the same section, absolute links across sections.

2. Use the page title as the link text. Avoid `click here`.

3. Anchor references to current code by file path and line number when describing implementation.

## Auth

1. `scope` and `claim` gate the page through the viewer's session claims. Public pages omit both.

2. `hidden: true` removes the page from the sidebar, the search index, and direct routing. Use for drafts.

## Reading direction

1. The reader scrolls top to bottom. The URL hash updates as they pass headings so deep links survive sharing.

2. A back to top button slides in from the bottom left after 600px of scroll, sized to clear the sidebar column.

## Never

1. Never write an H1 inside the body. The title already renders as the H1.

2. Never set `path` to a value that conflicts with another page's `path`. The build raises an error.

3. Never invent fields the schema does not declare. Add them to the schema first, in the same change.

4. Never write Boolean values as quoted strings (`'true'`). Use unquoted booleans.
