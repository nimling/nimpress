---
title: DBML pages
order: 16
description: One DBML file rendered as a full page database diagram with a hero band above it.
---

`type: dbml` turns one `.dbml` file into a page whose whole purpose is the schema. For a diagram inside a page that is mostly prose, use the inline fence in [DBML](/extensions/dbml) instead.

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

The markdown body renders under the lead, still inside the content column.
```

`spec` is required and resolves relative to the markdown file. Lint fails when it is missing or does not resolve.

## Header fields

| Field | Effect |
|---|---|
| `title` | The hero title. |
| `description` | The line under the title. |
| `data.eyebrow` | A small uppercase label above the title. |
| `data.lead` | A paragraph under the description. |
| `data.logo` | An image above the eyebrow, resolved against the site base. |
| `data.banner` | A background image behind the band, resolved against the site base. |
| `data.align` | `start`, `center`, or `end`. `start` by default. |
| `data.download` | The download button label. `Download` by default, `false` removes the button. |
| `data.fullscreen` | The fullscreen button label. `Fullscreen` by default, `false` removes the button. |
| `data.actions` | Extra links, each with `text`, `link`, and a `variant` of `primary`, `secondary`, or `ghost`. |
| `data.height` | The diagram height. The viewport under the site header by default. |
| `footer` | A centered line under the diagram. |

## Layout

The band holds the logo, the eyebrow, the title, the description, the lead, the markdown body, and the buttons, all inside the same centered content column a doc page uses. Only the diagram runs full width, edge to edge with no padding and no rounded corners, filling the space below the site header when the reader scrolls to it.

The page has no right rail. A long markdown body belongs on a sibling doc page linked from the band, not here.

## The buttons

The download button hands the reader the `.dbml` source under its own file name. The `.dbml` file is copied into the build output beside the page, so the download is the real file rather than a copy embedded in the page payload.

The fullscreen button opens the diagram fullscreen, the same as the control inside the frame.

`data.actions` adds ordinary links beside them, which is where a link to the migration guide or the API reference goes.

## The diagram

The diagram itself, what the converter maps from DBML, how the tables are laid out, how a column click navigates, and how to author the source are all in [DBML](/extensions/dbml). A `type: dbml` page and a ` ```dbml ` fence render through the same component and behave identically, except that the page arms the frame on mount because there the diagram is the page.

## See it

[Schema viewer](/examples/schema-viewer) is a working page with the band, the buttons, and a schema worth panning around.

## Restyling the page

The band, the buttons, and the diagram canvas carry documented classes. See [Page types styling](/styling/page-types) and [Renderers styling](/styling/renderers).
