<div align="center">
  <img src="assets/logo.svg" alt="Nimpress" width="320" />

  <span><i>Svelte 5 docs framework that supports it all.</i></span>
</div>

## Documentation

The full documentation is at **[nimling.github.io/nimpress](https://nimling.github.io/nimpress/)**. It is built from the `docs/` folder of this repository with nimpress itself and redeploys on every release, so it is always the current reference. This file stays short and points there.

| Topic | Guide |
|-------|-------|
| Getting started, config, first site | [Getting started](https://nimling.github.io/nimpress/getting-started) |
| CLI reference: every command, flag, and exit code | [CLI](https://nimling.github.io/nimpress/cli) |
| Page types: `doc`, `openapi`, `changelog`, `hero`, `roadmap`, `dbml`, `component` | [Page types](https://nimling.github.io/nimpress/page-types) |
| Component workshop: systems, stories, harness, controls, import CLI | [Modules](https://nimling.github.io/nimpress/modules) |
| Markdown support, callouts, actions, features | [Markdown](https://nimling.github.io/nimpress/markdown) |
| Definition lists for compact term references | [Definition lists](https://nimling.github.io/nimpress/definition-lists) |
| Mermaid diagrams | [Mermaid](https://nimling.github.io/nimpress/mermaid) |
| DBML database diagrams | [DBML](https://nimling.github.io/nimpress/dbml) |
| OpenAPI renderer | [OpenAPI](https://nimling.github.io/nimpress/openapi) |
| Changelog renderer | [Changelog renderer](https://nimling.github.io/nimpress/changelog-renderer) |
| Hero landing pages | [Hero](https://nimling.github.io/nimpress/hero) |
| SEO and social cards | [SEO](https://nimling.github.io/nimpress/seo) |
| Build pipeline, build outputs, shell and body split | [Build pipeline](https://nimling.github.io/nimpress/build-pipeline) |
| Relative links between pages | [Relative links](https://nimling.github.io/nimpress/relative-links) |
| Frontmatter reference | [Frontmatter](https://nimling.github.io/nimpress/frontmatter) |
| Sidebar layout from the content tree | [Sidebar](https://nimling.github.io/nimpress/sidebar) |
| Theming and overriding styles | [Theming](https://nimling.github.io/nimpress/theming) |
| Auth and the gate guard flow | [Auth](https://nimling.github.io/nimpress/auth) |
| Search index | [Search](https://nimling.github.io/nimpress/search) |
| Publishing docs to a central site, the sync actions, and their secrets | [Pipeline](https://nimling.github.io/nimpress/actions) |
| Every release | [Releases](https://nimling.github.io/nimpress/changelog/) |

## Getting started

```bash
pnpm add @nimtech/nimpress
```

`@nimtech/nimpress` is public on npm. No `.npmrc`, no registry line, no token. It just works.

## Set up a site

A consumer needs one config file and the `nimpress` CLI. The CLI owns Vite, serves the app shell and entry as virtual modules, and reads `nimpress.config`. There is no Vite config to write and no app to mount by hand.

```bash
pnpm exec nimpress init
```

That writes a starter `nimpress.config.ts` and a content folder:

```ts
import { defineConfig } from '@nimtech/nimpress/plugin'

export default defineConfig({
  title: 'Docs',
  logo: '/assets/logo.png',
  github: 'https://github.com/nimling/your-repo',
  contentDir: 'docs'
})
```

Every field has a default, so a config can be as small as a title. Wire the CLI into `package.json`:

```json
{
  "scripts": {
    "dev": "nimpress dev",
    "build": "nimpress build",
    "lint": "nimpress lint"
  }
}
```

The rest of the config surface, every command, and the build outputs are covered in [Getting started](https://nimling.github.io/nimpress/getting-started) and the [CLI reference](https://nimling.github.io/nimpress/cli).

## Authoring docs with Claude

The package ships the authoring rules at `node_modules/@nimtech/nimpress/.claude/rules/`. They cover how to write each page type: docs, changelog entries, hero pages, roadmap pages, roadmap issues, and dbml pages, plus frontmatter, file layout, and styling.

Claude does not auto load rules from inside `node_modules`, so `nimpress init` writes a `CLAUDE.md` and an `AGENTS.md` pointing at them. In a repo that adds nimpress by hand, add the pointer yourself:

```md
## Nimpress docs authoring

When writing or editing markdown under the docs content directory, follow the Nimpress authoring rules in `node_modules/@nimtech/nimpress/.claude/rules/`. Read the rule that matches the page type before writing:

- `docs-authoring.md`, `doc-pages.md`, `page-types.md`, `frontmatter.md`, `file-layout.md` for general pages
- `changelog-entries.md` for changelog entries
- `roadmap-entries.md` for roadmap pages and issue pages
- `dbml-pages.md` for database diagram pages and inline dbml fences
- `component-modules.md` for component pages, stories, and the workshop
- `style.md` for theming and overrides
```

## Working on Nimpress itself

| Command | Description |
|---------|-------------|
| `just install` | Install dependencies with pnpm |
| `just build` | Build the library bundle into `dist/` |
| `just check` | Run svelte-check and tsc |
| `just test` | Run the actions go tests, the CLI vitest suite, and the type checks |
| `just dev` | Serve this repo's `docs/` with a watching library rebuild |
| `just site` | Build this repo's `docs/` into `dist/site` |
| `just deploy` | Patch version bump, tag, and trigger the publish workflows |
| `just deploy-minor` | Minor version bump and publish |
| `just deploy-major` | Major version bump and publish |

A version tag publishes the package to npm, deploys `docs/` to GitHub Pages, and moves the major tag on the actions.

## Structure

```
nimpress/
├── assets/                 Logo and brand artwork
├── bin/nimpress.mjs        CLI entry
├── docs/                   The documentation site, built and published on every release
├── actions/                Cross repo docs sync GitHub Actions
├── src/
│   ├── index.ts            Public Svelte exports
│   ├── plugin.ts           Vite plugin and defineConfig
│   ├── cli.ts              CLI dispatch
│   ├── cli/                One module per command: init, lint, site, guard, export, modules
│   ├── config/             Config load, defaults, schema, Vite and html
│   ├── framework/          App bootstrap, router, stores
│   ├── layout/             Shell, header, sidebar, breadcrumbs, right TOC
│   ├── markdown/           Page, ChangelogPage, HeroPage, DbmlPage, callouts, code blocks
│   ├── api/                OpenAPI renderer
│   ├── dbml/               DBML to diagram model conversion, run at build time
│   ├── search/             MiniSearch wrapper and modal
│   ├── auth/               Session login guard
│   └── styles/             Tokens and preflight
├── tailwind.preset.ts      Design tokens exported for consumers
└── justfile                Task runner
```
