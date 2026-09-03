---
title: Footer
order: 7
tags: Setup
description: The copyright notice, the previous and next page links, the social links, and the generator notice at the bottom of every page.
---


The footer of your documentation hosts the copyright notice, links to the previous and next page, as well as links to your social media profiles, all of which can be enabled via configuration. `footer` is an object; `text` is the site wide line rendered under every page and overridable with the `footer` frontmatter field.

## Configuration

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

## Usage

### Hiding prev/next links

The footer navigation showing links to the previous and next page can be hidden with the frontmatter `hide` property. Use this when the content of the page that is adjacent to the current page is not really related. Add the following lines at the top of a markdown file:

```yaml
---
hide:
  - footer
---
```


