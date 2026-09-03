---
id: 7
parent: 1
relations: []
title: The team type renders a person grid from frontmatter data
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
The zensical Team page is a person grid: a photo, a name as a heading with its own anchor, a role, and links. nimpress has no person surface. `type: team` renders that grid from frontmatter data.

## Scope
`src/types.ts` PageType. `src/plugin.ts` schema with a `data.members` array validated per member. `src/markdown/TeamPage.svelte` new. `src/index.ts`. `docs/page-types/team.md`, `docs/examples/team.md`, the rule files, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: add `team` to `PageType` and the schema union. `data.members` is required, an array of objects with `name` required, `role`, `image`, `bio` as one markdown paragraph, and `links` as an array of `{ text, link }`. Lint fails a member without a name.
2. nimpress: write `src/markdown/TeamPage.svelte`. It renders inside the doc shell with the rail. The body renders first, then a `np-team-grid` of `np-team-member` cards: image or a monogram fallback, the name as an H2 with an anchor so the rail lists every person, the role, the bio, the links as a `np-team-links` row. `data.columns` pins the count; the default auto fits from two to four.
3. nimpress: `data.align` of `start` or `center` sets the card text alignment; default `start`.
4. nimpress: dispatch and export.
5. nimpress: write `docs/examples/team.md` with three placeholder members and `docs/page-types/team.md` in the docs shape: definition paragraph, `## Frontmatter`, `## Member fields` as a table, `## Restyling`. Add the type to the rule files and the decision tree, the classes to `docs/styling/page-types.md`, and the `## Team pages` changelog section.
6. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and `/examples/team` renders three cards with the rail listing three names.

## Summary
