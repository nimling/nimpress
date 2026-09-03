---
title: Callouts
order: 38
description: Every callout type rendered, with a custom title, a removed title, a nested callout, a collapsible callout, and an inline callout.
---

Every callout type on one page, followed by each form a callout takes. The source of each block sits under it, so copy the fence that matches what you see. The reference is [Markdown](/extensions/markdown).

## Every type

:::tip
Opt in advice that improves outcomes.
:::

:::note
Context the reader benefits from but can skip.
:::

:::warning
Things that go wrong if ignored.
:::

:::info
Neutral background.
:::

:::check
A verification step.
:::

:::abstract
A summary of the section that follows.
:::

:::success
The outcome the reader sees when a step worked.
:::

:::question
A question the reader is likely to ask, answered in the body.
:::

:::failure
The outcome the reader sees when a step did not work.
:::

:::danger
An action that loses data or cannot be undone.
:::

:::bug
A known defect and its workaround.
:::

:::example
A worked example set apart from the prose.
:::

:::quote
A quotation with its source.
:::

```md
:::tip
Opt in advice that improves outcomes.
:::
```

## A custom title

:::note Where the schema lives
Beside the page, in the schema file.
:::

```md
:::note Where the schema lives
Beside the page, in the schema file.
:::
```

## A removed title

:::note ""
The body stands alone without a title row.
:::

```md
:::note ""
The body stands alone without a title row.
:::
```

## A nested callout

::::note
The outer callout opens and closes with four colons.

:::tip
The inner callout closes first with three.
:::
::::

```md
::::note
The outer callout opens and closes with four colons.

:::tip
The inner callout closes first with three.
:::
::::
```

## A collapsible callout

:::tip {"collapsible":true}
This callout starts closed.
:::

:::tip Starts expanded {"collapsible":true,"open":true}
This callout starts open and carries a custom title.
:::

```md
:::tip {"collapsible":true}
This callout starts closed.
:::

:::tip Starts expanded {"collapsible":true,"open":true}
This callout starts open and carries a custom title.
:::
```

## An inline callout

:::info {"inline":"end"}
This callout floats beside the paragraph on wide viewports and stretches to full width below 800px.
:::

The callout is declared before this paragraph, so the paragraph flows beside it. The text keeps wrapping around the callout until the next heading clears the float, which is why a short paragraph beside a tall callout leaves empty space under the text. Give the callout a paragraph long enough to fill the space beside it, or set `inline` to `start` to float it on the other side.

```md
:::info {"inline":"end"}
This callout floats beside the paragraph on wide viewports.
:::

The paragraph that flows beside the callout.
```
