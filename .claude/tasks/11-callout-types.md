---
id: 11
parent: 9
relations: [24]
title: Twelve callout types with collapsible and custom title forms
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
Zensical ships twelve admonition types, a custom title, a collapsible form, a collapsed or expanded start, and an inline form beside a paragraph. nimpress ships five callouts, tip, note, warning, info, check, plus `:::details`. The set grows to the full twelve with the same names, and the callout gains the collapsible and inline forms. The word stays callout everywhere; nothing is called an admonition.

## Scope
`src/plugin.ts` the container registration around line 457. `src/markdown/Callout*.svelte`, one component per type or one `Callout.svelte` taking the type as a prop, whichever the existing five make simpler; if one component, the five files fold into it and the public `np-callout` classes stay. `src/styles/tokens.css` for the color tokens of the new types, light and dark. `docs/extensions/markdown.md` callouts section until task 24 moves it. `.claude/rules/docs-authoring.md` callouts section. `docs/styling/prose.md`. `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: register the seven new containers `abstract`, `success`, `question`, `failure`, `danger`, `bug`, `example`, and `quote`, beside the existing five. Each carries an icon and a color pair from tokens, light and dark. `check` stays as it is and is the nimpress name; `success` is its own type. The default title is the type name in sentence case; `:::note Custom title` overrides it; `:::note ""` removes the title row.
2. nimpress: a JSON payload on the opening line takes `collapsible`, `open`, and `inline` as `start` or `end`: `:::tip {"collapsible":true}` renders as a details element closed, `{"collapsible":true,"open":true}` starts expanded, `{"inline":"end"}` floats the callout beside the following block on wide viewports and stretches to full width below 800px. The callout must be declared before the block it sits beside.
3. nimpress: nested callouts work because the container plugin already nests; verify it and add a test page under `docs/examples/`.
4. nimpress: write the callouts section of `docs/extensions/markdown.md` in the docs shape with the zensical definition sentence reworded to the nimpress name: "Callouts, also known as admonitions, are an excellent choice for including side content without significantly interrupting the document flow." Usage has `### Change the title`, `### Remove the title`, `### Nested callouts`, `### Collapsible blocks`, `### Inline blocks`, `### Supported types` rendering all twelve. Update the callouts list in the docs authoring rule. Add the classes to `docs/styling/prose.md`. Write the `## Twelve callouts` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and the supported types section renders twelve distinct callouts in `just dev`.

## Summary
