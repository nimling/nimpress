---
title: Lists
order: 32
tags: Authoring, Markdown
description: Unordered, ordered, definition, and task lists.
---

nimpress supports several flavors of lists that cater to different use cases, including unordered lists and ordered lists, which are supported through standard markdown, as well as definition lists and task lists, which are on without configuration.

## Usage

### Use unordered lists

Unordered lists can be written by prefixing a line with a `-`, `*` or `+` list marker, all of which can be used interchangeably. Nested lists are indented by two spaces:

```md
- Nulla et rhoncus turpis.
- Nam vulputate tincidunt fringilla.
  - Nullam dignissim ultrices urna non auctor.
```

### Use ordered lists

Ordered lists must start with a number immediately followed by a dot. The numbers do not need to be consecutive and can all be set to `1.`:

```md
1. Vivamus id mi enim.
2. Morbi eget dapibus felis.
```

The docs of this site write ordered lists at column zero with a blank line between entries and `1.1.` for sub items, the form [Authoring documentation](/authoring) describes.

### Use definition lists

Lists of arbitrary key value pairs, e.g. the parameters of functions or modules, can be enumerated with a simple syntax, a term on one line and its description on the next starting with a colon:

```md
term_name
: One line description.
```

See [Definition lists](/authoring/definition-lists).

### Use task lists

Unordered list items can be prefixed with `[ ]` to render an unchecked checkbox or `[x]` to render a checked checkbox, allowing for the definition of task lists:

```md
- [x] Lorem ipsum dolor sit amet
- [ ] Vestibulum convallis sit amet nisi a tincidunt
```
