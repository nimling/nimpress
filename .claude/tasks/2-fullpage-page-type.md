---
id: 2
parent: 1
relations: []
title: The fullpage type renders the body edge to edge under the header with no sidebar and no rail
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:30:53Z
questions: []
---

## Intent
The zensical landing renders under the site header with no sidebar, no right rail, and no breadcrumbs. The title, the lead, and the buttons fill the viewport width and the sections below run free. The nimpress `hero` sits inside the doc shell with the sidebar and the content column, so a landing page of that shape cannot be built. `type: fullpage` is that page.

## Scope
`src/types.ts` PageType. `src/plugin.ts` frontmatterSchema, jsonLdTypeFor, the app template. `src/markdown/FullPage.svelte` new. `src/index.ts` export. `src/layout/App.svelte` only if the shell needs to know the type to drop the sidebar column. `docs/page-types/fullpage.md`, `docs/examples/fullpage.md`, `.claude/rules/page-types.md`, `.claude/rules/frontmatter.md`, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`. Do not touch `HeroPage.svelte`.

## Order
1. nimpress: add `fullpage` to `PageType` and to the `type` union in `frontmatterSchema`. `jsonLdTypeFor` returns `WebPage` for it, and the open graph type resolves to `website` the same way `hero` does at `src/plugin.ts:1575`.
2. nimpress: write `src/markdown/FullPage.svelte`. It renders the header of the shell and nothing else of the chrome: no sidebar, no breadcrumbs, no right rail, no back to top. The markdown body renders edge to edge in a `np-fullpage` root with a `np-fullpage-body` column that spans the viewport. The top band reads `data.eyebrow`, `data.tagline`, `data.lead`, `data.logo`, and `data.background` with the same field meanings the hero band uses, and the body follows with `:::actions`, `::::features`, and `:::cards` as the section blocks. A `data.width` of `content` narrows the body to `--np-content-max`; the default is the full viewport. Match the hero band typography from the tokens, no literal colors.
3. nimpress: dispatch it in the app template beside the `hero` branch, and export it from `src/index.ts`.
4. nimpress: write `docs/page-types/fullpage.md` in the docs shape: a definition paragraph that says what the page is and when to reach for it, then `## Frontmatter`, `## Band fields`, `## Body`, `## Where to use`, `## Restyling`. Write `docs/examples/fullpage.md` as a real `type: fullpage` page that shows the shape, listed in `docs/examples/index.md`.
5. nimpress: add the type to the rule files, the decision tree, and the page types table in `frontmatter.md`. Add the `np-fullpage` classes to `docs/styling/page-types.md`.
6. nimpress: create `docs/changelog/v2.4.0.md` if absent and write the `## Full pages` section.
7. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and `docs/examples/fullpage.md` renders with no sidebar and no rail in `just dev`.

## Summary
