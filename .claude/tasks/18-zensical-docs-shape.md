---
id: 18
parent:
relations: [1]
title: The nimpress docs in the zensical shape: one page per feature, definition then Configuration, Usage, Customization
type: Epic
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
The zensical docs have six sections, Get started, Usage, Setup, Authoring, Compatibility, Community, and one page per feature. Every feature page has one skeleton: a definition paragraph saying what the thing is, why it matters in documentation, and what the tool provides, then `## Configuration`, `## Usage`, `## Customization`. Configuration sections end with "Add the following lines to your configuration:". Usage sections open with "When X is enabled" and carry one H3 per verb such as `### Add a button` or `### Hide the sidebars`. The user chose to write the nimpress docs in that shape and with those definition sentences, keeping nimpress names: callouts stay callouts, actions stay actions, cards and features stay, frontmatter stays one word, nothing is called an admonition. Adjectives and dashes in the zensical sentences are kept as quoted; the docs authoring rule gains one line allowing them in definition paragraphs.

## Scope
`docs/` only, plus `.claude/rules/docs-authoring.md` for the skeleton rule and `docs/changelog/v2.4.0.md` for one `## Docs in a new shape` section written by task 19. A docs page that describes a feature from epic 9 or a type from epic 1 is written when that feature has landed; the relations on each child name the feature task it waits for. A page whose feature has not landed is still written for the part nimpress already has, and the missing part is left out rather than described as coming.

## Order
1. nimpress: task 19 first, because it lays the folder tree every other child writes into.
2. nimpress: tasks 20 to 26 in id order.
3. verify: `task.sh siblings 19`

## Done when
Every child is at review and `node bin/nimpress.mjs lint` passes on the docs tree.

## Summary
