---
title: modules
order: 7
tags: cli, modules
description: Every subcommand of the component workshop with its usage and options.
---

`nimpress modules` is the component workshop surface. Every subcommand takes `--system=<name>`, required only when several systems are configured. The concepts, the schema, the stories, and the harness are in [Component modules](/modules).

## init

```bash
nimpress modules init
```

Creates the modules folder and adds a `modules` block to `nimpress.config.json` when that file exists.

## dev

```bash
nimpress modules dev --system=nimtech
```

Serves the harness of the named system and never returns. `nimpress dev` starts them all beside the docs.

## build

```bash
nimpress modules build --system=nimtech
```

Builds the deployable harness bundle into `<out>/<paths.modules>/<system>/`. `nimpress build` runs it for every system whose visibility is not `dev-only`.

## lint

```bash
nimpress modules lint
nimpress modules lint --system=nimtech
```

Checks every component page of the named system, or every system when none is named, and exits 1 when anything fails: framework purity of stories and component files, at least one story per page, exactly one parseable schema file beside every `index.md`, value story props against the schema, and the schema structurally against the component source. Coaching warnings for undocumented props and opaque types print without failing the run.

## story

```bash
nimpress modules story
nimpress modules story MarButton --framework=vue
```

Writes `default.story.tsx` named `Default` beside every storyless component page, or for the one named component. `--framework=vue` or `--framework=svelte` overrides the framework the system declares.

## import

```bash
nimpress modules import --source=./src/components
nimpress modules import <file> --name=Button
nimpress modules import --stories=./stories --match='^Btn' --select
```

With a positional file, imports that one component and `--name=` sets the page name. With no file, walks `--source=` or the system source, mines the storybook files there and under `--stories=`, filters with `--match=<regex>`, and picks interactively with `--select`. Reimports upsert the schema and never clear authored content.

## create

```bash
nimpress modules create MarButton --framework=svelte
nimpress modules create --component=<ref> --schema
```

Scaffolds the component page folder with `index.md`, `default.story.tsx`, and the seeded `schema.json`. `--component=<ref> --schema` upserts one schema instead, and `--schema` is required in that form.

## update

```bash
nimpress modules update
nimpress modules update MarButton
nimpress modules update src/components/MarButton/MarButton.vue
```

Upserts every component schema from the component types, or one when a reference is named: new props, slots, and emits are added, a changed type shape refreshes, authored defaults, enums, descriptions, and mocks stay, and a member gone from the source stays flagged for the author. In `nimpress dev` it runs automatically when a component under a page changes.

## Options

| Option | Description |
|---|---|
| `--system=<name>` | The system, required when several are configured. |
| `--framework=<vue\|svelte>` | Override the framework of the system for `story` and `create`. |
| `--source=<folder>` | The component source root for `import`. |
| `--stories=<folder>` | Extra storybook files for `import`. |
| `--match=<regex>` | The component name filter for `import`. |
| `--select` | Pick components interactively in `import`. |
| `--name=<Component>` | The page name for a single file `import`. |
| `--component=<ref>` | The component for `create --schema` and `update`. |
| `--schema` | Upsert the schema in `create`. |
