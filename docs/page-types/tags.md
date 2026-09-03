---
title: Tags page
order: 12.8
tags: Page types
description: The page that lists every tag with its pages, and the tag row every tagged page shows.
---

nimpress adds first-class support for categorizing pages with tags, which allows users to discover related pages via search. If your documentation is large, tags can help users find relevant information faster. A `type: tags` page lists every tag with its pages, and every tagged page shows its tags at the bottom, each one leading to its section on that page. [Tags](/tags) is this site's listing.

## Frontmatter

```yaml
---
title: Tags
type: tags
description: Every tag used on this site with the pages that carry it.
---

Prose above the listing.
```

One tags page per site; lint refuses a second one. The listing renders under the body, one section per tag with its icon, its page count, and its pages with their descriptions, and the right rail lists the tags.

## Configuration

Each tag can be associated with an icon, which is rendered inside the tag. Before assigning icons to tags, associate each tag with a unique identifier, so a group of tags shares one icon, then map each identifier to an icon in the three forms `sidebar.icon` accepts. `default` is the icon of every tag without one. Add the following lines to your configuration:

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

## Restyling

The tag row, the pills, and the listing carry documented classes. See [Page types styling](/styling/page-types) and [Prose and markdown styling](/styling/prose).
