---
title: Team pages
order: 13.1
tags: Page types
description: A person grid rendered from frontmatter data, with a photo or a monogram, a name, a role, a bio, and links per member.
---

A `type: team` page renders a person grid from the `members` list in its frontmatter: a photo or a monogram, the name as a heading with its own anchor, a role, a bio, and links. The markdown body renders above the grid. [Team](/examples/team) is the example.

## Frontmatter

```yaml
---
title: Team
type: team
data:
  align: center
  columns: 3
  members:
    - name: Ada Lovelace
      role: Founder
      image: /assets/team/ada.jpg
      bio: Writes the first programs and keeps every note in a `README`.
      links:
        - text: GitHub
          link: https://github.com/nimling
---
```

`data.members` is required with at least one member; lint fails a member without a name.

## Member fields

| Field | Description |
|---|---|
| `name` | Required. Rendered as the heading of the card, so the right rail lists every person. |
| `role` | One short line under the name. |
| `image` | A photo url under the assets base. Without it a monogram from the initials renders. |
| `bio` | One markdown paragraph. |
| `links` | A list of `text` and `link` pairs. A full url opens in a new tab, a site path routes in place. |

`data.columns` pins the column count; the default auto fits from two to four. `data.align` is `start` or `center`.

## Restyling

The grid, the card, the image, the monogram, the name, the role, the bio, and the links carry documented classes. See [Page types styling](/styling/page-types).
