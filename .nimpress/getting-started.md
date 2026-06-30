---
title: Getting started
description: Install nimpress, write a config, run the CLI, and override the styles.
order: 1
---

Nimpress turns a folder of markdown into a docs site. A consumer needs one config file and the `nimpress` CLI. The CLI owns Vite, so there is no build to wire by hand.

## Install

Nimpress is published to GitHub Packages as `@nimling/nimpress`. Two files at the repo root let the package manager authenticate.

`.npmrc`:

```
@nimling:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`.env`, gitignored:

```
NODE_AUTH_TOKEN=<a github token with read:packages>
```

Install with either package manager:

```bash
pnpm add @nimling/nimpress
```

## Scaffold

```bash
pnpm exec nimpress init
```

This writes a starter `nimpress.config.ts` and a content folder.

## Configure

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

`pnpm dev` serves the site, `pnpm build` writes the static site into `outDir`, and `pnpm preview` serves the built output. `nimpress lint` checks the frontmatter across the content.

## Options

The config controls the shell, the content roots, and the metadata.

| Field | Default | Purpose |
|-------|---------|---------|
| `title` | `Nimpress` | Site title in the header and the document title |
| `contentDir` | `docs` | Folder of markdown and the images next to it |
| `assetsDir` | `assets` | Shared asset root copied whole into the build |
| `assetUrlBase` | `/assets` | URL base the shared assets are served from |
| `outDir` | `dist` | Build output folder |
| `css` | none | Site wide stylesheet loaded after the framework styles |
| `exclude` | none | Folders under the content dir to skip |
| `logo` | none | Logo shown in the header |
| `github` | none | Repo link shown in the header |
| `footer` | none | Footer line under every page |
| `navRoutes` | none | Top navigation entries |
| `banner` | none | Header banner title, tagline, company, and version |
| `brand` | none | Primary and hover colors for the theme |
| `site` | none | SEO defaults such as url, description, and OpenGraph image |

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

3. The token catalog ships in the package. Add tokens, do not rename them, and give every token a light and a dark value so the theme toggle holds.
