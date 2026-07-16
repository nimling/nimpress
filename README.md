<div align="center">
  <img src="assets/logo.svg" alt="Nimpress" width="320" />

  <span><i>Svelte 5 docs framework with content driven routing, a custom markdown pipeline, and a built in OpenAPI renderer.</i></span>
</div>

## Getting started

Nimpress is published to GitHub Packages under `@nimling/nimpress`. Releases are cut through the same publish pipeline used by `samna-vue-components`.

### Authenticate against GitHub Packages

The consumer needs two files at the repo root so the package manager can reach `npm.pkg.github.com`.

`.npmrc`:

```
@nimling:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`.env`, gitignored, never committed:

```
NODE_AUTH_TOKEN=<a github personal access token with read:packages>
```

Install with either package manager:

```bash
pnpm add @nimling/nimpress
npm install @nimling/nimpress
```

For local work on Nimpress itself, link the working tree from the consumer:

```bash
pnpm add @nimling/nimpress@link:../nimpress
```

## Set up a site

A consumer needs one config file and the `nimpress` CLI. The CLI owns Vite, serves the app shell and entry as virtual modules, and reads `nimpress.config`. There is no Vite config to write and no app to mount by hand.

### Scaffold

```bash
pnpm exec nimpress init
```

This writes a starter `nimpress.config.ts` and a content folder.

### Configure

`nimpress.config.ts` at the repo root:

```ts
import { defineConfig } from '@nimling/nimpress/plugin'

export default defineConfig({
  title: 'Docs',
  logo: '/assets/logo.png',
  github: 'https://github.com/nimling/your-repo',
  contentDir: 'docs',
  assetsDir: 'assets',
  assetUrlBase: '/assets',
  css: 'app.css'
})
```

Every field has a default, so a config can be as small as a title.

1. `contentDir` holds the markdown and the images that sit next to it. Default `docs`.

2. `assetsDir` is the shared asset root, copied whole into the build and served at `assetUrlBase`. Default `assets` at `/assets`.

3. `css` names a site wide stylesheet loaded after the framework styles. A sibling `<name>.css` next to a `<name>.md` loads while that page and its subpages are open.

4. `exclude`, `banner`, `brand`, `footer`, `navRoutes`, and `site` tune the shell, theming, and SEO.

### Run

Wire the CLI into `package.json`:

```json
{
  "scripts": {
    "dev": "nimpress dev",
    "build": "nimpress build",
    "preview": "nimpress preview"
  }
}
```

## CLI

| Command | Description |
|---------|-------------|
| `nimpress init` | Scaffold config, content folder, and CLAUDE.md plus AGENTS.md pointing at the packaged AI rules |
| `nimpress dev` | Start the dev server, component harnesses included |
| `nimpress build` | Build the static site into `outDir`, default `dist`, harness bundles included |
| `nimpress preview` | Serve the built site |
| `nimpress lint` | Validate frontmatter and every import in content code files |
| `nimpress export [--target=]` | Collect pages marked with the `export:` frontmatter header for the docs pipeline |
| `nimpress modules import <system> [file]` | Import a component library or a single component, stories, argTypes, and schema.json included |
| `nimpress modules create <system> <Component>` | Scaffold a new component page with story and schema.json |
| `nimpress modules create --component=<ref> --schema` | Regenerate schema.json for one component from its types |
| `nimpress modules lint [system]` | Lint component pages: framework purity, schema presence, schema drift against stories and source |
| `nimpress modules story <system> [component]` | Write typed mock auto stories |
| `nimpress modules dev [system]` | Run component harness servers |
| `nimpress modules build [system]` | Build static harness bundles |

The full reference with flags and exit behavior lives in [docs/cli.md](./docs/cli.md). The packaged rules under `node_modules/@nimling/nimpress/.claude/rules/` are the working contract for AI agents in consumer repos; `nimpress init` links them from the project's `CLAUDE.md` and `AGENTS.md`.

## Working on Nimpress itself

| Command | Description |
|---------|-------------|
| `just install` | Install dependencies with pnpm |
| `just build` | Build the library bundle into `dist/` |
| `just check` | Run svelte-check and tsc |
| `just test` | Run the actions go tests, the CLI vitest suite, and the type checks |
| `just dev` | Run the linked consumer site |
| `just deploy` | Patch version bump, tag, and trigger the publish workflow |
| `just deploy-minor` | Minor version bump and publish |
| `just deploy-major` | Major version bump and publish |

## Concepts

Detailed guides live in [docs/](./docs/). Start there to learn the content model and renderers.

| Topic | Guide |
|-------|-------|
| CLI reference: every command, flag, and exit code | [docs/cli.md](./docs/cli.md) |
| Page types: `doc`, `openapi`, `changelog`, `hero`, `roadmap`, `component` | [docs/page-types.md](./docs/page-types.md) |
| Component workshop: systems, stories, harness, controls, import CLI | [docs/modules.md](./docs/modules.md) |
| Markdown support, callouts, actions, features | [docs/markdown.md](./docs/markdown.md) |
| Definition lists for compact term references | [docs/definition-lists.md](./docs/definition-lists.md) |
| Mermaid diagrams | [docs/mermaid.md](./docs/mermaid.md) |
| OpenAPI renderer | [docs/openapi.md](./docs/openapi.md) |
| Changelog renderer | [docs/changelog.md](./docs/changelog.md) |
| Hero landing pages | [docs/hero.md](./docs/hero.md) |
| SEO and social cards | [docs/seo.md](./docs/seo.md) |
| Build pipeline, shell and body split | [docs/build-pipeline.md](./docs/build-pipeline.md) |
| Relative links between pages | [docs/relative-links.md](./docs/relative-links.md) |
| Frontmatter reference | [docs/frontmatter.md](./docs/frontmatter.md) |
| Sidebar layout from the content tree | [docs/sidebar.md](./docs/sidebar.md) |
| Theming and overriding styles | [docs/theming.md](./docs/theming.md) |
| Auth, scope, and claim guards | [docs/auth.md](./docs/auth.md) |
| Search index | [docs/search.md](./docs/search.md) |
| Publishing docs to the central site, the sync actions, and their secrets | [docs/actions.md](./docs/actions.md) |

## Authoring docs with Claude

The package ships the authoring rules at `node_modules/@nimling/nimpress/.claude/rules/`. They cover how to write each page type: docs, changelog entries, hero pages, roadmap pages, and roadmap issues, plus frontmatter, file layout, and styling.

Claude does not auto load rules from inside `node_modules`. So in the repo that consumes Nimpress, add a pointer in your root `CLAUDE.md` so Claude can find them:

```md
## Nimpress docs authoring

When writing or editing markdown under the docs content directory, follow the Nimpress authoring rules in `node_modules/@nimling/nimpress/.claude/rules/`. Read the rule that matches the page type before writing:

- `docs-authoring.md`, `doc-pages.md`, `page-types.md`, `frontmatter.md`, `file-layout.md` for general pages
- `changelog-entries.md` for changelog entries
- `roadmap-entries.md` for roadmap pages and issue pages
- `component-modules.md` for component pages, stories, and the workshop
- `style.md` for theming and overrides
```

## Structure

```
nimpress/
├── assets/                 Logo and brand artwork
├── bin/nimpress.mjs        CLI entry
├── docs/                   Concept guides linked from the README
├── actions/                Cross repo docs sync GitHub Actions
├── src/
│   ├── index.ts            Public Svelte exports
│   ├── plugin.ts           Vite plugin and defineConfig
│   ├── cli.ts              CLI dispatch
│   ├── cli/                One module per command: init, lint, site, guard, export, modules
│   ├── config/             Config load, defaults, schema, Vite and html
│   ├── framework/          App bootstrap, router, stores
│   ├── layout/             Shell, header, sidebar, breadcrumbs, right TOC
│   ├── markdown/           Page, ChangelogPage, HeroPage, callouts, code blocks
│   ├── api/                OpenAPI renderer
│   ├── search/             MiniSearch wrapper and modal
│   ├── auth/               Session login guard
│   └── styles/             Tokens and preflight
├── tailwind.preset.ts      Design tokens exported for consumers
└── justfile                Task runner
```
