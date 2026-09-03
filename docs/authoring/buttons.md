---
title: Buttons
order: 24
tags: Authoring, Markdown
description: Primary, secondary, and ghost buttons in an action row, for documents and landing pages with a call to action.
---

nimpress provides dedicated styles for primary and secondary buttons that can be added to any link, label or button element. This is especially useful for documents or landing pages with dedicated call-to-actions. Buttons live in a `:::actions` row, and each link in it carries a JSON payload naming its variant.

## Usage

### Add a button

````md
:::actions {"align":"start"}
[Get started](/guide){"variant":"primary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"secondary"}
[Learn more](/theming){"variant":"ghost"}
:::
````

Directive payload fields:

1. `align` on the outer `:::actions` directive sets row alignment: `start`, `center`, `end`.

2. `variant` on each link sets button style: `primary`, `secondary`, `ghost`.

