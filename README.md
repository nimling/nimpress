<div align="center">
  <img src="assets/logo.svg" alt="Nimpress" width="320" />

  <span><i>Svelte 5 docs framework with content driven routing, custom markdown pipeline, and a built in OpenAPI renderer.</i></span>
</div>

## Getting Started

Nimpress is published to GitHub Packages under `@nimling/nimpress`. Releases are cut through the same publish pipeline used by `samna-vue-components`.

### Add to a consumer

The consumer needs two files at the repo root so the package manager can authenticate against `npm.pkg.github.com`.

`.npmrc`:

```
@nimling:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`.env` (gitignored, never committed):

```
NODE_AUTH_TOKEN=<a github personal access token with read:packages>
```

Install with either package manager:

```bash
# pnpm
pnpm add @nimling/nimpress

# npm
npm install @nimling/nimpress
```

For local development on Nimpress itself, link the working tree from the consumer:

```bash
pnpm add @nimling/nimpress@link:../nimpress
```

### Wire the Vite plugin

```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import nimpress from '@nimling/nimpress/plugin'

export default defineConfig({
  plugins: [
    svelte(),
    nimpress({ contentDir: 'docs' })
  ]
})
```

### Mount the app

```ts
import { createNimpressApp } from '@nimling/nimpress'
import manifest from 'virtual:nimpress/manifest'
import searchIndex from 'virtual:nimpress/search'
import pages from 'virtual:nimpress/pages'
import '@nimling/nimpress/style.css'

createNimpressApp({
  title: 'Docs',
  contentRoot: 'docs',
  authEndpoint: 'http://localhost:4202',
  clientSlug: 'docs',
  manifest,
  searchIndex,
  pageLoader: pages
}).mount(document.getElementById('app')!)
```

### Start developing

```bash
just install
just dev
```

## Commands

| Command | Description |
|---------|-------------|
| `just install` | Install dependencies with pnpm |
| `just build` | Build the library bundle into `dist/` |
| `just check` | Run svelte-check and tsc |
| `just dev` | Run the consumer site that links this package |
| `just deploy` | Patch version bump, tag, and trigger the publish workflow |
| `just deploy-minor` | Minor version bump and publish |
| `just deploy-major` | Major version bump and publish |

## Concepts

Detailed guides live in [docs/](./docs/). Start there to learn the content model and renderers.

| Topic | Guide |
|-------|-------|
| Page types: `doc`, `openapi`, `changelog`, `hero` | [docs/page-types.md](./docs/page-types.md) |
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

## Structure

```
nimpress/
├── assets/                 Logo and brand artwork
├── docs/                   Concept guides linked from the README
├── src/
│   ├── index.ts            Public Svelte exports
│   ├── plugin.ts           Vite plugin (separate entry)
│   ├── framework/          App bootstrap, router, stores
│   ├── layout/             Shell, header, sidebar, breadcrumbs, right TOC
│   ├── markdown/           Page, ChangelogPage, HeroPage, callouts, code blocks
│   ├── api/                OpenAPI renderer
│   ├── search/             MiniSearch wrapper and modal
│   ├── auth/               Session login guard
│   └── styles/             Tokens and preflight
├── tailwind.preset.ts      Design tokens exported for consumers
├── vite.config.ts          Library mode build with two entry points
└── justfile                Task runner
```
