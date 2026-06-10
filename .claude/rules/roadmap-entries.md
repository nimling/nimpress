# Authoring roadmap entries

Rules for writing roadmap items rendered by `type: roadmap`.

## One file per item

Every roadmap item is its own markdown file. Reviewing an item is a single file PR. Combining items in one file is a rule violation.

## How files collapse into one page

Every entry declares `title: Roadmap` (or whatever the collection's display name is) and `type: roadmap`. Files sit in one folder. The plugin groups by `(parent folder, title)` and produces one collection page mounted at that folder's path. Each file becomes one card on the vertical timeline.

Filenames are arbitrary. Use the entry id (`org-settings.md`, `notification-routing.md`) so the file tree reads as a list of items.

## Layout in the file tree

```
docs/
└── solutions/
    └── bookable/
        └── roadmap/
            ├── org-settings.md
            ├── notification-routing.md
            └── booking-calendars.md
```

The collection page lives at `/solutions/bookable/roadmap`.

## Required frontmatter

```yaml
---
title: Roadmap
type: roadmap
data:
  id: org-settings
  kind: epic
  title: Organization settings
  description: Plain text sentence shown under the card title and on the hover aside.
  date: 2026-08-15
---
```

1. Top level `title` is the collection title and the grouping key. Every entry in the same folder uses the exact same string.

2. `type: roadmap` is required for the plugin to group the file.

3. `data.id` is required. Unique slug within the collection. Defaults to the filename if omitted. Other entries reference it from `data.parent`, and changelog entries link to it via `data.roadmap`.

4. `data.kind` is required. One of `milestone`, `epic`, `feature`, `bug`. The renderer paints the card and the spine marker differently per kind.

5. `data.title` is the card headline and the sidebar label.

6. `data.description` is one short sentence shown on the card and on the hover aside. Plain text. Markdown is not rendered here, identifiers without backticks.

7. `data.date` is the target date as an RFC 3339 string (`2026-08-15` is accepted as midnight UTC). Drives ordering on the timeline. Items without a date sort to the future side.

## Optional frontmatter

1. `data.parent` is the `id` of the owning epic or milestone. The sidebar nests features and bugs under their parent epic.

2. `data.progress` is a number 0–100 the renderer uses to scale the rocket trail when no changelog has shipped yet.

3. `data.issue` is a URL to the matching GitHub issue. Renders as a link on the hover aside.

4. `data.status` is one of `planned`, `in_progress`, `shipped`. Defaults to inferred: an entry with at least one incoming changelog reference is `shipped`, otherwise `planned`. Set it explicitly only when overriding inference.

5. `data.theme` is a short color hint string. Reserved for future theming. The renderer falls back to the kind-based color when not set.

## How changelogs link

A changelog entry opts in to a roadmap item by adding `roadmap: <relative path>` under its `data` block. The path is resolved relative to the changelog file.

```yaml
---
title: Changelog
type: changelog
data:
  version: 1.5.0
  release_date: 2026-06-10
  title: Organization settings
  description: Plain text sentence.
  roadmap: ../roadmap/org-settings.md
---
```

The renderer accumulates every changelog that points at a given roadmap item and treats the item as `shipped` from the earliest release date forward. The hover aside lists the linked changelog versions in chronological order.

## Entry body

1. Never write an H1 or H2 in the body. The card chrome carries the title. Start the body at H3. H3 is the maximum heading size.

2. Lead with one short paragraph. The hover aside renders the body, so write it as if it were a tooltip about the item.

3. Link to design docs, RFCs, and supporting context. Do not list code level acceptance criteria, those belong on the GitHub issue.

## Reading direction

1. The page orders items by `date`. Items without a date sort to the future side, ahead of the most distant future date.

2. The vertical layout reads future at the top, shipped at the bottom. Cards alternate left and right of the spine.

3. The page loads scrolled to the boundary between the shipped block and the planned block. The reader lands on the present and can scroll up into the future or down into the past.

## Rendered shape

1. Each card is `[kind chip] [title] [description] [date chip]`. Hovering or focusing a card opens the aside on the opposite side of the spine.

2. The spine is a dashed centerline with markers for each kind, ending at a Today pill at the boundary.

3. On screens 900px wide and below, the layout collapses to a single column, and the hover aside becomes a tap to expand inline.

## What not to include

1. Internal status updates better suited to issue comments.

2. Customer names or contracts. The roadmap page is customer facing.

3. Pricing, dates that are not yet committed publicly.
