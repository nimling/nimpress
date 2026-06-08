# Markdown

Built on `markdown-it` with a focused set of plugins. CommonMark plus the extensions listed below.

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

A grid of cards. Each card is a fenced block with `{href icon}` attributes.

```md
:::cards
[Get started](./guide){ .np-card icon=⚡ }
[OpenAPI](./openapi){ .np-card icon=🔌 }
:::
```

## Code fences

Syntax highlighting is rendered at build time with `shiki` using the `github-dark` theme. The language label appears in the block header.

Aliases: `curl` and `sh`/`zsh`/`console` render as `bash`, `hurl` renders as `http`.

## Mermaid

See [mermaid.md](./mermaid.md).

## Definition lists

See [definition-lists.md](./definition-lists.md).

## Footnotes

`markdown-it-footnote` enabled. Use `[^1]` syntax.

## Task lists

`markdown-it-task-lists` enabled. Use `- [ ]` and `- [x]`.
