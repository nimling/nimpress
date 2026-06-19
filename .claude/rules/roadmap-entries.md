# Authoring roadmap pages

Rules for the `type: roadmap` page and the issue pages that fill its timeline.

## Two file types

1. One `type: roadmap` file per roadmap. Its filename is arbitrary. It defines the header markdown, hero text, and background of the roadmap page itself.

2. Many sibling files of `type: milestone | epic | feature | bug`. Each is a real standalone page at its own URL. Collectively call these issue pages.

The plugin discovers a roadmap by walking the content tree and finding any file whose frontmatter declares `type: roadmap`. Each such file produces one roadmap page in the sidebar. Multiple roadmap files in different folders produce independent roadmaps.

## Layout in the file tree

```
docs/
└── solutions/
    └── bookable/
        └── roadmap/
            ├── overview.md             # type: roadmap, header markdown lives here
            ├── public-booking-calendar.md   # type: epic
            ├── notification-routing.md      # type: feature
            └── api-error-mapping.md         # type: bug
```

By default the roadmap pulls issue pages from the same folder as the roadmap file. Override the scope with `data.issues` or `data.entries` (relative paths or array of paths) on the roadmap file to point at one or more subfolders.

## Filenames are the ids

Filename without `.md` is the issue id. References from `data.parent` on issues and `data.issue` on changelog entries are written as relative paths (with or without `.md`).

There is no `data.id` field. Do not invent one.

## Roadmap file frontmatter

```yaml
---
title: Bookable roadmap
type: roadmap
description: What we are building, what we are shipping, and what is on the horizon.
background: /img/roadmap-bg.svg
data:
  changelog: ../changelog
---
```

1. `title` is the page title. The roadmap file's markdown body renders as the page header above the timeline.

2. `data.changelog` is optional. A relative path to a changelog folder whose entries should plot markers on the spine and feed the rocket progress. Omit to auto-discover from any changelog that links into one of this roadmap's issues via `data.issue`. Explicit scope takes priority when set.

3. `data.issues` or `data.entries` is optional. A relative path or array of paths. The roadmap pulls issue pages from these directories instead of the default sibling scope.

## Issue file frontmatter

```yaml
---
title: Public booking calendar surface
type: epic
description: A customer facing booking calendar that runs end to end on mobile and desktop web.
data:
  date: 2026-08-21
  parent: organization-settings
---
```

1. `title` is required.

2. `type` must be one of `milestone | epic | feature | bug`. The renderer paints the card and the issue page chrome differently per kind.

3. `description` is one short sentence. Plain text. Shown on the timeline card and on the hover aside.

4. `data.date` is required. An RFC 3339 date or full timestamp. Drives the chronological position on the spine and the sidebar order (oldest at top).

5. `data.parent` is optional. The filename (with or without `.md`) of another issue in the same roadmap. The renderer pairs the child next to its parent on the timeline. The sidebar nests the child under the parent.

## Changelog linkage

A changelog entry opts in to an issue with `data.issue: <relative path>` and reports its effect on the issue with `data.status`. The plugin resolves the path against the changelog file's directory.

```yaml
data:
  version: 1.5.0
  release_date: 2026-06-10
  title: Calendar selection surface
  description: Plain text sentence.
  issue: ../roadmap/public-booking-calendar
  status: 60
```

1. `data.issue` is a relative path to the issue file. The resolved file must exist as a roadmap issue, or the link is dropped.

2. `data.status` is one of:

2.1. A number `0..100`. The percent of the issue this release advanced. The highest number across all linked releases sets the rocket position.

2.2. The literal word `completes` (also accepts `completed`, `complete`, `closes`, `fixes`, `resolves`). The issue flips to `shipped` and the rocket settles at this point. Use the verb that matches your commit and PR style.

3. The release lands a marker on the roadmap spine at the changelog `release_date`. Clicking the marker navigates to the changelog entry's URL.

## Card and timeline

1. Cards alternate left and right of the spine by default. Issues with a `data.parent` sit next to their parent in chronological order.

2. Each card carries the `KIND` label as a solid colored pill at the top-left and the target date at the top-right. Title below, description below that. The kind pill is indigo for epic, green for feature, red for bug.

3. The card border color carries the issue status. Green for shipped, yellow for in progress, the default border for planned. Status is driven by the linked changelog `data.status`, so authors set status through the changelog, not on the issue file.

4. Card backgrounds are organic SVG blobs deterministically generated from the filename, so each card looks unique but stays stable.

5. The spine is a single smooth curve from the planet at the bottom to an arrow at the top. The arc length between two consecutive issues scales with the time between them, so a long gap draws a longer stretch of path. The traveled portion is solid, the untraveled portion is dashed and muted, matching the top arrow.

6. Today renders as a short tick drawn as a normal to the path, carrying a date-only label placed on the side away from the nearest issue. An SVG rocket sits at the chronological position of today, or at the highest linked changelog progress, whichever is further.

7. Every linked changelog entry drops a smaller dotted marker with the version and release date at its release-date position. Clicking the marker navigates to the changelog entry.

8. Clicking a card navigates to the issue's own page (each issue is a real standalone page at its file URL).

## Responsive

1. At 800px viewport width and below, every issue moves into a single column on the right, ordered by date with the oldest at the bottom.

2. The spine becomes a straight vertical line on the left. It starts at the globe at the bottom, curls to the left, and runs straight up to the top arrow. Each card connects to the line with a horizontal connector.

3. The hover aside is off at this width. Tapping a card navigates to its page.

## Hover aside

1. Desktop (above 900px viewport): hovering or focusing a card opens a floating aside on the opposite side that mirrors the issue's markdown body and lists the shipping changelogs. Mobile (≤900px): no hover; tap navigates.

## Sidebar

1. The roadmap page is the parent node.

2. Issue pages list as children sorted by `data.date` ascending (oldest first, newest last).

3. Children with `data.parent` nest under the parent issue in the sidebar.

4. Each issue page has its own URL and renders through the standard page chrome with a kind chip and date header.

## Right TOC

1. The roadmap page itself has no right TOC.

2. Issue pages keep the right TOC like regular doc pages.

## What not to include

1. Internal status updates better suited to issue comments.

2. Customer names or contracts. The roadmap page is customer facing.

3. Pricing or dates that are not yet committed publicly.
