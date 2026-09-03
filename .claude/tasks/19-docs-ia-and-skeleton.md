---
id: 19
parent: 18
relations: [4]
title: The docs folder tree and the page skeleton rule
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
The docs tree takes the zensical sections and every page takes the zensical skeleton. This task moves the tree and writes the rule; the sibling tasks fill the pages.

## Scope
`docs/` folder layout, every `order` field, every moved page's `path` field, `docs/index.md` feature grid links, `.claude/rules/docs-authoring.md`, `.claude/rules/file-layout.md` if the section list there changes, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: lay the tree. `docs/get-started/` holds `getting-started.md` as `index.md`, plus the four pages task 20 writes. `docs/usage/` holds the command pages task 21 writes, with `cli.md` as its `index.md`. `docs/setup/` holds `sidebar.md`, `search.md`, `seo.md`, `theming.md`, `auth.md`, `build-pipeline.md`, `actions.md`, `modules.md`, and the pages tasks 22 and 23 write. `docs/authoring/` holds `frontmatter.md`, everything now under `docs/extensions/`, and the pages tasks 24 and 25 write. `docs/page-types/` stays. `docs/examples/` stays. `docs/styling/` stays. `docs/community/` is created by task 26. Every moved page keeps its url through `path` set to the current route, so no link on the site or in a consumer repo breaks. Move with `mv`, never `git mv`.
2. nimpress: every section folder gets an `index.md` with a definition paragraph and, once task 4 has landed, `type: section`; until then a `:::cards` list of its pages. Set `order` so the sidebar reads Get started, Usage, Setup, Authoring, Page types, Examples, Styling, Community.
3. nimpress: write the skeleton into `.claude/rules/docs-authoring.md` as a new `## Page skeleton` section: the definition paragraph, `## Configuration` with one H3 per option ending with "Add the following lines to your configuration:", `## Usage` with one H3 per verb opening with "When X is enabled" where a switch exists, `## Customization` with one H3 per override, and `## Restyling` last on pages that render chrome. Add the line that a definition paragraph quoted from a reference may keep its adjectives and dashes. Add the naming line: callouts, actions, cards, features, frontmatter, never admonitions.
4. nimpress: fix every link the move touched, including `docs/index.md`, the rule files under `.claude/rules/` that link to `nimling.github.io/nimpress/...` pages, and `README.md` if it links into the docs. Run lint to catch the rest.
5. nimpress: write the `## Docs in a new shape` changelog section, one paragraph.
6. verify: `node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and every url that existed before the move still resolves in `just dev`.

## Summary
