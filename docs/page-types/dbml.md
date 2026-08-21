---
title: DBML pages
order: 16
description: One DBML file rendered as a full page database diagram with a hero band above it.
---

A `type: dbml` page turns one `.dbml` file into a full page viewer. For a diagram inside a page that is mostly prose, use the inline fence described in [DBML](/extensions/dbml) instead.

## Frontmatter

```yaml
---
title: Bookable schema
type: dbml
spec: ./bookable.dbml
description: Every table the booking api reads and writes.
data:
  eyebrow: Database
  lead: Rooms, desks, and bookings.
  download: Download the schema
  fullscreen: Open fullscreen
---
```

`spec` is required and resolves relative to the markdown file.

## The band

The page opens with a hero band carrying the title, the description, `data.eyebrow`, `data.lead`, `data.logo`, `data.banner`, and the markdown body, all inside the same centered column a doc page uses. Only the diagram runs full width.

| Field | Effect |
|---|---|
| `data.download` | Label on the button handing over the `.dbml` source, `false` removes it |
| `data.fullscreen` | Label on the button opening the diagram fullscreen, `false` removes it |
| `data.actions` | Extra links, each with `text`, `link`, and a `variant` |
| `data.height` | Diagram height, the viewport below the site header by default |

The page has no right rail, and the `.dbml` file lands in the build output beside the page so the download hands over the real file.

## See it

The [schema viewer example](/examples/schema-viewer) is a working page, and [DBML](/extensions/dbml) covers what the converter maps and how to author the source.
