# DBML diagrams

The database diagram surface in nimpress. One DBML source, one interactive entity relationship diagram, either inline in a page or as a page of its own.

## The pieces

1. `@dbml/core` parses the DBML at build time inside the plugin. The browser never sees DBML, only the diagram model.

2. `@dineug/erd-editor` renders the model as a custom element, mounted read only and lazily imported by `DbmlBlock`.

3. `src/dbml/erd.ts` is the converter between the two. Every mapping decision from DBML to the diagram lives there and nowhere else.

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

1. The info line takes an optional JSON object. `height` is the only field, `520px` by default.

2. The plugin rewrites the fence to `<div class="np-dbml" data-schema="…">` carrying the base64 diagram model, and the page mounts `DbmlBlock` over it.

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

## What the converter maps

1. Tables, columns, data types, defaults, and notes.

2. Primary keys, composite primary keys from an `indexes` block marked `pk`, unique columns, not null columns, and auto increment.

3. Refs as relationship lines. The endpoint with cardinality `1` is the parent; a one to one ref takes the right hand side as the parent.

4. Named and unique indexes.

5. `headercolor` as the table header color.

6. Standalone `Note` blocks as sticky notes placed to the right of the tables.

7. Schema qualified table names when the schema is not `public`.

## Authoring the source

1. One `.dbml` file per page. Do not split a schema across files and stitch it in the markdown.

2. Write a `Note` on every table. The diagram shows table comments only when at least one table carries one, so a schema with no notes renders tighter.

3. Same for column notes and defaults: the columns appear in the diagram only when the schema uses them.

4. Declare `Project x { database_type: '...' }` so the generated SQL view in the toolbar matches the real database.

5. Name every index. An unnamed index renders under a generated label.

## What is wrong if you see it

1. DBML parsed in the browser. Parsing is a build time step; the page payload carries the diagram model.

2. A component importing `@dineug/erd-editor` statically. It is a lazy import inside `DbmlBlock`, see the chunk cycles rule.

3. Mapping logic added to `DbmlBlock` or a page renderer. It belongs in `src/dbml/erd.ts`.

4. A `type: dbml` page with a long markdown body. Move the prose to a sibling `doc` page and link to it.

5. A schema pasted into a fenced ` ```sql ` block as a stand in for a diagram.
