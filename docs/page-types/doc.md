---
title: Doc pages
order: 11
description: The default page type, used by everything that is not one of the other renderers.
---

A markdown file with no `type` field is a `doc`. Concept guides, references, tutorials, and design notes all use it. Every page in this section is one.

## Frontmatter

```yaml
---
title: How sessions work
description: One sentence used as the meta description and the search excerpt.
tags: api, sessions, identity
order: 3
---
```

`title` is the only required field. It becomes the H1, the breadcrumb label, and the sidebar label. The full list is in [Frontmatter](/frontmatter).

## What the shell gives you

1. The header, the sidebar, the content column, and the right rail table of contents built from the H2 and H3 headings.

2. A hash that updates as the reader passes each heading, so a deep link survives sharing.

3. A back to top control after 600px of scroll.

4. Page local styles from a sibling stylesheet named after the file, described in [Theming](/theming).

## Body conventions

Start the body at H2. The H1 is already rendered from `title`. Fence every code block with its language, and reach for [callouts](/extensions/markdown), [definition lists](/extensions/definition-lists), and [diagrams](/extensions/mermaid) rather than long prose when the shape fits.

## Hiding a page

`visibility: hidden` removes the page from the sidebar, the search index, and the build. `visibility: dev-only` keeps it in `nimpress dev` and leaves it out of the built bundle, with a red dot on its sidebar row.
