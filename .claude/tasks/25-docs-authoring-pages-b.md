---
id: 25
parent: 18
relations: [6, 10, 16, 17, 4]
title: Authoring pages: formatting, grids, icons and emojis, images, lists, tooltips, math, frontmatter, definition lists, dbml, openapi
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:36:20Z
questions: []
---

## Intent
The second half of the zensical Authoring section: formatting, grids, icons and emojis, images, lists, tooltips, math, and the rewritten frontmatter, definition lists, dbml, and openapi pages. Each opens with the zensical definition sentence and keeps nimpress names.

## Scope
`docs/authoring/formatting.md`, `grids.md`, `icons-emojis.md`, `images.md`, `lists.md`, `tooltips.md`, `math.md`, and the rewritten `frontmatter.md`, `definition-lists.md`, `dbml.md`, `openapi.md`. Nothing under `src/`. Formatting and images follow task 16, icons and math follow task 17, tooltips follows task 6, frontmatter follows task 10.

## Order
1. nimpress: `formatting.md`: "nimpress provides support for several HTML elements that can be used to highlight sections of a document or apply specific formatting." Usage `### Highlight text`, `### Sub- and superscripts`, `### Add keyboard keys`.
2. nimpress: `grids.md`: "nimpress supports arranging sections into grids, grouping blocks that convey similar meaning or are of equal importance. Grids are just perfect for building index pages that show a brief overview of a large section of your documentation." Usage `### Use card grids` for `:::cards`, `### Use feature grids` for `::::features`, `### Use section pages` linking to the section type once task 4 has landed.
3. nimpress: `icons-emojis.md`: the zensical sentence with the count replaced by the lucide count. Usage `### Use emojis`, `### Use icons`, `### with colors`, `### with animations`. Customization `### Additional icons`.
4. nimpress: `images.md`: "While images are first-class citizens of Markdown and part of the core syntax, it can be difficult to work with them. nimpress makes working with images more comfortable, providing styles for image alignment and image captions." Usage `### Image alignment`, `### Image captions`, `### Image lazy-loading`, `### Light and dark mode`, `### Lightbox and zoom`, plus the asset path rules from the file layout rule.
5. nimpress: `lists.md`: "nimpress supports several flavors of lists that cater to different use cases." Usage `### Use unordered lists`, `### Use ordered lists`, `### Use definition lists` linking to the definition lists page, `### Use task lists`.
6. nimpress: `tooltips.md`: the sentence from task 6. Configuration `### Improved tooltips`. Usage `### Add a tooltip`, `### Add abbreviations`, `### Add a glossary` linking to the glossary type.
7. nimpress: `math.md`: "KaTeX is a lightweight library that focuses on speed and simplicity." Usage `### Use block syntax`, `### Use inline block syntax`.
8. nimpress: `frontmatter.md`: "nimpress supports the inclusion of metadata in the frontmatter of a markdown file that is stripped from the file contents before the rest of the content is handed over to the markdown parser." Keep the field table, then `## Page title`, `## Page description`, `## Page icon`, `## Page status`, `## Hide page elements` with the value table, `## Tags`, `## Gating`, `## SEO and social cards`.
9. nimpress: `definition-lists.md`, `dbml.md`, `openapi.md` keep their content and take the skeleton with a definition paragraph each.
10. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and the eleven pages sit under Authoring in the sidebar.

## Summary
