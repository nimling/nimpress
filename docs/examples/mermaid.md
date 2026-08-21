---
title: Mermaid diagrams
order: 34
description: Flowcharts, sequences, state machines, and entity relationships rendered from a fenced block.
---

A ` ```mermaid ` fence renders as a diagram. The library loads only on pages that carry one, so a page with no diagram downloads none of it.

## A flowchart

```mermaid
flowchart LR
  A[Markdown file] --> B{type?}
  B -->|doc| C[Doc page]
  B -->|openapi| D[Reference page]
  B -->|dbml| E[Schema viewer]
  C --> F[Static site]
  D --> F
  E --> F
```

````md
```mermaid
flowchart LR
  A[Markdown file] --> B{type?}
  B -->|doc| C[Doc page]
  B -->|openapi| D[Reference page]
  B -->|dbml| E[Schema viewer]
  C --> F[Static site]
  D --> F
  E --> F
```
````

## A sequence

```mermaid
sequenceDiagram
  participant R as Reader
  participant S as Static site
  participant A as API
  R->>S: Open the reference page
  S-->>R: Page shell and body chunk
  R->>S: Press Try
  S->>A: POST /orders
  A-->>S: 201 Created
  S-->>R: Response body in the panel
```

## A state machine

```mermaid
stateDiagram-v2
  [*] --> Received
  Received --> Baking: accepted
  Baking --> Ready: finished
  Ready --> [*]
  Received --> Cancelled: rejected
  Cancelled --> [*]
```

## An entity relationship

```mermaid
erDiagram
  PASTRY ||--o{ ORDER_LINE : appears_in
  ORDER ||--|{ ORDER_LINE : contains
  PASTRY {
    uuid id
    string name
    int price
  }
```

For a real database rather than a sketch, reach for [DBML](/extensions/dbml) instead. It reads the schema you already maintain and renders columns, keys, and relationships you can click through. The [schema viewer example](/examples/schema-viewer) shows the difference.

## Theming

Diagrams inherit the site theme from `tokens.css` and repaint when the reader switches between light and dark. There is no per diagram color to set.

The supported diagram list and the loading behavior are in [Mermaid](/extensions/mermaid).
