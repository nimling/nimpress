# nimpress

Svelte 5 docs framework. Anthropic styling, content-driven routing, custom markdown pipeline, OpenAPI renderer with hash deep links, local search, and samna_auth session login.

Status: unpublished. Consumed by sibling repos via `link:../nimpress`.

## Install in a consumer

```jsonc
{
  "dependencies": {
    "@nimling/nimpress": "link:../nimpress"
  }
}
```

## Use

```ts
import { createNimpressApp } from '@nimling/nimpress'
import manifest from 'virtual:nimpress/manifest'
import searchIndex from 'virtual:nimpress/search'
import pages from 'virtual:nimpress/pages'

createNimpressApp({
  title: 'Samna Docs',
  contentRoot: 'docs',
  authEndpoint: 'http://localhost:4202',
  clientSlug: 'docs',
  manifest,
  searchIndex,
  pageLoader: pages
}).mount(document.getElementById('app')!)
```

In `vite.config.ts`:

```ts
import nimpressMarkdown from '@nimling/nimpress/plugin'

export default {
  plugins: [
    nimpressMarkdown({ contentDir: 'docs' })
  ]
}
```

## Content model

1. Each `.md` file under the content root becomes a page. The file location defines the default route and the default sidebar position. Sibling files sort alphabetically by filename. Sibling directories sort alphabetically by directory name. Frontmatter overrides both.

2. Frontmatter fields:

2.1. `title: string` (required) is the page heading rendered as `<h1>`.

2.2. `slug: string` is the short label rendered in the sidebar. Falls back to `title` when omitted.

2.3. `type: 'doc' | 'index' | 'openapi'` selects how the page renders. Defaults to `index` for files named `index.md`, otherwise `doc`. `openapi` activates the OpenAPI renderer.

2.4. `path: string` overrides the route. The default is derived from the file location.

2.5. `spec: string` is required when `type: openapi`. Resolved relative to the `.md` file.

2.6. `order: number` positions the page within its directory.

2.7. `audience: 'public' | 'internal' | 'customer'` or an array of those, gates the page through samna_auth claims.

2.8. `description`, `icon`, `hidden`, `redirect`, `noToc` behave as you'd expect.

3. An `index.md` file becomes the landing page of its containing directory. Clicking the directory in the sidebar navigates to it. Its `slug` field labels the group; its `title` heads the page.

4. An OpenAPI reference page is a regular `.md` with `type: openapi` and `spec: ./<dir>/spec.json`. The plugin reads the spec at build time and the runtime renders it with hash deep links: `#operation/<id>` and `#schema/<name>`.

## Build pipeline

Mirrors `samna-vue-components`. Tag `v*` to publish via `.github/workflows/publish.yml`. Versioning through `../sbump/sbump.sh`.

## Scope

1. Svelte 5 components for layout, markdown rendering, OpenAPI rendering, search, login

2. Vite plugin entry at `@nimling/nimpress/plugin` that walks markdown content, parses frontmatter with zod, renders to html with markdown-it and shiki, emits typed modules per page, and assembles the manifest and MiniSearch corpus from the directory tree

3. Tailwind preset entry at `@nimling/nimpress/tailwind` carrying the Anthropic palette

4. Session auth via `@nimling/samna-auth-edge`
