---
name: nimpress
description: Drive the nimpress documentation site cli from the terminal. Use when scaffolding a docs site, running or building it, linting content and frontmatter, managing the component workshop with schemas stories and harnesses, exporting pages for the docs sync pipeline, previewing a repo's export folder inside the central docs site, wiring gated pages to the auth provider, or installing this skill, the Claude Code plugin with its mcp server, and shell completion.
---

# nimpress

`nimpress` is the cli of `@nimtech/nimpress`, a Svelte 5 documentation site framework. It scaffolds a site, serves it, builds it, lints the content, drives the component workshop, collects pages for the central docs site, previews them inside that site, and wires gated pages to the auth provider. Every command runs from the repo root of the site it acts on.

## Boundaries

1. The cli acts on the current working directory. There is no target flag and no remote mode. Change directory into the site before running anything. `view` is the one command that reaches another repo, the central docs site, and it does so through a cache clone it owns.

2. Every command except `init`, `skill`, `plugin`, `mcp`, `completion`, `view`, and `cache clear` loads the site config first. A missing or broken `nimpress.config.ts` or `nimpress.config.json` fails the command before it starts, so `nimpress init` is what a bare folder runs first. `view` and `cache clear` run from any repo the docs sync pipeline publishes, config or not.

3. `nimpress` writes only into the folders the `paths` config block declares. It never writes into the repo root beyond the config, the content folder, `CLAUDE.md`, `AGENTS.md`, and a temporary `index.html` that the build removes. Outside the repo it writes `~/.nimpress` for the links `view` resolves and `~/.tide/nimpress/sites/` for the docs site clones, and nothing else.

4. The authoritative authoring rules ship inside the package at `node_modules/@nimtech/nimpress/.claude/rules/`. Read the rule before writing content, never guess the frontmatter contract from a rendered page.

## Shape of every command

```
nimpress <command> [subcommand] [positional] [--flag] [--flag=value]
```

With no arguments the cli runs `dev`. An unrecognised command fails with `[nimpress] unknown command: <name>`. Boolean flags are the bare `--name`. Value flags are always `--name=value`, never `--name value`. Positional arguments are the words that do not start with `--`.

## Commands

### init

```sh
nimpress init
nimpress init --json
```

Writes `nimpress.config.ts` with every field documented and commented out, or `nimpress.config.json` with `--json`, and only when neither file already exists. Creates the content folder with an `index.md` when the folder is missing or empty. Writes `CLAUDE.md` and `AGENTS.md` when they are missing, each pointing at the packaged rules.

### dev

```sh
nimpress dev
nimpress dev --view
```

Serves the site and starts one harness server for every configured component system. It stays running and binds the vite cli shortcuts. `--view` serves the central docs site this repo publishes into instead, with the exported pages in place, the same run as `view` below.

### build

```sh
nimpress build
```

Builds the static site into `paths.out`, then builds the harness bundle of every system whose `visibility` is not `dev-only`.

### lint

```sh
nimpress lint
nimpress lint --no-build
```

Runs the structure check, the frontmatter check, the import check, and the modules check, then builds into `<cache>/lint` to prove the output compiles and removes that folder afterwards. `--no-build` stops after the checks. A clean run prints `nimpress lint: structure, frontmatter, imports, and modules ok` and then `nimpress lint: build ok, everything passes`. Any problem prints one line per problem and exits 1.

### modules

The component workshop. `--system=<name>` names the system when several are configured, and is optional when exactly one is.

```sh
nimpress modules init
nimpress modules dev --system=nimtech
nimpress modules build --system=nimtech
nimpress modules lint --system=nimtech
nimpress modules story <Component> --system=nimtech --framework=vue
nimpress modules import <file> --system=nimtech --name=Button --source=./src/components --stories=./stories --match='^Btn' --from-stories --select
nimpress modules create <Component> --system=nimtech --framework=svelte
nimpress modules create --component=<ref> --schema
nimpress modules update <ref> --component=<ref> --system=nimtech
```

1. `init` creates the modules folder and adds a `modules` block to `nimpress.config.json` when that file exists.

2. `dev` serves the harnesses and never returns. `build` builds the deployable harness bundles.

3. `lint` checks the systems, the schemas, and the stories, and is the check to run after touching a component page.

4. `story` with a component name writes one auto story, and with no name writes an auto story for every component of the system. `--framework=vue` or `--framework=svelte` overrides the framework the system declares.

5. `import` with a positional file imports that one component, and `--name=` sets the page name. With no file it walks `--source=` or the system source, picks up `.stories.ts` files there and under `--stories=`, filters names with the `--match=` regular expression, and asks which components to take with `--select`. `--from-stories` takes the component list from the csf files and requires `--stories=`.

6. `create <Component>` creates the component page folder. `create --component=<ref> --schema` upserts a single schema instead, and `--schema` is required in that form.

7. `update` upserts every component schema from the component types, adding new members without touching authored defaults, enums, or descriptions. A positional reference or `--component=<ref>` limits it to one component.

### export

```sh
nimpress export --target=<name>
nimpress export --target=<name> --out=.nimpress
```

Copies every page carrying `export: <name>` in its frontmatter, together with the whole folder that page sits in, into `paths.export`. A page with `export: true` is taken by every target. The `export:` and `file:` frontmatter lines are stripped and a `version:` line is written from the `version` field of `package.json` when the page carries a `package:` field. `--out=` overrides the destination.

### view

```sh
nimpress view
nimpress view --no-browser
nimpress view --docs-repo=<owner/repo>
nimpress view --export-dir=<folder> --target=<name>
nimpress view --offline
nimpress dev --view
```

Serves the central docs site this repo publishes into with the repo's export folder overlaid at its mapped path, and opens the browser on those pages. It needs no config in the repo. The docs site is read from the `docs-notify` step of the workflows under `.github/workflows/`, `docs-repo` and `export-dir`, one link per site when several name one; where none does, the command asks for the repo url, http or ssh, and `--docs-repo=` answers it up front. A connection that is refused leads to a login through `gh` when installed, else by naming the ssh key. Links and the login method persist in `~/.nimpress`, so the question is asked once per repo. The site is cloned under `~/.tide/nimpress/sites/<owner>__<repo>/`, fetched on every run unless `--offline`, and `pnpm install` runs there on first use and on a lockfile change. The mapped path is `nimpress.sources.json` merged with the receiver's `defaults`, the source winning per field. A repo with its own config runs `export` in watch mode underneath; `nimpress dev --view` is the same run from there. `--no-browser` prints the url instead of opening it, `--export-dir=` names the export folder when no workflow does, and `--target=` limits the export to one target name.

### cache

```sh
nimpress cache clear
nimpress cache clear --links
nimpress cache clear --sites
nimpress cache clear --local
```

`clear` with no flag removes the links in `~/.nimpress` and the docs site clones under `~/.tide/nimpress/sites/`, so the next `view` resolves and clones afresh. `--links` and `--sites` take one of the two. `--local` removes `paths.cache` of the current repo and needs a config there.

### guard

```sh
nimpress guard map --dist=dist --out=guard.map.json
nimpress guard apply --dist=dist --map=uploaded.json
```

Both read `access.json` from the build folder and fail with `[nimpress] guard: <path>/access.json not found, run a build first` when there is none. `--dist=` overrides `paths.out`.

1. `map` walks the guarded folder, records the path, the sha256, the size, the mime type, and the gates of every file, and writes the mapping. `--out=` names the file instead of `<dist>/guard.map.json`.

2. `apply` reads the mapping the asset host returned, requires `--map=`, writes the base url and the published asset list back into `access.json`, and removes both the guarded folder and `guard.map.json` from the build.

### seo

```sh
nimpress seo
nimpress seo --write
nimpress seo --out=reports/seo.json
```

Prints one line per page with the route, the keyword count, the description length, whether the robots directive carries `noai`, and whether the values are authored or generated, and writes the full set to `seo.map.json`. `--write` puts the generated keywords and description into each page's frontmatter under `meta`, only where the page has none. `--out=` names the map file.

### skill

```sh
nimpress skill get
nimpress skill put
nimpress skill put --project
```

`get` prints this document. `put` writes it to `~/.claude/skills/nimpress/SKILL.md`, or to `.claude/skills/nimpress/SKILL.md` under the current directory with `--project`, and prints the path it wrote.

### plugin

```sh
nimpress plugin put
nimpress plugin put --project
```

`put` runs `claude plugin marketplace add nimling/nimpress` and `claude plugin install nimpress@nimpress`, at user scope, or at project scope with `--project`. The plugin carries this skill and the nimpress mcp server. It fails when the `claude` cli is missing or either step exits non zero.

### mcp

```sh
nimpress mcp
```

Serves every command as a tool over the model context protocol on stdio. The plugin starts it; nothing else does. Tools are named after the command path with underscores, `lint`, `modules_update`, `guard_map`, and take `args` for positionals, `flags` by flag name without the dashes, and `cwd` relative to the project root. `dev`, `view`, and `modules_dev` keep running and return their pid with the first output; `stop` ends one by pid. `skill`, `plugin`, `mcp`, and `completion` are not tools.

### completion

```sh
nimpress completion zsh
nimpress completion --auto
nimpress completion --auto --skill
nimpress completion bash --auto
```

With a shell name and no `--auto` it prints the script for `bash`, `zsh`, `fish`, or `powershell` to stdout. `--auto` detects the shell from `$SHELL` when none is named, writes a nimpress owned file under `~/.config/nimpress/completions`, and points the rc file at it inside a block delimited by `# >>> nimpress completion >>>` and `# <<< nimpress completion <<<`. Rerunning `--auto` rewrites the block in place. fish is written to `~/.config/fish/completions/nimpress.fish` and needs no rc change. `--skill` installs this skill globally in the same step and only works alongside `--auto`.

## Where files land

The `paths` config block declares every folder nimpress writes, each with a default.

| Field | Default | What it holds |
| --- | --- | --- |
| `paths.out` | `dist` | the build root, build artifacts only |
| `paths.cache` | `node_modules/.nimpress` | the one cache root, layered per feature |
| `paths.export` | `.nimpress` | the handoff folder `export` fills |
| `paths.modules` | `_components` | the harness bundles under `out` and their url segment |
| `paths.guarded` | `_guarded` | the guarded pages under `out` and their url segment |

The cache is layered: `<cache>/site` for the docs vite cache, `<cache>/modules/<system>` for each harness, `<cache>/lint` for the lint verification build which is removed when lint finishes, and `<cache>/verify` as the one sanctioned scratch layer for throwaway verification pages. Never write ephemeral files anywhere else, and never commit anything from the cache root.

## The packaged rules

Read the rule before writing content. They live at `node_modules/@nimtech/nimpress/.claude/rules/`.

1. `frontmatter.md` and `page-types.md` before creating or editing any page.

2. `docs-authoring.md` and `style.md` for prose, structure, and markdown surface.

3. `component-modules.md` before touching component pages, stories, controls, or the modules commands.

4. `changelog-entries.md`, `roadmap-entries.md`, and `dbml-pages.md` for those page types.

5. `docs-sync.md` and `deploy.md` for the publishing flows and the export header.

6. `file-layout.md` and `doc-pages.md` for where files go, and `paths.md` for every folder nimpress writes.

7. `chunk-cycles.md` when a build fails on the `nimpress:chunk-cycle-guard` plugin, which every build and therefore `nimpress lint` runs over the emitted bundle.

## Recipes

Stand a new site up and prove it builds:

```sh
nimpress init
nimpress lint
nimpress build
```

Take a component library into the workshop and keep the schemas current:

```sh
nimpress modules init
nimpress modules import --system=nimtech --source=./src/components
nimpress modules update --system=nimtech
nimpress modules lint --system=nimtech
```

Publish a repo's pages into the central docs site:

```sh
nimpress export --target=nimployer
```

See those pages inside the central docs site before the tag:

```sh
nimpress view
```

Ship a gated build:

```sh
nimpress build
nimpress guard map
nimpress guard apply --map=uploaded.json
```

Install the skill and completion on a fresh machine:

```sh
nimpress completion --auto --skill
```

## Failure reading

1. `[nimpress] unknown command: <name>` means the first word is not one of `init`, `lint`, `dev`, `build`, `guard`, `modules`, `export`, `skill`, `plugin`, `mcp`, `completion`, `seo`, `view`, `cache`.

2. `[nimpress] modules <sub>: several systems configured` means the config declares more than one system and the command needs `--system=<name>`.

3. `[nimpress] modules import --from-stories requires --stories=<csf dir>` and `[nimpress] modules create --component expects --schema to upsert the schema` both name the flag that was missing. The message states the required flag by name.

4. `[nimpress] guard: <path>/access.json not found, run a build first` means the guard commands ran before `nimpress build`, or against the wrong `--dist=`.

5. A lint failure prints `nimpress lint failed with <n> problems` and then one line per problem, each naming the file relative to the content folder and what to change. Fix the file the line names, never the checker.

6. A build problem inside `nimpress lint` is reported one line per message prefixed with `build:`. It is the same failure `nimpress build` gives, caught before the real output folder is touched.
