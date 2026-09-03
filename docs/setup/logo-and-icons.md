---
title: Logo and icons
order: 4
tags: Setup
description: The header logo, the favicon, the sidebar and tag icons, and the icon shortcodes in markdown.
---

When installing nimpress, you immediately get access to over 2,000 icons ready to be used for customization of specific parts of the theme and when writing your documentation in markdown. Not enough? You can also add additional icons with minimal effort.

## Configuration

### Logo

The logo can be changed to a user provided image, any type including png and svg, under the assets folder. Add the following lines to your configuration:

```json
{
  "logo": "/assets/logo.svg"
}
```

### Favicon

The favicon comes from the webmanifest under `meta.webmanifest`, or from a `favicon.svg` placed in the assets folder and referenced from the site head. See [SEO and social cards](/seo).

### Site icons

Sidebar rows, tags, and social links take an icon in three forms: literal text or ascii art, inline `<svg>` markup, or a path ending in `.svg` resolved against the declaring file and inlined at build time. A `:lucide-name:` shortcode is a fourth form that resolves the same way everywhere. See [Sidebar](/sidebar), [Tags](/setup/tags), and [Footer](/setup/footer).

## Customization

### Additional icons

In order to use custom icons, point the `icons` config field at a folder of svg files. `:name:` then resolves to `<icons>/name.svg` in markdown and in every icon field. Add the following lines to your configuration:

```json
{
  "icons": "./assets/icons"
}
```

Writing an icon into a page is in [Markdown](/authoring/markdown).
