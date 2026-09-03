---
title: Getting started
description: Install nimpress, write a config, run the CLI, and deploy the built site.
order: 2
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

## Header

The header can be customized to show an announcement bar that disappears upon scrolling, and provides some options for further configuration. It also includes the search bar and a place to display your project's git repository.

### Announcement bar

nimpress includes an announcement bar, which is the perfect place to display project news or other important information to the user. When the user scrolls past the header, the bar will automatically disappear. `text` is one markdown line, and `link` wraps the whole bar in a link. Add the following lines to your configuration:

```json
{
  "announce": {
    "text": "Version 2.4 is out.",
    "link": "/changelog"
  }
}
```

### Mark as read

For temporary announcements that can be marked as read by the user, a button to dismiss the current announcement can be included. Add the following lines to your configuration:

```json
{
  "announce": {
    "text": "Version 2.4 is out.",
    "dismiss": true
  }
}
```

When the user clicks the button, the current announcement is dismissed and not displayed again until the content of the announcement changes.

## Footer

The footer of your documentation hosts the copyright notice, links to the previous and next page, as well as links to your social media profiles, all of which can be enabled via configuration. `footer` is an object; `text` is the site wide line rendered under every page and overridable with the `footer` frontmatter field.

### Navigation

The footer can include links to the previous and next page of the current page, in sidebar order. Add the following lines to your configuration:

```json
{
  "footer": {
    "navigation": true
  }
}
```

### Social links

Social links are rendered next to the copyright notice as part of the footer of your project documentation. Add a list of social links in your configuration with:

```json
{
  "footer": {
    "social": [
      { "icon": "./assets/github.svg", "link": "https://github.com/nimling/nimpress", "name": "nimpress on GitHub" }
    ]
  }
}
```

The following properties are available for each link.

| Property | Description |
|---|---|
| `icon` | Literal text, inline `<svg>` markup, or a path ending in `.svg` resolved against the config file and inlined at build time. |
| `link` | A relative or absolute URL including the URI scheme. All URI schemes are supported, including `mailto`. |
| `name` | The link's title attribute, set to a discernable name to improve accessibility. The default is the link itself. |

### Copyright notice

A custom copyright banner can be rendered as part of the footer, which is displayed next to the social links. Add the following lines to your configuration:

```json
{
  "footer": {
    "copyright": "© 2026 Nimling"
  }
}
```

### Generator notice

The footer displays a Built with nimpress notice to denote how the site was generated. The notice can be removed with the following option:

```json
{
  "footer": {
    "generator": false
  }
}
```

### Hiding prev/next links

The footer navigation showing links to the previous and next page can be hidden with the frontmatter `hide` property. Use this when the content of the page that is adjacent to the current page is not really related. Add the following lines at the top of a markdown file:

```yaml
---
hide:
  - footer
---
```


## Repository

If your documentation is related to source code, nimpress provides the ability to display information about the project's repository as part of the static site. The `github` field renders the repository link in the header, and `repo` adds actions to every doc page.

### Content actions

nimpress can display code action buttons that allow a reader to navigate to the source code of the current page in a hosted repository such as GitHub. `url` defaults to the `github` field, `editUri` to `edit/main/<contentDir>/`, and the view action swaps `edit` for `blob`. Add the following lines to your configuration:

```json
{
  "repo": {
    "actions": ["edit", "view"]
  }
}
```

If you use a custom branch name or content folder, change `editUri` to the path component of the edit url in your repository, `edit/develop/documentation/` for a `develop` branch and a `documentation` folder.

## Feedback

As with any other service offered on the web, understanding how your project documentation is actually used can be an essential success factor. nimpress ships a feedback widget and reports every click as a DOM event, so any analytics provider can be wired in from the site's client module.

### Was this page helpful?

A simple feedback widget can be included at the bottom of each page, encouraging users to give instant feedback whether a page was helpful or not. Add the following lines to your configuration:

```json
{
  "feedback": {
    "title": "Was this page helpful?",
    "ratings": [
      { "icon": "👍", "name": "This page was helpful", "data": "1", "note": "Thanks for your feedback!" },
      { "icon": "👎", "name": "This page could be improved", "data": "0", "note": "Thanks for your feedback! Help us improve this page by [opening an issue](https://github.com/nimling/nimpress)." }
    ]
  }
}
```

| Property | Description |
|---|---|
| `title` | The question rendered above the rating buttons. |
| `icon` | The glyph on the rating button. |
| `name` | The accessible label and the title of the rating button. |
| `data` | The value the `nimpress:feedback` event reports for this rating. |
| `note` | One markdown line shown in place of the buttons after the click. |

### Hide the feedback widget

The feedback widget can be hidden for a document with the frontmatter `hide` property. Add the following lines at the top of a markdown file:

```yaml
---
hide:
  - feedback
---
```

### Custom site feedback

A custom feedback integration just needs to process the events that are generated by users interacting with the feedback widget. Every click dispatches `nimpress:feedback` on `document` with the page path and the rating data, and nimpress itself sends nothing anywhere. Listen for it in the module named by the `client` config field:

```ts
document.addEventListener('nimpress:feedback', (event) => {
  const { path, data } = (event as CustomEvent<{ path: string; data: string }>).detail
  window.plausible?.('feedback', { props: { path, data } })
})
```


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
