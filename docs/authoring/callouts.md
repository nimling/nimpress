---
title: Callouts
order: 22
tags: Authoring, Markdown
description: Thirteen callout types, a custom or removed title, nested, collapsible, and inline forms.
---

Callouts, also known as admonitions, are an excellent choice for including side content without significantly interrupting the document flow. nimpress provides thirteen types of callouts and allows for the inclusion and nesting of arbitrary content. Every callout is a fenced container, three colons and a type name, closed by three colons.

```md
:::tip
Content here.
:::
```

The title row shows the type name in sentence case. Every type takes a custom title, a removed title, a nested callout, and the collapsible and inline forms below. See the [Callouts](/examples/callouts) example for all thirteen rendered.

## Usage

### Change the title

Text after the type name on the opening line becomes the title.

```md
:::note Custom title
Content here.
:::
```

### Remove the title

Two double quotes as the title remove the title row, so the body stands alone.

```md
:::note ""
Content here.
:::
```

### Nested callouts

A callout nests inside another. The outer container opens and closes with four colons so the inner one with three closes first.

```md
::::note
Outer content.

:::tip
Inner content.
:::
::::
```

### Collapsible blocks

A JSON payload at the end of the opening line shapes the callout. `collapsible` renders the callout as a details element that starts closed, and `open` beside it starts it expanded. A custom title and a payload sit together on the line.

```md
:::tip {"collapsible":true}
Content here.
:::

:::tip Custom title {"collapsible":true,"open":true}
Content here.
:::
```

### Inline blocks

`inline` set to `start` or `end` floats the callout beside the block that follows it on wide viewports, and stretches it to full width below 800px. Declare the callout before the block it sits beside.

```md
:::info {"inline":"end"}
Content here.
:::

The paragraph that flows beside the callout.
```

### Supported types

| Type | Default title |
|---|---|
| `tip` | Tip |
| `note` | Note |
| `warning` | Warning |
| `info` | Info |
| `check` | Check |
| `abstract` | Abstract |
| `success` | Success |
| `question` | Question |
| `failure` | Failure |
| `danger` | Danger |
| `bug` | Bug |
| `example` | Example |
| `quote` | Quote |

### Details

```md
:::details Click to expand
Content here.
:::
```

