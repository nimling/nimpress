---
title: Pricing pages
order: 13.2
tags: Page types
description: A row of tiers rendered from frontmatter data, each with a price line, a benefit list, and one action.
---

A `type: pricing` page renders a row of tiers from the `tiers` list in its frontmatter: a name, a price line, a description, a benefit list with a check per item, and one action. A highlighted tier carries the brand border. The markdown body renders above the tiers and `data.footnote` renders as the small print under them. [Pricing](/examples/pricing) is the example.

## Frontmatter

```yaml
---
title: Pricing
type: pricing
data:
  footnote: Prices exclude tax.
  tiers:
    - name: Spark
      price: "€49"
      period: per month
      description: Early access and a direct line to the team.
      highlight: true
      benefits:
        - Early access to new features
        - Access to the team
      action:
        text: Join Spark
        link: /changelog
        variant: primary
---
```

`data.tiers` is required with at least one tier; lint fails a tier without a name.

## Tier fields

| Field | Description |
|---|---|
| `name` | Required. The heading of the tier. |
| `price` | The price line, any string. |
| `period` | The small text beside the price, such as `per month`. |
| `description` | One sentence under the price. |
| `benefits` | A list of one line markdown items, each with a check mark. |
| `action` | `text`, `link`, and a `variant` of `primary`, `secondary`, or `ghost`. |
| `highlight` | `true` marks the recommended tier with the brand border. |

`data.columns` pins the column count; the default is the tier count up to four, and every tier stacks below 900px.

## Restyling

The grid, the tier, the highlight, the price, the benefits, the action, and the footnote carry documented classes. See [Page types styling](/styling/page-types).
