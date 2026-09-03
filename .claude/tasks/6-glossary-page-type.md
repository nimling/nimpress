---
id: 6
parent: 1
relations: [25, 24]
title: The glossary type feeds abbreviation tooltips on every page from one definition list
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:36:18Z
questions: []
---

## Intent
Zensical: "Technical documentation often incurs the usage of many acronyms, which may need additional explanation, especially for new users of your project. For these matters, Zensical uses a combination of Markdown extensions to enable site-wide glossaries." Abbreviations are declared with `*[HTML]: Hyper Text Markup Language`, a central file feeds every page, and improved tooltips replace the browser title. nimpress has definition lists and no tooltips. `type: glossary` is the central file, and every page gets tooltips.

## Scope
`src/types.ts` PageType. `src/plugin.ts` schema, the markdown pipeline for abbreviations and link titles, the manifest for the glossary terms. `src/markdown/GlossaryPage.svelte` new. A `Tooltip.svelte` under `src/markdown/` for the hover surface. `src/index.ts`. `docs/page-types/glossary.md`, `docs/glossary.md` as this site's glossary, the rule files, `docs/styling/page-types.md` and `docs/styling/prose.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: add `glossary` to `PageType` and the schema union. The glossary page body is one definition list, `term` then `: description`, the shape `docs/extensions/definition-lists.md` documents. Lint requires the body to be a definition list and refuses a second glossary page in a site.
2. nimpress: the plugin collects the terms of the glossary page into the manifest. Every other page marks each whole word occurrence of a term with `<abbr class="np-abbr" title="...">` at build time, first occurrence per paragraph, never inside code, links, or headings.
3. nimpress: `*[TERM]: description` lines in any page declare a page local abbreviation with the same markup, through a `markdown-it` abbreviation plugin.
4. nimpress: improved tooltips. Every `abbr` with a title and every link with a markdown title, `[label](url "title")`, gets a `np-tooltip` on hover and on focus that replaces the browser title, positioned above the element and flipped below when there is no room. The tooltip is a small Svelte component mounted once by `Page.svelte` and driven by delegated events, not one instance per element. Footnote references get the same tooltip showing the footnote text.
5. nimpress: write `src/markdown/GlossaryPage.svelte`. It renders inside the doc shell with the rail and paints the definition list with an anchor per term, so `/glossary#term` deep links, and a letter index above the list when the list has more than twenty terms.
6. nimpress: write `docs/glossary.md` with the terms this site uses, and `docs/page-types/glossary.md` in the docs shape: definition paragraph with the zensical sentence, `## Frontmatter`, `## Usage` with `### Add a tooltip`, `### Add abbreviations`, `### Add a glossary`, `## Restyling`. Add the type to the rule files and the decision tree, the `np-abbr` and `np-tooltip` classes to `docs/styling/prose.md`, and the `## Glossary and tooltips` changelog section.
7. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and a term from `docs/glossary.md` shows a tooltip on hover on another page in `just dev`.

## Summary
