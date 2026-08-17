---
title: DBML
order: 10
sidebar:
  name: Authoring
description: Render a database schema written in DBML as an interactive entity relationship diagram, inline in any page or as a full page viewer.
---

Nimpress renders [DBML](https://dbml.dbdiagram.io) schemas as interactive entity relationship diagrams. A fenced ` ```dbml ` block renders inline in any page. A `type: dbml` page turns one `.dbml` file into a full page viewer.

## Inline block

````md
```dbml
Table users {
  id uuid [pk]
  email varchar(255) [not null, unique]
  Note: 'People who can sign in'
}

Table post {
  id uuid [pk]
  user_id uuid [not null]
  title varchar(255) [not null]
}

Ref: post.user_id > users.id
```
````

The fence accepts a JSON object on the info line. `height` sizes the frame, `520px` by default. Size the frame for the schema: a two table diagram reads fine at `320px`, a ten table one wants `620px` or more, because the pannable area is whatever the tables do not cover.

````md
```dbml {"height":"760px"}
Table device {
  id uuid [pk]
}
```
````

Rendered, that fence looks like this.

```dbml {"height":"420px"}
Table users {
  id uuid [pk]
  email varchar(255) [not null, unique]
  Note: 'People who can sign in'
}

Table post {
  id uuid [pk]
  user_id uuid [not null]
  title varchar(255) [not null]
}

Ref: post.user_id > users.id
```

## Full page viewer

Keep the schema in its own `.dbml` file and point a page at it. The markdown body renders as the page header, the diagram fills the rest of the viewport.

```md
---
title: Bookable schema
type: dbml
spec: ./bookable.dbml
description: Every table the booking api reads and writes.
---

Rooms, desks, and bookings, with the claimius columns every registered table carries.
```

The `.dbml` file is copied into the build output beside the page, so readers can open the source directly. [Schema viewer](./dbml-example.md) is one such page.

## What renders

1. Tables with their columns, data types, defaults, and notes.

2. Primary keys, composite primary keys declared in an `indexes` block, unique columns, and not null columns.

3. Foreign keys drawn as relationship lines, with the cardinality taken from the DBML ref operator.

4. Named and unique indexes.

5. Table header colors from `headercolor`.

6. Standalone `Note` blocks as sticky notes beside the diagram.

7. Schema qualified names when the schema is not `public`.

## Interacting

An inline diagram starts inert behind a `click to explore the schema` shield, so scrolling the page past it never gets captured. Clicking the shield hands the frame the pointer and reveals a gesture hint along the bottom edge. A `type: dbml` page skips the shield; the diagram is the page.

The gestures:

1. Drag empty canvas to pan.

2. Drag a table to move it. The move is view only and is never written back to the `.dbml` file.

3. Scroll to zoom, or use the zoom in, zoom out, and fit buttons in the top left corner.

4. Drag the viewport box in the minimap, or click anywhere in the minimap, to jump across a wide schema.

5. Click a relationship line or a table to highlight it.

The fullscreen button sits in the top right corner of the frame.

## Theme

The diagram follows the site theme. Every table card, column row, and relationship line reads its colors from `tokens.css`, so a site that overrides the tokens gets a diagram in its own palette, and switching between light and dark repaints the canvas without a reload.

## How it works

The plugin parses the DBML with `@dbml/core` at build time, converts it into tables, columns, relationships, notes, and their positions, and emits that model into the page payload, so the browser never parses DBML. At runtime the page mounts `DBMLBlock`, which lazily imports `@xyflow/svelte` and the two node components and renders the model as a canvas.

An invalid schema fails the build with the line and column of the first diagnostic. In dev it prints the same diagnostic and renders it in the frame.
