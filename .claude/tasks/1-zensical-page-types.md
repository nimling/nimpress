---
id: 1
parent:
relations: [9, 18]
title: Page types from the zensical review: fullpage, 404, section, tags, glossary, team, pricing
type: Epic
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:52Z
updated_at: 2026-09-03T11:36:20Z
questions: []
---

## Intent
zensical.org was reviewed on 2026-09-03 and the user chose seven page shapes nimpress lacks: a full page landing, a not found page, a folder index as a card grid, a tags listing, a glossary that feeds tooltips, a team grid, and a pricing page. A post type was dropped because the changelog collection already covers it. A proposal kind was dropped. Each child task ships one type end to end: schema, renderer, docs page, rule, and changelog section.

## Scope
Every child follows the same route through the repo. `PageType` in `src/types.ts:1`. `frontmatterSchema` and `frontmatterIssues` in `src/plugin.ts:140`. `jsonLdTypeFor` in `src/plugin.ts:1546`. The generated app template in `src/plugin.ts:2524` that imports the renderers and dispatches on `shell.type`. The renderer is one Svelte 5 file under `src/markdown/` named `<Type>Page.svelte`, exported from `src/index.ts`. The docs page is `docs/page-types/<type>.md` with an example under `docs/examples/` when the type needs data. The rule lines go into `.claude/rules/page-types.md`, `.claude/rules/frontmatter.md`, and the decision tree at the bottom of the page types rule. The public classes go into `docs/styling/page-types.md`. The changelog section goes into `docs/changelog/v2.4.0.md`, `data.version: 2.4.0`, `data.title: Seven new page types`, created by the first child that lands and extended by the rest with one heading per type.

## Order
1. nimpress: the children in id order, 2 to 8.
2. verify: `task.sh siblings 2`

## Done when
Every child is at review and `task.sh siblings 2` prints ALL READY FOR REVIEW.

## Summary
