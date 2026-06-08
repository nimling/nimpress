# Sidebar

The sidebar is derived from the content tree. There is no separate config to maintain.

## Construction

The plugin walks every `.md` file under `contentDir`, computes the effective route, and inserts the page into a tree keyed by URL segments. Each segment becomes a sidebar node. If a node has a page directly assigned to it, that node is a clickable link. If it only has children, it is a synthetic group label derived from the segment name.

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
