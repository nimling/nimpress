---
title: Navigation
order: 5
tags: Setup, Navigation
description: How the sidebar, the breadcrumbs, the right rail, and the previous and next links are built and switched.
---

A clear and concise navigation structure is an important aspect of good project documentation. nimpress builds the navigation from the content tree and provides several options to configure the behavior of navigational elements, including groups, breadcrumbs, and the previous and next links in the footer.

## Configuration

### Navigation sections

By default, nimpress creates the navigation sidebar on the basis of the folder structure and content of the markdown pages. A folder becomes a group, its `index.md` the group's own page, and a page joins another group with a `sidebar` block whose `path` names it. See [Sidebar](/sidebar).

### Navigation expansion

A group starts expanded. `collapsed: true` on a folder `index.md` starts it collapsed, and the reader's toggles are remembered.

### Navigation path

A breadcrumb navigation is rendered in the header above the title of each page below the root. `hide` with `path` removes it on a page.

### Section index pages

Documents are attached to sections by name: an `index.md` in a folder is the page of that group, and a `type: section` index lists the children as cards. See [Section pages](/page-types/section).

### Table of contents

The right rail lists the H2 and H3 headings of the page and follows the active anchor as the reader scrolls, updating the url hash so a deep link survives sharing. `hide` with `toc` removes it on a page.

### Footer navigation

Links to the previous and next page in sidebar order render above the footer. Add the following lines to your configuration:

```json
{
  "footer": { "navigation": true }
}
```

### Navigation tabs

Extra top level links beside the search in the header come from `navRoutes`. Add the following lines to your configuration:

```json
{
  "navRoutes": [{ "text": "API", "link": "/api" }]
}
```

## Usage

### Hide the sidebars

The navigation and the table of contents sidebars can be hidden for a document with the frontmatter `hide` property. Add the following lines at the top of a markdown file:

```yaml
---
hide:
  - navigation
  - toc
---
```

### Hide the navigation path

While the navigation path is rendered in the header, sometimes it might be desirable to hide it for a specific page, which can be achieved with the same property:

```yaml
---
hide:
  - path
---
```

## Customization

### Content area width

The width of the content area is set so the length of each line does not exceed what reads well. It may be desirable to increase the overall width, which the `--np-content-max` token controls:

```css
:root {
  --np-content-max: 1280px;
}
```

The sidebar and the rail widths are `--np-sidebar-width` and `--np-toc-width`. See [Theming](/theming).
