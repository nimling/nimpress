---
id: 24
parent: 18
relations: [6, 11, 12, 13]
title: Authoring pages: callouts, buttons, code blocks, content tabs, data tables, diagrams, footnotes
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:36:19Z
questions: []
---

## Intent
The first half of the zensical Authoring section. `docs/extensions/markdown.md` splits into one page per feature: callouts, buttons, code blocks, content tabs, data tables, diagrams, footnotes. Each opens with the zensical definition sentence and keeps the nimpress directive names.

## Scope
`docs/authoring/callouts.md`, `buttons.md`, `code-blocks.md`, `content-tabs.md`, `data-tables.md`, `diagrams.md` from `extensions/mermaid.md`, `footnotes.md`, and `docs/authoring/markdown.md` reduced to the pipeline overview, headings and anchors, inline attributes, task lists, and the links to the split pages. Nothing under `src/`. The callouts, content tabs, and code block pages are written after tasks 11, 12, and 13 land.

## Order
1. nimpress: `markdown.md`: "Markdown is a lightweight markup language for authoring text such as technical documentation." Sections `## Linking between pages` with the relative link advice from `extensions/relative-links.md` folded in, `## Page title` with the title priority list for nimpress, `## Headings and anchors`, `## Inline attributes`, `## Task lists`.
2. nimpress: `callouts.md`: the sentence from task 11 with the nimpress name first. Usage `### Change the title`, `### Remove the title`, `### Nested callouts`, `### Collapsible blocks`, `### Inline blocks`, `### Supported types` rendering every type.
3. nimpress: `buttons.md`: "nimpress provides dedicated styles for primary and secondary buttons that can be added to any link, label or button element. This is especially useful for documents or landing pages with dedicated call-to-actions." Usage `### Add a button`, `### Add a primary button`, `### Add a button with an icon`, all through `:::actions` and its `variant` payload.
4. nimpress: `code-blocks.md`: "Code blocks and examples are an essential part of technical project documentation." Configuration covers shiki at build time and the theme. Usage `### Add a title`, `### Add annotations`, `### Strip comments`, `### Add line numbers`, `### Highlight specific lines`, `### Group code blocks` linking to content tabs, and the alias list.
5. nimpress: `content-tabs.md`: the sentence from task 12. Configuration `### Linked content tabs`. Usage `### Group code blocks`, `### Group other content`, `### Embed content`, `### Anchor links`.
6. nimpress: `data-tables.md`: "nimpress defines default styles for data tables – an excellent way of rendering tabular data in project documentation." Usage with the column alignment syntax. Customization is left out unless sortable tables exist.
7. nimpress: `diagrams.md`: "Diagrams help to communicate complex relationships and interconnections between different technical components, and are a great addition to project documentation." Usage `### Use flowcharts`, `### Use sequence diagrams`, `### Use state diagrams`, `### Use class diagrams`, `### Use entity-relationship diagrams` pointing at the dbml page as the better tool for a real schema, `### Other diagram types`.
8. nimpress: `footnotes.md`: "Footnotes are a great way to add supplemental or additional information to a specific word, phrase, or sentence without interrupting the flow of a document." Configuration `### Footnote tooltips` once task 6 has landed. Usage `### Adding footnote references`, `### Add footnote content`.
9. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and the eight pages sit under Authoring in the sidebar.

## Summary
