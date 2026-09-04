---
title: Custom page types
order: 13.3
tags: Page types
description: Register a Svelte component as a page type, or replace the renderer of a built in one, from the config.
---

Every page type nimpress ships is a Svelte component that receives the page and renders it. The `pageTypes` block in the config maps a type name to a component file of your own, so a site adds a type the framework does not have, or replaces the renderer of one it does. [Spotlight](/examples/spotlight) is a page rendered by a custom type.

## Configuration

### Register a type

A new name registers a type. Add the following lines to your configuration:

```json
{
  "pageTypes": { "spotlight": "./docs/types/Spotlight.svelte" }
}
```

A page then selects it with `type: spotlight`, and lint accepts the name.

### Replace a built in renderer

A built in name replaces its renderer for every page of that type:

```json
{
  "pageTypes": { "hero": "./docs/types/Hero.svelte" }
}
```

## The component contract

1. A custom type receives `page`, the shell merged with the loaded body: `slug`, `path`, `type`, `frontmatter`, `html`, `headings`. It renders inside the shell, so the sidebar, the header, and the footer are already there.

2. A replacement for `hero` or `fullpage` receives `page` as the shell and `bodyPromise`, the same props the built in renderer takes, because those types render their band before the body arrives.

3. Every built in renderer and every shell piece is exported from `@nimtech/nimpress`, so a component composes them. Rendering `<Page {page} />` under a band of your own gives the prose column, the tags, the feedback widget, and the hydration of every directive for free.

4. A `<Component>.schema.json` beside the component declares the `data` fields: `required` names the keys a page must set, and `properties` maps a key to a json `type`. Lint validates every page of the type against it.

```json
{
  "required": ["kicker"],
  "properties": {
    "kicker": { "type": "string" },
    "accent": { "type": "string" }
  }
}
```

5. Classes are the component's own. The public `np-` classes stay on the pieces it composes, so a site stylesheet still reaches them.

## Restyling

A custom component styles itself; the pieces it composes keep their documented classes. See [Page types styling](/styling/page-types).
