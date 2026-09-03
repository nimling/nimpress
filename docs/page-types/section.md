---
title: Section pages
tags: Page types
order: 12.7
description: A folder index that lists its children as a card grid, so a section overview needs no authored list.
---

nimpress supports arranging sections into grids, grouping blocks that convey similar meaning or are of equal importance. Grids are just perfect for building index pages that show a brief overview of a large section of your documentation. A `type: section` page is that index: a folder `index.md` whose markdown body renders first, followed by one card per child page of the folder, in sidebar order, without an authored list. [Page types](/page-types) and [Extensions](/extensions) are both section pages.

## Frontmatter

```yaml
---
title: Page types
type: section
description: One sentence for search and the card the parent section shows.
data:
  columns: 3
  depth: 1
---

Prose that introduces the section renders above the grid.
```

1. The type belongs on a folder `index.md`; lint refuses it anywhere else.

2. `data.columns` pins the grid to that column count. Omit it for auto fit.

3. `data.depth` is `1` by default and lists the direct children. `2` also lists grandchildren under a heading per child folder.

## What is listed

1. Every direct child page of the folder, in the order the sidebar shows them, so `order` on a child moves its card.

2. Each card carries the child `title`, or its `slug` when set, the child `description`, and the child `sidebar.icon` or `icon` when one is set.

3. Hidden pages stay out, dev only pages stay in during `nimpress dev` and out of the build, and outbound `link` entries stay out.

4. A child folder with its own `index.md` appears as one card linking to that index. With `depth: 2` its children appear under its title instead.

## Restyling

The grid reuses the card and card grid classes of the `:::cards` directive, with `np-section`, `np-section-grid`, and `np-section-group` around them. See [Page types styling](/styling/page-types) and [Prose and markdown styling](/styling/prose).
