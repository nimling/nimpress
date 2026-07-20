---
title: CLI reference
description: Every nimpress command, its arguments, flags, and exit behavior.
tags: cli, lint, modules, build, guard, export
order: 5
sidebar:
  name: Core
---

The `nimpress` binary owns the whole site lifecycle: scaffolding, dev servers, linting, building, exporting, guarding, and the component workshop. Every command runs from the consumer repo root and reads `nimpress.config.ts`, `nimpress.config.js`, `nimpress.config.mjs`, or `nimpress.config.json`. Long value flags take their value with an equals sign, `--target=central`.

## Command map

| Command | Description |
|---------|-------------|
| `nimpress init` | Scaffold a fully documented config, the content folder, and the agent guides |
| `nimpress dev` | Run the site and every component harness |
| `nimpress build` | Emit the static site plus harness bundles |
| `nimpress lint` | Validate structure, frontmatter, imports, and modules, then build to verify |
| `nimpress export` | Collect pages marked with the `export:` header into `.nimpress` |
| `nimpress guard` | Map and apply the guarded bundle flow |
| `nimpress modules <sub>` | The component workshop surface |

## init

Writes `nimpress.config.ts` with every field documented in JSDoc and examples, uncommenting is the whole setup; `--json` writes `nimpress.config.json` instead, with a `$schema` reference to the packaged `config.schema.json` so editors show the same descriptions. Seeds the content folder with a home page when it is empty, and writes `CLAUDE.md` and `AGENTS.md` pointing at the packaged AI rules under `node_modules/@nimling/nimpress/.claude/rules/`. Existing files are never overwritten.

## dev and build

1. `dev` starts the docs vite server plus one harness server per configured system and prints the urls.

2. `build` emits the static site into `outDir`, default `dist`, then builds a static harness bundle per system into `dist/_components/<system>/`. Systems with `visibility: dev-only` are skipped. Gated pages land in `dist/_guarded/<bundle>/` with `access.json` and `guard.map.json` beside the site.

## lint

Four passes over `contentDir` reported together with file paths and fix explanations, then a verification build. Exit code 1 when anything fails.

1. Structure: folder and file naming, lowercase kebab case with PascalCase reserved for component and group folders, one `type: component` page per folder, changelog entries without `path`, stories and `schema.json` only beside a component page, page css only beside its page.

2. Frontmatter: every markdown file parses and its frontmatter validates against the schema.

3. Imports: every `.ts`, `.tsx`, `.js`, `.mjs`, `.vue`, and `.svelte` file under the content tree has its static and dynamic imports checked. Relative imports must resolve on disk with the standard extensions. Alias imports resolve through the `vite.resolve.alias` block of the nimpress config. Any import of a `_shared` folder fails outright: stories are self contained and shared setup lives in a group harness component.

4. Modules: the full `modules lint` pass over every system.

5. Build: when the content passes, lint builds the whole site to a throwaway folder and reports compile errors in the same format. `--no-build` skips this stage.

```bash
nimpress lint
nimpress lint --no-build
```

## export

Collects every page whose frontmatter carries `export: <target>` into an export tree for the docs sync pipeline, default `.nimpress`, rewriting component pages to package mode: the `export:` header and the `file:` override drop, and the package version from the repo `package.json` stamps in. This is the command the nimpress GitHub actions run for their export logic.

```bash
nimpress export --target=central
nimpress export --target=central --out=custom-folder
```

## guard

The build already constructs `dist/guard.map.json` through the `auth.guard` function; these commands finish the flow.

1. `guard map` enriches `guard.map.json` with one entry per file in `dist/_guarded/`: `sha256`, `size`, `mime`, its bundle, and the gates that bundle serves, ready for upload to the auth provider. `--dist=<dir>` targets another build folder, `--out=<path>` writes the map elsewhere.

2. `guard apply --map=<uploaded json>` writes the returned base url into `access.json` and removes the `_guarded` tree and `guard.map.json` from the dist, so the public bundle ships no gated content.

Full flow in [auth.md](/auth).

## modules

The component workshop. Full concept guide in [Component modules](/modules). Every subcommand takes `--system=<name>`, required only when several systems are configured.

| Subcommand | Description |
|------------|-------------|
| `modules init` | Ensure the modules folder and config block exist |
| `modules dev [--system=]` | Run harness servers |
| `modules build [--system=]` | Build static harness bundles |
| `modules lint [--system=]` | Lint component pages, stories, and schemas |
| `modules story [component]` | Write `default.story.tsx` for every storyless page |
| `modules import [file]` | Import a library or one component |
| `modules create <Component>` | Scaffold a component page |
| `modules update [component]` | Upsert schemas from the component types |

### modules story

Writes `default.story.tsx` with the name `Default` beside every storyless component page, or for one named component. Every component opens on the same entry story; richer scenarios sit beside it as further story files. The importer follows the same convention: a mined storybook story whose name equals the component itself lands as the Default story.

```bash
nimpress modules story
nimpress modules story MarButton
```

### modules lint

Checks every component page of the named system, or every system when none is named. Exit code 1 when anything fails.

1. Framework purity: a vue system rejects `svelteStory` and `.svelte` imports in stories, a svelte system rejects the inverse, and the component source file extension must match the system framework.

2. Every page carries at least one story. A storyless page reports the exact `modules story` command that fills it.

3. Exactly one schema file, `schema.json` or `schema.yml`, exists beside every `index.md` and parses.

4. Value story props all exist in the schema. Stories carrying a `harness` field or a `render` function are exempt, their props feed the harness or the render function rather than the control tree.

5. The schema holds structurally against the component source: every source prop, slot, and emit exists in the schema, schema members without a source counterpart are flagged, an authored type conflicting with the source type fails, and an authored enum must fit the source type and stay inside a source union. Authored narrowing, an enum over a plain string, is legal. A missing member reports the exact update command.

6. Coaching warnings, props without a description and opaque types, print without failing the run.

```bash
nimpress modules lint
nimpress modules lint --system=nimtech
```

### modules update

Upserts the schema from the component types, for one component page or every page when no component is named. New props, slots, and emits are added, a changed type shape refreshes on existing members, authored defaults, enums, descriptions, and mocks are never overwritten, an empty description fills from a JSDoc or line comment above the type member, and a member gone from the source stays in the file, flagged for the author to decide. `create --component=<ref> --schema` runs the same upsert for one page. In `nimpress dev` the upsert runs automatically when a component under a page changes.

```bash
nimpress modules update
nimpress modules update MarButton
nimpress modules update src/components/MarButton/MarButton.vue
```

## Exit behavior

1. Lint commands print every problem and exit 1 on failure, 0 on a clean pass.

2. Every other command throws a `[nimpress]` prefixed error on misuse and exits 1 through the bin wrapper.

## CI

The repo test suite covers the CLI commands with fixture repos under `test/`. `pnpm test` runs it, and the publish workflow runs it before every release build.
