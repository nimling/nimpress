# Hero pages

Oversized landing pages with a title, eyebrow, tagline, and optional image or banner. The hero band sits at the top of the page. Everything below it is the markdown body, rendered through the standard prose shell. Action buttons and feature grids live inside that body using the directives in [markdown.md](./markdown.md).

## Frontmatter

```yaml
---
title: Welcome
type: hero
description: One sentence description for search and social cards.
data:
  eyebrow: Documentation
  logo: /logos/docs-mark.svg
  banner: /banners/grid.svg
  tagline: Build great docs with Svelte.
  lead: Optional longer paragraph below the tagline.
  image: /hero-illustration.svg
  align: start
meta:
  og:
    image: /og/welcome.png
  twitter:
    card: summary_large_image
---

Markdown body here. Use `:::actions` and `:::features` from the markdown extensions
to render buttons and a feature grid below the hero band.
```

## Hero band fields

1. `eyebrow` is the short uppercase label above the title.

2. `logo` is a small mark rendered above the eyebrow. URL to an SVG or PNG.

3. `banner` is a background image rendered behind the hero band with a soft fade to the page background.

4. `tagline` is the short subtitle under the title.

5. `lead` is the optional longer paragraph under the tagline.

6. `image` is the illustration beside the copy. Without `image` the band centers automatically.

7. `align` controls which side the copy sits on when `image` is set. Values are `start` (copy left, image right, default), `end` (copy right, image left), and `center` (copy centered, image stacks below).

## Body

The hero page renders the markdown body below the band. Authors compose action buttons and feature grids using directives from [markdown.md](./markdown.md):

````md
:::actions
[Get started](/guide){"variant":"primary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"secondary"}
:::

:::features
:::feature {"icon":"⚡","title":"Fast","link":"/guide"}
Vite plugin, shiki at build time.
:::

:::feature {"icon":"🎨","title":"Themable","link":"/docs/theming"}
Tokens overridable in your own CSS.
:::
:::
````

## Where to use

The recommended landing pages: home, Solutions, Tools, Libraries, API. Any page that opens a new area of the docs is a hero candidate.
