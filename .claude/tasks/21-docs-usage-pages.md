---
id: 21
parent: 18
relations: []
title: One usage page per cli command
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:30:55Z
questions: []
---

## Intent
Zensical documents the cli as one page per command, each with a definition line, `## Usage`, and `## Options`. nimpress has one `cli.md`. The page splits into one page per command under `docs/usage/`.

## Scope
`docs/usage/index.md` from `cli.md`, and `docs/usage/init.md`, `dev.md`, `build.md`, `lint.md`, `export.md`, `guard.md`, `modules.md`, `skill.md`, `completion.md`. The `modules.md` page in usage covers the subcommands only; the workshop concepts stay in the setup modules page. The nimpress skill under `.claude/skills/nimpress/SKILL.md` is the source of truth for flags; read it and do not invent flags.

## Order
1. nimpress: `index.md` keeps the command map table and the exit behavior and ci sections, and opens with "The general command line syntax for nimpress is:" followed by the shape line from the skill.
2. nimpress: every command page has the definition paragraph, `## Usage` with the invocation and what it does in one paragraph, `## Options` as a table with the flag, the value form, and the description, and `## Troubleshooting` where the skill names a failure mode. `build.md` carries the clean build note: "If a build produces unexpected output, particularly after upgrading nimpress, run a clean build" with the cache folder from the paths rule.
3. nimpress: `modules.md` has one `## <subcommand>` per subcommand with usage and options, in the order the skill lists them.
4. nimpress: every `nimpress <command>` mention elsewhere in `docs/` links to its command page.
5. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and every command in `nimpress --help` has a page under `/usage`.

## Summary
