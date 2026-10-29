# Nimpress

A Svelte 5 documentation site framework and its cli, published public on npm as `@nimtech/nimpress` from a library mode Vite build: the site components and stores in `src/`, the Vite plugin in `src/plugin.ts`, the cli in `src/cli.ts` and `src/cli/`, the component workshop in `src/modules/`, the Go sync actions in `actions/`, and the Claude plugin with its mcp server in `.claude-plugin/` and `scripts/mcp.sh`. Its own documentation in `docs/` is built with nimpress and published to GitHub Pages on every version tag; `README.md` points there. `.claude/rules/` and `.claude/skills/nimpress/SKILL.md` ship inside the package, so consumers read the authoring rules from `node_modules/@nimtech/nimpress/.claude/rules/`.

## Commands

1. `just install`: `pnpm install` and the `sbump` binary.
2. `just build`: `vite build --mode library` into `dist/`. `just check`: `svelte-check` and `tsc`.
3. `just dev`: serves `docs/` against the built `dist/`, rebuilding the library on every source change; `NIMPRESS_CONSUMER=../other-site` points it at another site. Needs one `just build` first.
4. `just site`: `node bin/nimpress.mjs build`, this repo's `docs/` into `dist/site`, the same command the Pages workflow runs.
5. `just test`: the site build, the Playwright tests under `e2e/` through `scripts/serve-site.mjs`, the Go tests in `actions/`, vitest and the type check.
6. `just clean`.
7. `just deploy`, `just deploy-minor`, `just deploy-major`: sbump on `package.json`, tag and push, following the publish, pages and release-actions workflows. `just publish` is what the workflow runs, never a session.

## Conventions

1. Svelte 5 with runes only. No legacy `$:` reactivity, no Svelte 4 store syntax inside components. No React, no Vue, no React patterns rewritten as Svelte.
2. Public class names on rendered chrome and token names stay stable: add a token, never rename one; rename a class only across a major bump.
3. Heavy browser side renderers load through a dynamic import inside the component that owns them, never a static import from shared code; `mermaid` and `@xyflow/svelte` both follow this.
4. `src/dbml/erd.ts` is the only place the DBML mapping lives; `src/d2/` parses and lays out D2 with no D2 library. Commands exist only on the dev server: the static build swaps `@nimtech/nimpress/commands` for a source where `commandsEnabled` is false, and `getStaticCommandsLeak` fails the build when `postCommand` survives.
5. A release that changes a user visible surface carries its changelog entry in `docs/changelog/`, one file per release, in the same commit.
6. Every rule in `.claude/rules/` is read by consumers from the package, so it describes the authoring contract, never this checkout's state.
7. Code, files, git, stack and layout rules are `~/.claude/rules/` and are not restated here.

## Rules

Every file is read on every session and shipped in the package.

1. `.claude/rules/frontmatter.md`, `page-types.md`, `file-layout.md`, `doc-pages.md`: creating or editing any page.
2. `.claude/rules/docs-authoring.md`, `style.md`: prose, structure, the markdown surface, styling and theming.
3. `.claude/rules/component-modules.md`: component pages, stories, controls, the harness and the modules cli.
4. `.claude/rules/changelog-entries.md`, `roadmap-entries.md`, `dbml-pages.md`: those page types.
5. `.claude/rules/paths.md`: every folder nimpress writes and the cache root.
6. `.claude/rules/chunk-cycles.md`: a build failing on the `nimpress:chunk-cycle-guard` plugin.
7. `.claude/rules/docs-sync.md`: the docs sync pipeline, the consumer and receiver workflows, and how a repo is wired onto it.
8. `.claude/rules/deploy.md`: releasing `@nimtech/nimpress`, the steps and what the tag triggers.

## Skills

1. `.claude/skills/nimpress`: the cli, embedded in the package and the plugin; the one copy, installed at user level by `nimpress skill put`.
2. User level, invoked by name: `git`, `github`, `nimon`, `cli`, `review`.
