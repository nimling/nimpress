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
    "lint": "nimpress lint"
  }
}
```

## CLI

| Command | Description |
|---------|-------------|
| `nimpress init` | Scaffold config, content folder, and CLAUDE.md plus AGENTS.md pointing at the packaged AI rules |
| `nimpress dev` | Start the dev server, component harnesses included |
| `nimpress build` | Build the static site into `outDir`, default `dist`, harness bundles included |
| `nimpress lint` | Validate structure, frontmatter, imports, and modules, then build to verify |
| `nimpress export [--target=]` | Collect pages marked with the `export:` frontmatter header for the docs pipeline |
| `nimpress modules import [file]` | Import a component library or a single component, stories, argTypes, and schema.json included |
| `nimpress modules create <Component>` | Scaffold a new component page with `default.story.tsx` and schema.json |
| `nimpress modules create --component=<ref> --schema` | Regenerate schema.json for one component from its types |
| `nimpress modules lint [--system=]` | Lint component pages: framework purity, story presence, schema presence, schema drift against stories and source |
| `nimpress modules story [component]` | Write `default.story.tsx` for every storyless page |
| `nimpress modules dev [--system=]` | Run component harness servers |
| `nimpress modules build [--system=]` | Build static harness bundles |

The full reference with flags and exit behavior lives in [docs/cli.md](./docs/cli.md). The packaged rules under `node_modules/@nimling/nimpress/.claude/rules/` are the working contract for AI agents in consumer repos; `nimpress init` links them from the project's `CLAUDE.md` and `AGENTS.md`.

## Build outputs

`nimpress build` writes the static site into `outDir` plus a set of machine readable maps beside it: `access.json` and `guard.map.json` for the gate flow, described in [docs/auth.md](./docs/auth.md), one `rss.xml` per changelog collection carrying `rss: true` or `subscribe: true`, and `subscribe.map.json` describing every page whose effective frontmatter carries `subscribe: true`. The dev server serves `subscribe.map.json` and the feeds at the same urls.

`subscribe.map.json` is the full current state of the subscribable surface; comparing it against the previous release happens in the pipeline, not in the build. Its shape is stable:

```json
{
  "pages": [
    {
      "path": "/changelog",
      "title": "Changelog",
      "name": "changelog",
      "feed": "/changelog/rss.xml",
      "entries": [
        {
          "slug": "v1.2.0",
          "version": "1.2.0",
          "date": "2026-06-10T00:00:00.000Z",
          "title": "Faster builds",
          "description": "Build time cut in half.",
          "body": "The raw markdown body of the entry."
        }
      ]
    }
  ]
}
```

1. `path` is the page's effective route.

2. `title` is the page title.

3. `name` is the path with slashes turned to dashes and no leading dash, a friendly list name.

4. `feed` is the feed path exactly as the client computes it: `<path>/rss.xml`, prefixed with `/<paths.guarded>/<bundle>` when the page is gated.

5. `entries` is present when the page is a changelog collection, ordered newest first, hidden entries excluded, each carrying the entry slug, version, release date, title, description, and raw markdown body.

Pages are sorted by `path`. The file is always written, with an empty `pages` list when nothing is subscribable.

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
| Page types: `doc`, `openapi`, `changelog`, `hero`, `roadmap`, `dbml`, `component` | [docs/page-types.md](./docs/page-types.md) |
| Component workshop: systems, stories, harness, controls, import CLI | [docs/modules.md](./docs/modules.md) |
| Markdown support, callouts, actions, features | [docs/markdown.md](./docs/markdown.md) |
| Definition lists for compact term references | [docs/definition-lists.md](./docs/definition-lists.md) |
| Mermaid diagrams | [docs/mermaid.md](./docs/mermaid.md) |
| DBML database diagrams | [docs/dbml.md](./docs/dbml.md) |
| OpenAPI renderer | [docs/openapi.md](./docs/openapi.md) |
| Changelog renderer | [docs/changelog.md](./docs/changelog.md) |
| Hero landing pages | [docs/hero.md](./docs/hero.md) |
| SEO and social cards | [docs/seo.md](./docs/seo.md) |
| Build pipeline, shell and body split | [docs/build-pipeline.md](./docs/build-pipeline.md) |
| Relative links between pages | [docs/relative-links.md](./docs/relative-links.md) |
| Frontmatter reference | [docs/frontmatter.md](./docs/frontmatter.md) |
| Sidebar layout from the content tree | [docs/sidebar.md](./docs/sidebar.md) |
| Theming and overriding styles | [docs/theming.md](./docs/theming.md) |
| Auth and the gate guard flow | [docs/auth.md](./docs/auth.md) |
| Search index | [docs/search.md](./docs/search.md) |
| Publishing docs to the central site, the sync actions, and their secrets | [docs/actions.md](./docs/actions.md) |

## Authoring docs with Claude

The package ships the authoring rules at `node_modules/@nimling/nimpress/.claude/rules/`. They cover how to write each page type: docs, changelog entries, hero pages, roadmap pages, roadmap issues, and dbml pages, plus frontmatter, file layout, and styling.

Claude does not auto load rules from inside `node_modules`. So in the repo that consumes Nimpress, add a pointer in your root `CLAUDE.md` so Claude can find them:

```md
## Nimpress docs authoring

When writing or editing markdown under the docs content directory, follow the Nimpress authoring rules in `node_modules/@nimling/nimpress/.claude/rules/`. Read the rule that matches the page type before writing:

- `docs-authoring.md`, `doc-pages.md`, `page-types.md`, `frontmatter.md`, `file-layout.md` for general pages
- `changelog-entries.md` for changelog entries
- `roadmap-entries.md` for roadmap pages and issue pages
- `dbml-pages.md` for database diagram pages and inline dbml fences
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
│   ├── markdown/           Page, ChangelogPage, HeroPage, DbmlPage, callouts, code blocks
│   ├── api/                OpenAPI renderer
│   ├── dbml/               DBML to diagram model conversion, run at build time
│   ├── search/             MiniSearch wrapper and modal
│   ├── auth/               Session login guard
│   └── styles/             Tokens and preflight
├── tailwind.preset.ts      Design tokens exported for consumers
└── justfile                Task runner
```
