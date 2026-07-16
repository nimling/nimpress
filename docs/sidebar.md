---
title: Sidebar
order: 3
sidebar:
  name: Core
---

The sidebar is derived from the content tree. There is no separate config to maintain.

## Construction

The plugin walks every `.md` file under `contentDir`, computes the effective route, and inserts the page into a tree keyed by URL segments. Each segment becomes a sidebar node. If a node has a page directly assigned to it, that node is a clickable link. If it only has children, it is a synthetic group label derived from the segment name.

## Frontmatter groups

A page with a top level `sidebar` block is inserted under a named group between its parent and itself, without changing its URL:

```yaml
sidebar:
  name: Inputs
  icon: "▤"
  style: "color: var(--np-brand)"
```

`name` is required and renders verbatim as the group label. `icon` and `style` are optional and decorate the group row, latest definition among members wins. Pages in the same parent sharing a `name` land in the same group. A `name` matching the page's own parent folder decorates that physical group instead of nesting a new one.

## Folder index entries

A `sidebar` block on a folder's `index.md` does not nest a group. It changes and styles the folder's own entry: `name` relabels it, `icon` and `style` decorate it. This works on every page type, so any folder entry in the sidebar is stylable from the page that owns it.

## Ordering

Within a parent, children sort first by `order` from frontmatter, then alphabetically by sidebar text. Add `order: 1` to pin a child to the top of its group.

## Labels

The sidebar entry text is `slug` from frontmatter when present, otherwise `title`. Use `slug` to keep sidebar entries short when titles need to be descriptive.

Synthetic groups, that is segments with no page directly assigned, are rendered with a Title Case version of the directory name.

## Auto behaviour on route change

When the route changes, the sidebar:

1. Opens every ancestor group on the path to the active entry.

2. Scrolls the active entry into view if it is offscreen.

3. Highlights the active entry.

## Collapse state

Group collapse state persists in `localStorage` through the `sidebar` store. Authors can set `collapsed: true` on the index page of a group to default that group closed.

## OpenAPI tag entries

Any `type: openapi` page adds one child entry per spec tag. Each tag link is `<page path>#tag/<tag name>`. Operations under each tag stay accessible via search and via direct hash links such as `#operation/<id>`.

## Changelog version entries

Any `type: changelog` collection page adds one child entry per release. Each entry's text is `v<version>` and the link is `<page path>#v<version>`. Clicking the sidebar entry navigates to the collection page and expands that release, scrolling it into view via the same hash routing the right rail TOC uses.
