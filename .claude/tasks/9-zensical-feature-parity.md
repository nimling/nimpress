---
id: 9
parent:
relations: [1]
title: Feature parity with the zensical authoring surface, matched to what nimpress already has
type: Epic
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
The zensical authoring and setup surface was inventoried on 2026-09-03. nimpress already has most of it: five callouts, details, code groups, cards, a feature grid, action buttons, footnotes, task lists, attributes, anchors, mermaid, dbml, definition lists, copy buttons, breadcrumbs, back to top, a right rail, a header logo and github link, a footer line, brand colors, search with tag boosting, and per page css. The user chose to match what exists first and add the rest. Nothing adopts a dotted `features` flag array; every switch stays a nimpress config field or a frontmatter field, and the docs in epic 18 map each zensical flag to the nimpress field.

## Scope
The children touch the markdown pipeline in `src/plugin.ts`, the renderers under `src/markdown/`, the shell under `src/layout/`, the schema in `src/plugin.ts:140`, the config types in `src/types.ts:500`, and the rules. Every child also writes the docs page for its feature in the shape epic 18 sets, because the docs page and the feature are one change. Names stay nimpress names: callouts, actions, cards, features. Nothing is called admonitions. The changelog entry is `docs/changelog/v2.4.0.md`; each child adds one section.

## Order
1. nimpress: the children in id order, 10 to 17.
2. verify: `task.sh siblings 10`

## Done when
Every child is at review and `task.sh siblings 10` prints ALL READY FOR REVIEW.

## Summary
