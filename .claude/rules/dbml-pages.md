# DBML diagrams

The database diagram surface in nimpress. One DBML source, one interactive entity relationship diagram, either inline in a page or as a page of its own.

## The pieces

1. `@dbml/core` parses the DBML at build time inside the plugin. The browser never sees DBML, only the diagram model.

2. `@xyflow/svelte` renders the model as a canvas of nodes and edges, lazily imported by `DBMLBlock` together with the node components.

3. `DbmlTable.svelte` and `DbmlNote.svelte` are the node components. Every table card, column row, flag, and sticky note is nimpress markup styled from `tokens.css`, so the diagram follows the site theme.

4. `src/dbml/erd.ts` is the converter. Every mapping decision from DBML to the diagram, including the table positions and which side of a table an edge leaves from, lives there and nowhere else.

## Inline fence

A ` ```dbml ` fence renders inline in any page that hydrates markdown: `doc`, `changelog`, and `roadmap`.

````md
```dbml
Table users {
  id uuid [pk]
  email varchar(255) [not null, unique]
}
```
````

1. The info line takes an optional JSON object. `height` is the only field, `520px` by default. Pick it from the table count: the reader pans by dragging whatever the tables do not cover, so a cramped frame has nothing to grab.

2. The plugin rewrites the fence to `<div class="np-dbml" data-schema="…">` carrying the base64 diagram model, and the page mounts `DBMLBlock` over it.

3. An inline diagram mounts behind a click to explore shield so the frame never captures page scrolling. Clicking it activates the frame and swaps the shield for a gesture hint. `DbmlPage` passes `activateOnMount` because there the diagram is the page.

## Page type

`type: dbml` turns one `.dbml` file into a full page viewer.

```yaml
---
title: Bookable schema
type: dbml
spec: ./bookable.dbml
description: Every table the booking api reads and writes.
---
```

1. `spec` is required and resolves relative to the markdown file. Lint fails when it is missing or does not resolve.

2. The markdown body renders as the page header above the diagram. Keep it to a paragraph or two; the diagram is the page.

3. The page has no right rail. The diagram fills the viewport under the header.

4. The `.dbml` file lands in the build output beside the page, so readers can open the source.

## The interaction contract

Pan by dragging empty canvas or by the minimap. Zoom with the scroll wheel, with the control buttons, or by the minimap. Drag a table to move it, which is a view only rearrangement and is never written back to the `.dbml` file.

The starting layout comes from `src/dbml/erd.ts`, which positions the tables at build time. A schema that always reads badly is fixed there or in the source order, not by asking readers to drag.

Scroll zoom is armed only once the frame is active, so an inline diagram never captures page scrolling before the reader clicks it.

## What the converter maps

1. Tables, columns, data types, defaults, and notes.

2. Primary keys, composite primary keys from an `indexes` block marked `pk`, unique columns, not null columns, and auto increment.

3. Refs as relationship lines drawn between the two columns themselves, entering the side of each table that faces the other. The endpoint with cardinality `1` is the parent; a one to one ref takes the right hand side as the parent. A to many line carries an arrow head at the child end.

4. Named and unique indexes.

5. `headercolor` as the table header color.

6. Standalone `Note` blocks as sticky notes placed to the right of the tables.

7. Schema qualified table names when the schema is not `public`.

## Authoring the source

1. One `.dbml` file per page. Do not split a schema across files and stitch it in the markdown.

2. Write a `Note` on every table. It renders as a second line inside the table header, so a schema with notes reads without hovering anything.

3. Write column notes too. A column note becomes the hover title on that row.

4. Name every index. An unnamed index renders under a generated label in the table footer.

5. Set `headercolor` on a table to group it visually. Tables without one take the brand color.

## What is wrong if you see it

1. DBML parsed in the browser. Parsing is a build time step; the page payload carries the diagram model.

2. A component importing `@xyflow/svelte` from shared code, or `DbmlTable.svelte` and `DbmlNote.svelte` imported statically. All three are lazy imports inside `DBMLBlock`, see the chunk cycles rule.

3. Mapping or layout logic added to `DBMLBlock` or a page renderer. It belongs in `src/dbml/erd.ts`.

3.1. Colors written into the node components as literals. The cards read `tokens.css` so light and dark both work.

4. A `type: dbml` page with a long markdown body. Move the prose to a sibling `doc` page and link to it.

5. A schema pasted into a fenced ` ```sql ` block as a stand in for a diagram.
