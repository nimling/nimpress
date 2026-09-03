---
title: Markdown
order: 21
tags: Authoring, Markdown
description: The markdown pipeline with headings, callouts, tabs, code blocks, grids, formatting, images, icons, math, and the directives.
---

Markdown is a lightweight markup language for authoring text such as technical documentation. nimpress renders CommonMark through `markdown-it` with a focused set of extensions, every one on without configuration, and each with its own page under [Authoring](/authoring).

| Page | Written as |
|---|---|
| [Callouts](/authoring/callouts) | `:::tip` and twelve more types |
| [Content tabs](/authoring/content-tabs) | `:::tabs` with `::tab Label` items, `:::code-group` for fences |
| [Buttons](/authoring/buttons) | `:::actions` with a variant per link |
| [Grids](/authoring/grids) | `:::cards` and `::::features` |
| [Code blocks](/authoring/code-blocks) | A fence with a title, line numbers, highlighted lines, and annotations |
| [Formatting](/authoring/formatting) | `==mark==`, `^^insert^^`, `~~delete~~`, `H~2~O`, `x^2^`, `++ctrl+alt+del++` |
| [Images](/authoring/images) | `{align=right}`, a titled image as a figure, `#only-dark`, `{.zoom}` |
| [Icons and emojis](/authoring/icons-emojis) | `:lucide-braces:` and `:rocket:` |
| [Math](/authoring/math) | `$...$` and `$$...$$` |
| [Footnotes](/authoring/footnotes) | `[^1]` |
| [Lists](/authoring/lists) | `-`, `1.`, `term` then `: description`, `- [x]` |
| [Data tables](/authoring/data-tables) | Pipes with alignment colons |
| [Tooltips](/authoring/tooltips) | A titled link, `*[TERM]: description`, the glossary |
| [Diagrams](/authoring/mermaid) | A ` ```mermaid ` fence |
| [DBML](/authoring/dbml) | A ` ```dbml ` fence or `type: dbml` |
| [OpenAPI](/authoring/openapi) | `type: openapi` and a `spec` field |

## Linking between pages

When adding links to other pages always use the resolved route, not the file path. Relative links resolve against the current route inside a section, and absolute links from the site root across sections, so a page can move to a new `base` without any changes. See [Relative links](/authoring/relative-links).

## Page title

nimpress produces a page title for each page from the `title` frontmatter field. It is the H1, the breadcrumb label, the sidebar label, and the tab title, so the markdown body starts at H2.


`markdown-it-anchor` adds a permalink to every heading. The slug is derived from the heading text and used as the element id.

```md
## Headings and anchors

`markdown-it-anchor` adds a permalink to every heading. The slug is derived from the heading text and used as the element id.

```md
## Section
```

Renders as `<h2 id="section">…</h2>`. The right rail table of contents uses these ids.

## Inline attributes

```md
This is a paragraph. {.important #my-id}
```

## Live components

```markdown
:::component {"component":"MarButton","props":{"label":"Save"},"height":"12em"}
:::
```

1. `component` alone suffices when one system is configured; `system` names it otherwise.

2. `story` selects a story file by its base name, `props` and `slots` travel base64 encoded into the frame, `height` sizes it, default `20em`.

3. `:::component MarButton` is the shorthand for the bare component with its default controls.

See [Component modules](/modules) for systems and the harness.

## Restyling the output

