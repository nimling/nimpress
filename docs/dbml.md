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

The fence accepts a JSON object on the info line. `height` sizes the frame, `520px` by default.

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

The frame is read only. Pan by dragging, zoom with the wheel, and use the minimap in the corner to jump around a wide schema. The toolbar switches between the diagram, a visualization view, and the generated SQL for the database vendor the schema declares. The fullscreen button sits in the bottom right corner of the frame.

## Theme

The diagram follows the site theme. Switching between light and dark repaints the canvas without a reload.

## How it works

The plugin parses the DBML with `@dbml/core` at build time and emits the diagram model into the page payload, so the browser never parses DBML. At runtime the page mounts `DbmlBlock`, which lazily imports the `@dineug/erd-editor` custom element and hands it the model.

An invalid schema fails the build with the line and column of the first diagnostic. In dev it prints the same diagnostic and renders it in the frame.
