---
title: Markdown
order: 1
sidebar:
  name: Authoring
---

Built on `markdown-it` with a focused set of plugins. CommonMark plus the extensions below.

## Headings and anchors

`markdown-it-anchor` adds a permalink to every heading. The slug is derived from the heading text and used as the element id.

```md
## Section
```

Renders as `<h2 id="section">…</h2>`. The right rail table of contents uses these ids.

## Inline attributes

`markdown-it-attrs` accepts `{ }` attribute blocks after inline or block syntax.

```md
This is a paragraph. {.important #my-id}
```

## Callouts

Five callout containers, all `:::name optional title`:

```md
:::tip You can do this
Content here.
:::

:::note
Content here.
:::

:::warning
Content here.
:::

:::info
Content here.
:::

:::check
Content here.
:::
```

## Details

A collapsible block.

```md
:::details Click to expand
Content here.
:::
```

## Code groups

Group multiple fenced blocks into a tabbed view.

```md
:::code-group
\`\`\`ts
const value = 1
\`\`\`
\`\`\`python
value = 1
\`\`\`
:::
```

## Cards

A grid of cards.

```md
:::cards
[Get started](./guide){ .np-card icon=⚡ }
[OpenAPI](./openapi){ .np-card icon=🔌 }
:::
```

## Action buttons

A row of primary, secondary, or ghost buttons. Each item is a markdown link followed by a JSON object that configures it.

````md
:::actions {"align":"start"}
[Get started](/guide){"variant":"primary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"secondary"}
[Learn more](/docs/theming){"variant":"ghost"}
:::
````

Directive payload fields:

1. `align` on the outer `:::actions` directive sets row alignment: `start`, `center`, `end`.

2. `variant` on each link sets button style: `primary`, `secondary`, `ghost`.

## Feature grid

A responsive grid of feature cards. Each card is a `:::feature` directive whose opening line carries a JSON object with title, icon, and an optional link. The body of the directive is markdown.

The outer container uses **four colons** (`::::features`) so the inner three colon `:::feature` close markers do not collide with the outer close.

````md
::::features {"columns":3}
:::feature {"icon":"⚡","title":"Fast","link":"/guide"}
Vite plugin, shiki at build time.
:::

:::feature {"icon":"/icons/themable.svg","title":"Themable","link":"/docs/theming"}
Tokens overridable in your own CSS.
:::

:::feature {"icon":"🔌","title":"OpenAPI built in","link":"/docs/openapi"}
Render any 3.1 spec with hash deep links.
:::
::::
````

Directive payload fields:

1. `columns` on `::::features` pins the grid to that column count. Omit for auto fit.

2. Each `:::feature` accepts `title`, `icon`, and `link`. The body is markdown rendered inside the card.

3. `icon` accepts either an ASCII or emoji character (`⚡`, `📚`, `→`) **or** a path to an image asset (`/icons/fast.svg`, `./art/themable.png`, `https://...`). The renderer detects the form automatically.

## Code fences

Syntax highlighting is rendered at build time with `shiki` using the `github-dark` theme. The language label appears in the block header.

Aliases: `curl` and `sh`/`zsh`/`console` render as `bash`. `hurl` renders as `http`.

## Mermaid

See [mermaid.md](./mermaid.md).

## Definition lists

See [definition-lists.md](./definition-lists.md).

## Footnotes

`markdown-it-footnote` enabled. Use `[^1]` syntax.

## Task lists

`markdown-it-task-lists` enabled. Use `- [ ]` and `- [x]`.

## Live components

The `:::component` directive renders a live component from a configured module system inline in any page, through the same iframe harness the workshop uses:

```markdown
:::component {"component":"MarButton","props":{"label":"Save"},"height":"12em"}
:::
```

1. `component` alone suffices when one system is configured; `system` names it otherwise.

2. `story` selects a story file by its base name, `props` and `slots` travel base64 encoded into the frame, `height` sizes it, default `20em`.

3. `:::component MarButton` is the shorthand for the bare component with its default controls.

See [modules.md](./modules.md) for systems and the harness.
