---
id: 12
parent: 9
relations: [24]
title: Content tabs for any content, linked by label across the site
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
Zensical: "Sometimes, it's desirable to group alternative content under different tabs, e.g. when describing how to access an API from different languages or environments." Tabs hold any content, code blocks are the special case that renders without padding, each tab has an anchor, and tabs with the same label switch together across the whole site. nimpress has `:::code-group` for code fences only. A `:::tabs` directive holds any content, and `:::code-group` stays as the code special case built on it.

## Scope
`src/plugin.ts` container registration near line 492. `src/markdown/CodeGroup.svelte` and a new `Tabs.svelte` that CodeGroup composes. `src/framework/stores` for the linked tab label store persisted in localStorage. `docs/extensions/markdown.md` until task 24 moves it. `docs/styling/prose.md`. `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: register `:::tabs` as an outer container and `::tab Label` as the item marker inside it, so any markdown, including callouts, code fences, lists, and nested tabs, sits inside a tab. Pick the marker syntax that the existing container plugin parses without a second plugin; a JSON payload on `:::tabs` takes `linked: true`.
2. nimpress: write `src/markdown/Tabs.svelte`: a `np-tabs` root, a `np-tabs-list` of buttons with the labels, a `np-tabs-panel` per tab, keyboard arrows moving between tabs, and an anchor id per tab derived from the label so `#tab-python` selects it on load.
3. nimpress: `CodeGroup.svelte` renders through `Tabs.svelte` with a `np-tabs-code` modifier that removes the panel padding, so one component owns tab behavior.
4. nimpress: linked tabs. A `tabs` config field, `tabs: { linked: true }`, links every tab group on the site by label: clicking `Python` in one group selects `Python` in every group that has that label, on the same page and on every later page through localStorage. Add the field to `NimpressUserConfig` with a doc comment.
5. nimpress: write the content tabs section of `docs/extensions/markdown.md` in the docs shape with the zensical definition sentence, `## Configuration` for linked tabs ending with "Add the following lines to your configuration:", `## Usage` with `### Group code blocks`, `### Group other content`, `### Embed content`, `### Anchor links`. Add the classes to `docs/styling/prose.md`. Write the `## Content tabs` changelog section.
6. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and a tab group with a callout inside a tab renders and switches in `just dev`.

## Summary
