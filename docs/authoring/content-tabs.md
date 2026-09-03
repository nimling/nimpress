---
title: Content tabs
order: 23
tags: Authoring, Markdown
description: Tab groups for any content, code groups as the special case, anchors per tab, and linked tabs across the site.
---

Sometimes, it's desirable to group alternative content under different tabs, e.g. when describing how to access an API from different languages or environments. nimpress allows for beautiful and functional tabs, grouping code blocks and other content.

## Configuration

### Linked content tabs

Linked tabs switch together by label. Clicking `Python` in one group selects `Python` in every group on the page that carries that label, and the choice is remembered in the browser so every later page opens on the same label. A `{"linked":true}` payload on one `:::tabs` line links that group alone. Add the following lines to your configuration:

```json
{
  "tabs": { "linked": true }
}
```

## Usage

### Group code blocks

`:::code-group` groups fenced blocks into a tabbed view, one tab per fence, labeled by its language. The panels carry no padding, so the code sits edge to edge inside the frame, and the copy button copies the active tab.

````md
:::code-group
```ts
const value = 1
```
```python
value = 1
```
:::
````

### Group other content

`:::tabs` opens a group and `:::` closes it. Inside it, a line starting with `::tab` followed by the label opens a tab, and the tab runs until the next `::tab` line or the end of the group. Each marker sits on its own line with a blank line before it. Any markdown sits inside a tab: paragraphs, lists, tables, fences, and callouts.

```md
:::tabs
::tab Python

Install with `pip`.

::tab Go

Install with `go get`.
:::
```

### Embed content

A tab holds any block, including a callout, a code group, or another tab group. Those open with three colons, so a group holding one opens and closes with four, the same rule callouts follow when they nest. A group inside a tab follows it again: the outer group carries one colon more than the inner.

````md
::::tabs
::tab Python

:::tip
Python 3.12 or later.
:::

```python
value = 1
```

::tab Go

:::warning
Go modules are required.
:::
::::
````

### Anchor links

Every tab carries an id built from `tab-` and its label in lowercase with spaces as hyphens, so `Python` becomes `tab-python`. A link to `#tab-python` selects that tab and scrolls to the group, on load and on click, and the arrow keys move between the tabs of a focused group.

```md
[Install with Python](#tab-python)
```

