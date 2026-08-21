---
title: Roadmaps
order: 14
description: A customer facing timeline of milestones, epics, features, and bugs, driven by shipped releases.
---

A `type: roadmap` page renders a vertical timeline. The roadmap file itself carries only the page header. Sibling files of `type: milestone`, `epic`, `feature`, or `bug` are the items, and each one is a real page at its own url.

## The file tree

```
docs/roadmap/
├── index.md                    type: roadmap
├── public-booking-calendar.md  type: epic
├── notification-routing.md     type: feature
└── api-error-mapping.md        type: bug
```

## The roadmap file

```yaml
---
title: Roadmap
type: roadmap
description: What we are building and what has shipped.
data:
  changelog: ../changelog
---
```

`data.changelog` points at a changelog folder whose entries plot markers on the spine. Omit it and nimpress discovers any changelog that links into one of these issues.

## An issue file

```yaml
---
title: Public booking calendar
type: epic
description: A booking calendar that runs end to end on mobile and desktop web.
data:
  date: 2026-08-21
  parent: organization-settings
---
```

`data.date` places the card on the spine and orders the sidebar. `data.parent` names another issue by filename, which pairs the child beside its parent on the timeline and nests it in the sidebar.

## Releases drive the progress

A [changelog entry](/page-types/changelog) opts into an issue and reports its effect:

```yaml
data:
  version: 1.5.0
  release_date: 2026-06-10
  title: Calendar selection surface
  description: Plain text sentence.
  issue: ../roadmap/public-booking-calendar
  status: 60
```

`data.status` is a percentage, or the word `completes` to flip the issue to shipped. The highest number across every linked release sets the rocket position, and each release drops a marker on the spine at its release date that navigates back to the entry.

## What the reader sees

Cards alternate across a curved spine whose arc length scales with the time between items. The kind shows as a colored pill, the border color carries the status, and hovering a card on a wide viewport opens an aside with the issue body. Below 800px the timeline becomes a single column with a straight spine.
