---
title: Component pages
order: 17
description: One page per component, rendering it live with controls, stories, and its own documentation.
---

A `type: component` page presents one component from a library configured as a module system. The component renders live inside an isolated iframe, its props are driven by controls generated from a schema, and the sibling story files become its stories.

## Frontmatter

```yaml
---
title: Button
type: component
data:
  system: nimtech
  component: MarButton
---
```

`data.system` names a system from the `modules` array in the config. `data.component` is the identifier the harness resolves. The page title is the human label and the two may differ freely.

## The folder

```
docs/components/Forms/Button/
├── index.md            type: component
├── schema.json         props, slots, events, mocks
├── default.story.tsx   the entry story
└── With_Icon.story.tsx a second story
```

Exactly one `type: component` page per folder. The folder becomes the sidebar parent and the stories list under the page.

## Where the detail lives

The system config, the harness composition, the schema contract, the control kinds, and every `nimpress modules` command are covered in [Component modules](/modules). The [component workshop example](/examples/components) walks a library from an empty config to a working page.
