---
id: 4
parent: 1
relations: [25, 19]
title: The section type renders a folder index as a card grid of its children
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:36:20Z
questions: []
---

## Intent
Zensical builds every section index by hand from a card grid: "Grids are just perfect for building index pages that show a brief overview of a large section of your documentation." nimpress has `:::cards` but no page that lists a folder on its own. `type: section` is a folder `index.md` that renders its children as a card grid without an authored list.

## Scope
`src/types.ts` PageType. `src/plugin.ts` schema and the manifest so the renderer knows the children of a route. `src/markdown/SectionPage.svelte` new. `src/index.ts`. `docs/page-types/section.md`, `docs/page-types/index.md` and `docs/extensions/index.md` switched to the type as the worked examples, the rule files, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`. The `:::cards` directive and `Card.svelte` stay as they are.

## Order
1. nimpress: add `section` to `PageType` and the schema union. Lint requires the page to be a folder `index.md`.
2. nimpress: write `src/markdown/SectionPage.svelte`. It renders inside the doc shell. The markdown body renders first, then a `np-section-grid` of one card per direct child page of the folder, from the manifest, in sidebar order. A card carries the child `title`, the child `description`, and the child `sidebar.icon` or `icon` when set. Hidden and dev only pages follow their visibility. Reuse `Card.svelte` and `CardGroup.svelte` for the card markup so the grid and `:::cards` look the same.
3. nimpress: `data.columns` pins the column count the way `::::features` does; the default auto fits. `data.depth: 2` also lists grandchildren under a heading per child folder; the default is 1.
4. nimpress: dispatch it in the app template and export it.
5. nimpress: switch `docs/page-types/index.md` and `docs/extensions/index.md` to `type: section`, keeping their prose above the grid, so the docs use the type. Write `docs/page-types/section.md` in the docs shape: definition paragraph with the zensical sentence, `## Frontmatter`, `## What is listed`, `## Restyling`. Add the type to the rule files, the decision tree, and `docs/styling/page-types.md`. Write the `## Section pages` changelog section.
6. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and `/page-types` renders one card per page type doc in `just dev`.

## Summary
