---
title: Getting started
description: Install nimpress, write a config, run the CLI, and deploy the built site.
order: 0
sidebar:
  name: Core
---

Nimpress turns a folder of markdown into a docs site. A site needs one config file and the `nimpress` CLI. The CLI owns Vite, so there is no build to wire by hand.

## Install

```bash
pnpm add @nimtech/nimpress
```

`@nimtech/nimpress` is public on npm. There is no `.npmrc` to write, no registry line, and no token.

## Scaffold

```bash
pnpm exec nimpress init
```

That writes a starter `nimpress.config.ts` and a content folder.

## Configure

`nimpress.config.ts` at the repo root:

```ts
import { defineConfig } from '@nimtech/nimpress/plugin'

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

Every field carries a default, so a config can be as small as a title. The full field list is in [frontmatter](/frontmatter) for pages and in [the CLI reference](/cli) for the commands.

## Run

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

`pnpm dev` serves the site, `pnpm build` writes the static site into the output folder, and `pnpm preview` serves the built output. `nimpress lint` checks the frontmatter and the structure across the content.

## Serving under a subfolder

A site served from the root of a domain needs nothing extra. A site served under a path, a GitHub project page for instance, declares that path once:

```ts
export default defineConfig({
  title: 'Docs',
  base: '/your-repo/'
})
```

Routes, sidebar links, markdown links and images, search results, feeds, canonical urls, the sitemap, guarded bundles, and component harnesses all resolve under it. The build also writes a `404.html` and a `.nojekyll` file, which is what GitHub Pages needs to route deep links and to serve the folders the build writes.

## Style overrides

Nimpress drives every visual choice through a CSS custom property. Override the tokens, not the components.

1. Site wide. Name a stylesheet in the `css` field. Nimpress loads it after the framework styles, so setting `--np-*` tokens on `:root` and `html.dark`, or targeting the public `np-` classes, wins the cascade.

```css
:root {
  --np-brand: #6d5efc;
  --np-radius-md: 0.6em;
}
html.dark {
  --np-bg: #0b0b10;
}
```

2. Per page. A stylesheet named like a markdown file loads while that route is open. `guide/index.css` next to `guide/index.md` loads on `/guide` and every path under it. A leaf page stylesheet loads only on its own page.

3. The token catalog ships in the package. Add tokens, do not rename them, and give every token a light and a dark value so the theme toggle holds. [Theming](/theming) carries the catalog.
