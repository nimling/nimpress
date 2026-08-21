---
title: Component pages
order: 17
description: One page per component, rendering it live with controls, stories, and its own documentation.
---

`type: component` presents one component from a library configured as a module system. The component renders live inside an isolated iframe, its props are driven by controls generated from a schema, and the sibling story files become its stories.

Configuring the system itself, composing the harness, authoring the schema, and the `nimpress modules` commands are in [Component modules](/modules). This page is the page contract.

## Frontmatter

```yaml
---
title: Button
type: component
data:
  system: forms
  component: Button
  package: "@my-org/forms"
---
```

| Field | Required | Meaning |
|---|---|---|
| `data.system` | yes | The system name from the `modules` array in the config |
| `data.component` | yes | The technical identifier the harness resolves |
| `data.package` | no | The released package for package mode, overriding the system default |
| `data.file` | no | The source file, when the layout deviates from `<Component>/<Component>.<ext>` |
| `data.version` | no | Stamped by the export pipeline when a page is rewritten into package mode |
| `data.schema` | no | An inline schema layer merged over the schema file, for a small page local curation |

`title` is the human label and `data.component` is the identifier. They may differ freely.

## One page per folder

```
docs/components/Forms/Button/
├── index.md            type: component
├── schema.json         props, slots, events, mocks
├── default.story.tsx   the entry story
└── With_Icon.story.tsx a second story
```

A folder holds exactly one `type: component` page, enforced at build. The folder becomes the sidebar parent, the page appears inside it under its title, and the stories follow as siblings. Exactly one schema file sits beside `index.md`, `schema.json` or `schema.yml`.

## Grouping

Grouping comes from the file tree or from a declaration.

1. Physical: `docs/components/Inputs/TextInput/index.md` renders an `Inputs` group in the sidebar.

2. Declared: a top level `sidebar` block puts the page under a named group at the outer level, sibling to the physical group folders, without changing the folder or the url.

```yaml
sidebar:
  name: Inputs
  icon: "▤"
  style: "color: var(--np-brand)"
```

`name` is required and renders verbatim. Pages sharing a `name` land in the same group, and the latest `icon` and `style` among them wins. A `name` matching the page's own parent folder decorates that physical group instead of nesting a new one.

## The body

The body opens with a `## Usage` section carrying the import, then prose describing what the component is for, its behaviors, its slots, and its events. That description is authored by hand and is expected on every component page.

````md
## Usage

```ts
import { Button } from '@my-org/forms'
```

A button. Use it for the primary action in a form.
````

The live preview frame renders below the body automatically with a link into the workshop, followed by the source `CLAUDE.md` section. Neither is written in the markdown. A `CLAUDE.md` in the component source folder renders on the page and is editable in place during local dev, read only everywhere else.

## Layout

The page keeps the standard content width. Opening a story leaves the page and opens the full workshop screen, which is its own shell: a top bar, the sidebar, the component frame, and the docked props and console panels.

## Visibility

`visibility: dev-only` on the page keeps it in `nimpress dev` and out of the built bundle. The same field on the system config keeps a whole library out of the build.

## See it

[Component workshop](/examples/components) walks a library from an empty config to a working page with controls and stories.
