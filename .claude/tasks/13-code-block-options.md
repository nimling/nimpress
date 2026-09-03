---
id: 13
parent: 9
relations: [24]
title: Code block title, line numbers, highlighted lines, and annotations
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:54Z
updated_at: 2026-09-03T11:36:19Z
questions: []
---

## Intent
Zensical code blocks take a title, line numbers from a start, highlighted lines, and annotations: numbered markers inside comments that open a rich tooltip. nimpress code fences carry a language label and a copy button. The fence info line gains those four options.

## Scope
`src/plugin.ts` the fence renderer that runs shiki at build time. `src/markdown/CodeBlock.svelte`. `src/styles/tokens.css` for the highlight and annotation tokens. `docs/extensions/markdown.md` code fences section until task 24 moves it. `docs/styling/prose.md`. `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: the info line after the language takes a JSON object the way `dbml` fences already do: `{"title":"main.ts","lines":true,"start":10,"highlight":"2-3,5"}`. `title` renders in the block header in place of the language label, the language stays as a small tag at the right. `lines` renders a line number column that the copy button excludes. `start` sets the first number. `highlight` marks the given lines with `np-code-line-highlight`.
2. nimpress: annotations. A comment ending with `(1)` inside the fence, in the comment syntax of the fence language, becomes a numbered marker `np-code-annotation` and the number is looked up in an ordered list written directly after the fence. Clicking the marker opens the list item as a `np-code-annotation-tip` beside the marker with the markdown of that item; the list itself is removed from the flow. A `!` after the parenthesis strips the comment characters around the marker. Only comment positions count; a `(1)` inside a string stays text.
3. nimpress: shiki output stays the source of highlighting; the options wrap its lines, they do not re-tokenize.
4. nimpress: write the code blocks section of `docs/extensions/markdown.md` in the docs shape with the zensical definition sentence, "Code blocks and examples are an essential part of technical project documentation", `## Usage` with `### Add a title`, `### Add annotations`, `### Strip comments`, `### Add line numbers`, `### Highlight specific lines`, each with a rendered example. Add the classes to `docs/styling/prose.md`. Write the `## Code block options` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and a fence with a title, line numbers, a highlighted line, and one annotation renders in `just dev`.

## Summary
