---
title: CLI reference
sidebar:
  name: Usage
  path: usage
description: Every nimpress command, its arguments, flags, and exit behavior.
tags: cli, lint, modules, build, guard, export
order: 8
---

The `nimpress` binary owns the whole site lifecycle: scaffolding, dev servers, linting, building, exporting, guarding, and the component workshop. Every command runs from the consumer repo root and reads `nimpress.config.ts`, `nimpress.config.js`, `nimpress.config.mjs`, or `nimpress.config.json`. Long value flags take their value with an equals sign, `--target=central`.

## Commands

One page per command sits under [Usage](/usage). Run `nimpress --help` for the same list in the terminal.


| Command | Description |
|---------|-------------|
| [`nimpress init`](/usage/init) | Scaffold a fully documented config, the content folder, and the agent guides |
| [`nimpress dev`](/usage/dev) | Run the site and every component harness |
| [`nimpress build`](/usage/build) | Emit the static site plus harness bundles |
| [`nimpress lint`](/usage/lint) | Validate structure, frontmatter, imports, and modules, then build to verify |
| [`nimpress export`](/usage/export) | Collect pages marked with the `export:` header into `.nimpress` |
| [`nimpress guard`](/usage/guard) | Map and apply the guarded bundle flow |
| [`nimpress modules <sub>`](/usage/modules) | The component workshop surface |
| [`nimpress skill`](/usage/skill) | Hand out and install the agent skill |
| [`nimpress completion`](/usage/completion) | Print or install the shell completion |

## paths

Every folder nimpress writes is set under one optional `paths` block in the config, and every field carries a default so the block is omittable.

1. `paths.out` is the build root, default `dist`.

2. `paths.cache` is the one cache root for every operation, default `node_modules/.nimpress`, layered per feature beneath it: `<cache>/site` for the docs vite cache, `<cache>/modules/<system>` for each harness cache, `<cache>/lint` for the lint verification build, and `<cache>/verify` as the scratch layer where agents and humans drop throwaway verification pages exercised through the running dev server, a layer nimpress itself never reads or writes. It sits under node_modules like vite's own cache, so nothing ephemeral appears at the repo root.

3. `paths.export` is where `export` collects pages, default `.nimpress`.

4. `paths.modules` is both the folder under `out` and the url route segment for the harness bundles, default `_components`, served at `/<modules>/<system>/`.

5. `paths.guarded` is both the folder under `out` and the url route prefix for guarded bundles, default `_guarded`, served at `/<guarded>/<bundle>/`. The prefix is written into `access.json` so the runtime and the guard provider agree.

## Exit behavior

1. Lint commands print every problem and exit 1 on failure, 0 on a clean pass.

2. Every other command throws a `[nimpress]` prefixed error on misuse and exits 1 through the bin wrapper.

## CI

The repo test suite covers the CLI commands with fixture repos under `test/`. `pnpm test` runs it, and the publish workflow runs it before every release build.
