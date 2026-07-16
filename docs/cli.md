---
title: CLI reference
description: Every nimpress command, its arguments, flags, and exit behavior.
tags: cli, lint, modules, build
---

The `nimpress` binary owns the whole site lifecycle: scaffolding, dev servers, linting, building, exporting, and the component workshop. Every command runs from the consumer repo root and reads `nimpress.config.ts`, `nimpress.config.js`, `nimpress.config.mjs`, or `nimpress.config.json`. Long value flags take their value with an equals sign, `--target=central`.

## Command map

| Command | Description |
|---------|-------------|
| `nimpress init` | Scaffold config, content folder, and the agent guides |
| `nimpress dev` | Run the site and every component harness |
| `nimpress build` | Emit the static site plus harness bundles |
| `nimpress preview` | Serve the built site |
| `nimpress lint` | Validate frontmatter and every import in content code files |
| `nimpress export` | Collect pages marked with the `export:` header |
| `nimpress guard` | Map and apply the gated artifact flow |
| `nimpress modules <sub>` | The component workshop surface |

## init

Writes `nimpress.config.json` when no config exists, seeds the content folder with a home page when it is empty, and writes `CLAUDE.md` and `AGENTS.md` pointing at the packaged AI rules under `node_modules/@nimling/nimpress/.claude/rules/`. Existing files are never overwritten.

## dev, build, preview

1. `dev` starts the docs vite server plus one harness server per configured system and prints the urls.

2. `build` emits the static site into `outDir`, default `dist`, then builds a static harness bundle per system into `dist/_components/<system>/`. Systems marked `devOnly` are skipped.

3. `preview` serves the output of a completed build.

## lint

Two passes over `contentDir`, both reported together, exit code 1 when anything fails.

1. Frontmatter: every markdown file parses and its frontmatter validates against the schema.

2. Imports: every `.ts`, `.tsx`, `.js`, `.mjs`, `.vue`, and `.svelte` file under the content tree has its static and dynamic imports checked. Relative imports must resolve on disk with the standard extensions. Alias imports resolve through the `vite.resolve.alias` block of the nimpress config. Any import of a `_shared` folder fails outright: stories are self contained and shared setup lives in a group harness component, never in a shared fixture folder.

```bash
nimpress lint
```

## export

Collects every page whose frontmatter carries `export: <target>` into an export tree for the docs sync pipeline, default `.nimpress-export`, rewriting component pages to package mode: the `export:` header and the `file:` override drop, and the package version from the repo `package.json` stamps in.

```bash
nimpress export --target=central --out=.nimpress-export
```

## guard

1. `guard map` hashes every file in the `_gated` build output and writes `guard-map.json` with the scope and claim per route, ready for upload.

2. `guard apply --map=<uploaded json>` writes the returned base url into `access.json` and removes the `_gated` tree from the dist.

## modules

The component workshop. Full concept guide in [Component modules](/modules).

| Subcommand | Description |
|------------|-------------|
| `modules init` | Ensure the modules folder and config block exist |
| `modules dev [system]` | Run harness servers |
| `modules build [system]` | Build static harness bundles |
| `modules lint [system]` | Lint component pages, stories, and schemas |
| `modules story <system> [component]` | Write typed mock auto stories |
| `modules import <system> [file]` | Import a library or one component |
| `modules create <system> <Component>` | Scaffold a component page |
| `modules create --component=<ref> --schema` | Regenerate one schema.json |

### modules lint

Checks every component page of the named system, or every system when none is named. Exit code 1 when anything fails.

1. Framework purity: a vue system rejects `svelteStory` and `.svelte` imports in stories, a svelte system rejects the inverse, and the component source file extension must match the system framework.

2. `schema.json` exists beside every `index.md` and parses as json.

3. Value story props all exist in `schema.json`. Stories carrying a `harness` field or a `render` function are exempt, their props feed the harness or the render function rather than the control tree.

4. `schema.json` matches what the component source parses to today. Drift reports the exact regenerate command.

```bash
nimpress modules lint
nimpress modules lint nimtech
```

### modules create with schema

`--component=<ref> --schema` regenerates `schema.json` for one existing component page from the component types. The ref is the component name when it is unique across systems, or the path to the component file when it is not.

```bash
nimpress modules create --component=MarButton --schema
nimpress modules create --component=src/components/MarButton/MarButton.vue --schema
```

## Exit behavior

1. Lint commands print every problem and exit 1 on failure, 0 on a clean pass.

2. Every other command throws a `[nimpress]` prefixed error on misuse and exits 1 through the bin wrapper.

## CI

The repo test suite covers the CLI commands with fixture repos under `test/`. `pnpm test` runs it, and the publish workflow runs it before every release build.
