---
title: OpenAPI renderer
order: 6
sidebar:
  name: Authoring
---

A page with `type: openapi` and a `spec` field renders an OpenAPI 3.1 reference page.

## Frontmatter

```yaml
---
title: Bookable API
type: openapi
spec: ./bookable.json
---
```

`spec` is resolved relative to the markdown file. The plugin loads it at build time, resolves every `$ref`, and pre renders markdown in description fields so descriptions support the full markdown pipeline.

## Layout

The rendered page contains:

1. A title row with the spec version pill.

2. A server table listing every entry from `servers` with a Base URL and Description column.

3. The top level spec description.

4. One card per tag, each card listing its operations.

5. A Schemas card listing reusable component schemas.

## Hash deep links

Routes:

```
#operation/<operationId>
#schema/<name>
#tag/<tagName>
```

The OpenAPI root listens for `hashchange` and `popstate` and scrolls the target into view. A short flash highlight marks the landing element.

## Operation card

Each operation card has a left column with the description, parameters, request body, and responses, and a right column carrying:

1. A `TryPanel` with field inputs for path, query, headers, and body, plus an auth scheme selector wired to `securitySchemes`. State persists in `localStorage`.

2. A `CodeExamples` block with tabs for `curl`, `typescript`, and `python`. The examples are derived from the same `TryState` object the panel mutates, so changing a header in the panel immediately updates the curl line.

## Schemas

Schemas render with a compact tree of property rows including type, format, required flag, and rendered description. Nested objects expand inline.
