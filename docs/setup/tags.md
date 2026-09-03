---
title: Tags
order: 10
tags: Setup
description: Tag icons and the tag to identifier map behind the tag row and the tags page.
---

nimpress adds first-class support for categorizing pages with tags, which allows users to discover related pages via search. If your documentation is large, tags can help users find relevant information faster. Every tagged page shows its tags at the bottom, and a [tags page](/page-types/tags) lists every tag with its pages.

## Configuration

### Tag icons and identifiers

Each tag can be associated with an icon, which is rendered inside the tag. Before assigning icons to tags, associate each tag with a unique identifier in `map`, so a group of tags shares one icon, then map each identifier to an icon in `icons` in the three forms `sidebar.icon` accepts; `default` covers every tag without one. Add the following lines to your configuration:

```json
{
  "tags": {
    "icons": { "default": ":lucide-tag:", "setup": ":lucide-settings:" },
    "map": { "Setup": "setup", "Install": "setup" }
  }
}
```

## Usage

### Add tags

Tags can be added to a document with the frontmatter `tags` property, as a YAML array or a comma separated string. They can also be used in search without any further configuration. Add the following lines at the top of a markdown file:

```yaml
---
tags:
  - Setup
  - Install
---
```

The page will now render with those tags at the bottom, and users will be able to filter by them in search.

### Hide tags on a page

While tags are rendered at the bottom of each page, you can hide them for a specific page with the frontmatter `hide` property:

```yaml
---
hide:
  - tags
---
```
