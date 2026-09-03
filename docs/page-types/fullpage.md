---
title: Full pages
tags: Page types
order: 12.5
description: A landing page that renders under the header alone, with no sidebar, no breadcrumbs, and no rail, and a body that spans the viewport.
---

A `type: fullpage` page renders under the site header and nothing else of the chrome. The sidebar column, the breadcrumbs, the right rail, and the previous and next links are all gone, so the title, the tagline, and the sections below fill the viewport width. Reach for it for the site home, a product landing, or any page that is a beacon and not a document. A [hero page](/page-types/hero) keeps the sidebar and the content column; a full page drops both.

## Frontmatter

```yaml
---
title: Adaptive docs for evolving ideas
type: fullpage
description: One sentence for search and social cards.
data:
  eyebrow: Documentation framework
  logo: /assets/logo.svg
  background: /assets/banner.svg
  tagline: A Svelte 5 docs framework that supports it all.
  lead: Optional longer paragraph under the tagline.
  align: center
  width: full
---
```

`hide` needs nothing on a full page: `navigation`, `path`, `toc`, and `footer` are hidden by the type, and any further element the page lists is hidden too.

## Band fields

1. `eyebrow` is the short uppercase label above the title.

2. `logo` is a small mark rendered above the eyebrow, a URL to an SVG or PNG.

3. `background` is an image rendered behind the band with a soft fade to the page background. The top level `background` field works the same way.

4. `tagline` is the short subtitle under the title, falling back to `description`.

5. `lead` is the optional longer paragraph under the tagline.

6. `align` is `center` by default and `start` puts the copy on the left.

7. `width` is `full` by default and `content` narrows the body below the band to the doc column width while the band keeps the viewport.

## Body

The markdown body renders below the band, edge to edge. `:::actions`, `::::features`, and `:::cards` from [Markdown](/extensions/markdown) are the section blocks, and headings with prose read as sections between them.

````md
:::actions {"align":"center"}
[Get started](/getting-started){"variant":"primary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"secondary"}
:::

::::features {"columns":3}
:::feature {"icon":"⚡","title":"Fast","link":"/getting-started"}
Vite plugin, shiki at build time.
:::
::::
````

## Where to use

The site home when the sidebar would distract from the pitch, a product landing that opens a section, and a page that exists to route the reader elsewhere. Every other page keeps the shell.

## Restyling

The band, the eyebrow, the title, the tagline, the lead, and the body carry documented classes. See [Page types styling](/styling/page-types).
