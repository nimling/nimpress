---
title: Grids
order: 25
tags: Authoring, Markdown
description: Card grids and feature grids for index pages, and the section page that builds one from a folder.
---

nimpress supports arranging sections into grids, grouping blocks that convey similar meaning or are of equal importance. Grids are just perfect for building index pages that show a brief overview of a large section of your documentation.

## Usage

### Use card grids

```md
:::cards
[Get started](./guide){ .np-card icon=⚡ }
[OpenAPI](./openapi){ .np-card icon=🔌 }
:::
```

### Use feature grids

The outer container uses **four colons** (`::::features`) so the inner three colon `:::feature` close markers do not collide with the outer close.

````md
::::features {"columns":3}
:::feature {"icon":"⚡","title":"Fast","link":"/guide"}
Vite plugin, shiki at build time.
:::

:::feature {"icon":"/icons/themable.svg","title":"Themable","link":"/docs/theming"}
Tokens overridable in your own CSS.
:::

:::feature {"icon":"🔌","title":"OpenAPI built in","link":"/docs/openapi"}
Render any 3.1 spec with hash deep links.
:::
::::
````

Directive payload fields:

1. `columns` on `::::features` pins the grid to that column count. Omit for auto fit.

2. Each `:::feature` accepts `title`, `icon`, and `link`. The body is markdown rendered inside the card.

3. `icon` accepts either an ASCII or emoji character (`⚡`, `📚`, `→`) **or** a path to an image asset (`/icons/fast.svg`, `./art/themable.png`, `https://...`). The renderer detects the form automatically.

### Use section pages

A folder index of `type: section` lists its children as a card grid without an authored list. See [Section pages](/page-types/section).
