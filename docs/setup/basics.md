---
title: Basics
order: 1
tags: Setup
description: Every field of the config file, its default, and what it changes.
---

A nimpress project is configured via a `nimpress.config.ts` or `nimpress.config.json` file at the repo root. If you create your project using the init command, this file will be automatically created for you, and include every setting documented and commented out. Every field carries a default, so a config can be as small as a title.

## Settings

### title

The site title shown in the header and the tab. The one field a site needs.

```json
{ "title": "Docs" }
```

### logo

The header logo url, absolute or under `assetUrlBase`.

```json
{ "logo": "/assets/logo.svg" }
```

### github

The repository url rendered as the header GitHub link, and the default `url` of the [repository actions](/setup/repository).

### brand

The brand colors written onto the theme tokens `--np-brand` and `--np-brand-hover`. See [Colors](/setup/colors).

```json
{ "brand": { "primary": "#CC785C", "primaryHover": "#B86A52" } }
```

### site

The canonical site identity used for absolute urls, the sitemap, and social cards: `title`, `url`, `description`, `ogImage`, `twitterSite`, `locale`. `url` must be set for the sitemap and the canonical links to be written. See [SEO and social cards](/seo).

### base

The url prefix the whole site is served under, for a project page or a subfolder deploy, `/nimpress/` for this site.

### contentDir, assetsDir, assetUrlBase

`contentDir` is the folder holding the markdown, `docs` by default. `assetsDir` is the root assets folder copied into the build, `assets` by default, served under `assetUrlBase`, `/assets` by default.

### paths

Every folder nimpress writes, each with a default: `out` for the build, `cache` for every cache, `export` for the docs sync handoff, `modules` and `guarded` for the served folders. See [the cli reference](/cli).

### css

Extra stylesheets loaded after the framework styles, one path or a list. See [Theming](/theming).

### announce, footer, repo, feedback, tags, status

The header and footer surfaces: the [announcement](/setup/header), the [footer](/setup/footer), the [repository actions](/setup/repository), the [feedback widget](/setup/analytics), the [tag icons](/setup/tags), and the page `status` labels the sidebar shows.

### tabs, images, icons, math

The authoring switches: `tabs.linked` links every tab group by label, `images.lightbox` opens every image in a lightbox, `icons` names a folder of custom svg shortcodes, and `math` turns the formula syntax off. See [Markdown](/authoring/markdown).

### navRoutes

Extra header navigation routes, each with `text`, `link`, and an optional `gate`.

### auth, client, subscribe

The OAuth 2.0 session login and the build time guard function for gated pages, the client module exporting `authFunctions` and `subscribeFunctions`, and the changelog subscription wiring. See [Auth](/auth).

### meta

SEO, robots, `llms.txt`, webmanifest, and `security.txt` emission. See [SEO and social cards](/seo).

### exclude, defaultFrontmatter, defaultFrontmatterExclude

Slug prefixes excluded from the site, frontmatter defaults applied to every page that leaves the field unset, and the path prefixes those defaults skip.

### banner

The dev server banner: `title`, `tagline`, `company`, `version`, or `false` to disable it.

### vite

Vite overrides merged into the site and harness configs, such as a `resolve.alias` block.

### modules

The component workshop systems, one entry per component library. See [Component modules](/modules).
