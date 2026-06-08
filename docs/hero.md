# Hero pages

Oversized landing pages with a tagline, action buttons, and a feature grid. Use for the home page, section landing pages, and any page that introduces a top level area.

## Frontmatter

```yaml
---
title: Welcome
type: hero
data:
  eyebrow: Documentation
  logo: /logos/docs-mark.svg
  banner: /banners/grid.svg
  tagline: Build great docs with Svelte
  lead: Optional longer paragraph below the tagline.
  image: /hero-illustration.svg
  align: start
  actions:
    - text: Get started
      link: /guide
      variant: primary
    - text: GitHub
      link: https://github.com/nimling/nimpress
      variant: secondary
  features:
    - title: Fast
      icon: ⚡
      details: Vite plugin, shiki at build time.
    - title: Themable
      icon: 🎨
      details: Tokens overridable in your own CSS.
      link: /docs/theming
    - title: OpenAPI built in
      icon: 🔌
      details: Render any 3.1 spec with hash deep links.
      link: /docs/openapi
---

Markdown body here renders below the hero, in the standard prose shell.
```

## Fields

1. `eyebrow` is the short uppercase label above the title.

2. `logo` is a small mark rendered above the eyebrow. URL to an SVG or PNG.

3. `banner` is a background image rendered behind the hero with a soft fade to the page background.

4. `tagline` is the short subtitle under the title.

5. `lead` is an optional longer paragraph below the tagline.

6. `image` is an optional illustration shown beside the copy. Without `image` the hero centers automatically.

7. `align` controls which side the copy sits on when `image` is set. Values are `start` (copy left, image right, default), `end` (copy right, image left), and `center` (copy centered, image stacks below).

8. `actions` is a list of buttons. Each entry takes `text`, `link`, and an optional `variant` of `primary`, `secondary`, or `ghost`.

9. `features` is a grid of cards. Each entry takes `title`, optional `icon`, optional `details`, and an optional `link` that makes the whole card clickable.

## Layout

The hero is centered with a max width of 1280px. Below 960px viewport width the copy stacks above the image. Above 960px the copy and image sit side by side. Features wrap into auto fit columns with a 240px minimum. The banner fades to the page background near the bottom of the hero so the feature grid reads as a separate band.

## Where to use

The recommended landing pages: home, Solutions, Tools, Libraries, API. Any page that opens a new area of the docs is a hero candidate.
