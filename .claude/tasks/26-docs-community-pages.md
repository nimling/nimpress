---
id: 26
parent: 18
relations: []
title: Community pages: how we work, contribute, report a bug, request a change, pull requests
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:56Z
updated_at: 2026-09-03T11:30:56Z
questions: []
---

## Intent
The zensical Community section: how we work, contribute, report a bug, request a change, pull requests. nimpress has none. The pages are written for the nimpress repository and its release flow, in the zensical shape.

## Scope
`docs/community/index.md`, `how-we-work.md`, `contribute.md`, `report-a-bug.md`, `request-a-change.md`, `pull-requests.md`. Nothing under `src/`. Read `.claude/rules/deploy.md` and `.claude/contributing.md` if present for the actual flow; do not invent a process the repo does not run.

## Order
1. nimpress: `index.md` is the section page.
2. nimpress: `how-we-work.md`: "We build software with and for our users, shaping strategy, design, and implementation through continuous collaboration." Sections `## Process overview` with a mermaid flowchart of intent to task to review to release, `## Process steps`, `## Benefits` with `### Transparency`, `### Alignment of interests`, `### Influence`.
3. nimpress: `contribute.md`: the ways to contribute and where each goes, one section per way, linking the three pages below.
4. nimpress: `report-a-bug.md`: the sections zensical uses, `## Before creating an issue`, `## Issue template` with the fields title, description, reproduction, steps, browser, and before and after screenshots, `## Checklist`. Since the repository has issues disabled, name the channel that is used instead; if none is documented, say the report goes to the repository owner and stop there.
5. nimpress: `request-a-change.md`: `## Before creating an issue`, `## Issue template` with context, description, related links, use cases, visuals, `## Checklist`.
6. nimpress: `pull-requests.md`: "Learn how to create a pull request that is easy for maintainers to review", the fork and branch flow, the `just build`, `just check`, and `node bin/nimpress.mjs lint` gate, and the commit and release flow from `.claude/rules/deploy.md` in reader terms.
7. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and Community is the last section in the sidebar with five pages.

## Summary
