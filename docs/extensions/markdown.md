---
title: Markdown
description: The markdown pipeline: headings, callouts, tabs, code blocks, grids, formatting, images, icons, math, and the directives.
order: 21
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

Callouts, also known as admonitions, are an excellent choice for including side content without significantly interrupting the document flow. A callout is a container opened with `:::` and the type name, and closed with `:::`.

```md
:::tip
Content here.
:::
```

The title row shows the type name in sentence case. Every type takes a custom title, a removed title, a nested callout, and the collapsible and inline forms below. See the [Callouts](/examples/callouts) example for all thirteen rendered.

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

## Details

A collapsible block.

```md
:::details Click to expand
Content here.
:::
```

## Content tabs

"Sometimes, it's desirable to group alternative content under different tabs, e.g. when describing how to access an API from different languages or environments." A tab group holds any markdown, a code group is the special case that renders its fences without padding, every tab carries an anchor, and tabs sharing a label switch together when the site links them. See the [Content tabs](/examples/tabs) example for every form rendered.

### Linked content tabs

Linked tabs switch together by label. Clicking `Python` in one group selects `Python` in every group on the page that carries that label, and the choice is remembered in the browser so every later page opens on the same label. A `{"linked":true}` payload on one `:::tabs` line links that group alone. Add the following lines to your configuration:

```json
{
  "tabs": { "linked": true }
}
```

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
[Learn more](/theming){"variant":"ghost"}
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

## Code blocks

Code blocks and examples are an essential part of technical project documentation. Syntax highlighting renders at build time with `shiki` using the `github-dark` theme, and the block header carries the language label and a copy button. The aliases `curl`, `sh`, `zsh`, and `console` render as `bash`, and `hurl` renders as `http`.

A JSON object after the language on the info line shapes the block. Every option below is rendered on one page in the [Code blocks](/examples/code-blocks) example.

| Field | Effect |
|---|---|
| `title` | Renders in the block header in place of the language label |
| `lines` | Renders a line number column that the copy button leaves out |
| `start` | Sets the first line number and switches the column on |
| `highlight` | Marks the given lines, as numbers and ranges separated by commas |

### Add a title

`title` renders in the block header in place of the language label, and the language moves to a small tag at the right.

```ts {"title":"client.ts"}
export const client = createClient({ retries: 3 })
```

````md
```ts {"title":"client.ts"}
export const client = createClient({ retries: 3 })
```
````

### Add annotations

A comment ending with `(1)` becomes a numbered marker, and the number is looked up in an ordered list written directly after the fence. Clicking the marker opens that list item beside it with its markdown, and the list itself leaves the flow. Only a comment counts, in the comment syntax of the fence language, so a `(1)` inside a string stays text.

```ts
const client = createClient({ retries: 3 }) // (1)
const label = 'attempt (1)'
```

1. Three attempts, with a backoff between each one. Set `retries` to `0` to fail on the first error.

````md
```ts
const client = createClient({ retries: 3 }) // (1)
const label = 'attempt (1)'
```

1. Three attempts, with a backoff between each one. Set `retries` to `0` to fail on the first error.
````

### Strip comments

A `!` after the closing parenthesis strips the comment characters around the marker, so the line reads as code with a marker at its end.

```bash
pnpm install # (1)!
```

1. Installs every dependency from the lockfile.

````md
```bash
pnpm install # (1)!
```

1. Installs every dependency from the lockfile.
````

### Add line numbers

`lines` renders a line number column, and `start` sets the first number. `start` on its own switches the column on. The copy button copies the code without the numbers.

```ts {"start":10}
const response = await fetch(url)
const body = await response.json()
```

````md
```ts {"start":10}
const response = await fetch(url)
const body = await response.json()
```
````

### Highlight specific lines

`highlight` marks lines with the `np-code-line-highlight` class. It takes single numbers and ranges separated by commas, counted from the first line of the block whatever `start` says.

```ts {"highlight":"2-3"}
const response = await fetch(url)
if (!response.ok) throw new Error(response.statusText)
const body = await response.json()
return body
```

````md
```ts {"highlight":"2-3"}
const response = await fetch(url)
if (!response.ok) throw new Error(response.statusText)
const body = await response.json()
return body
```
````

## Mermaid

See [mermaid.md](./mermaid.md).

## DBML

A ` ```dbml ` fence renders an interactive entity relationship diagram instead of a code block. See [dbml.md](./dbml.md).

## Definition lists

See [definition-lists.md](./definition-lists.md).

## Footnotes

`markdown-it-footnote` enabled. Use `[^1]` syntax.

## Task lists

`markdown-it-task-lists` enabled. Use `- [ ]` and `- [x]`.

## Formatting

nimpress provides support for several HTML elements that can be used to highlight sections of a document or apply specific formatting. Highlighting, insertion, deletion, sub and superscripts, and keyboard keys are on without configuration.

### Highlight text

Text can be highlighted with a simple syntax, which is more convenient than directly using the corresponding `mark`, `ins`, and `del` HTML tags:

```md
- ==This was marked==
- ^^This was inserted^^
- ~~This was deleted~~
```

### Sub- and superscripts

Text can be sub- and superscripted with a simple syntax, which is more convenient than directly using the corresponding `sub` and `sup` HTML tags:

```md
- H~2~O
- A^T^A
```

### Add keyboard keys

Keyboard keys can be rendered with a simple syntax. Consecutive keys are separated by a plus sign, and names such as `ctrl`, `cmd`, `shift`, `enter`, and `esc` render as their glyphs:

```md
++ctrl+alt+del++
```

## Images

While images are first-class citizens of markdown and part of the core syntax, it can be difficult to work with them. nimpress makes working with images more comfortable, providing styles for image alignment and image captions.

### Image alignment

Images can be aligned by adding the respective alignment direction via the `align` attribute, `align=left` or `align=right`. The image floats beside the paragraphs that follow it until the next heading:

```md
![Image title](./image.png){align=left}
```

### Image captions

An image alone in a paragraph with a title renders as a figure with the title as its caption:

```md
![Image title](./image.png "Image caption")
```

### Image lazy-loading

Every image after the first one on a page carries `loading="lazy"`, so browsers fetch it only when the reader scrolls near it. Nothing needs to be written for it.

### Light and dark mode

If you want to show different images for light and dark color schemes, you can append a `#only-light` or `#only-dark` hash fragment to the image URL:

```md
![Image title](./image-light.png#only-light)
![Image title](./image-dark.png#only-dark)
```

### Lightbox and zoom

An image with the `zoom` class opens full size in a lightbox on click, closed by escape or a click outside:

```md
![Image title](./image.png){.zoom}
```

To open every image in the prose that way, add the following lines to your configuration:

```json
{
  "images": {
    "lightbox": true
  }
}
```

See [Formatting and images](/examples/formatting) for every form rendered.


## Icons and emojis

One of the best features of nimpress is the possibility to use more than 2,000 icons and thousands of emojis in your project documentation with practically zero additional effort. Moreover, custom icons can be added and used in your configuration and documents.

### Use emojis

Emojis can be integrated in markdown by putting the shortcode of the emoji between two colons:

```md
:rocket:
```

### Use icons

Icons can be used similar to emojis, by referencing a lucide icon name with the `lucide-` prefix. The svg is inlined at build time inside a `np-icon` span, so it follows the text color and size:

```md
:lucide-braces:
```

A site adds its own icons by pointing the `icons` config field at a folder of svg files. `:name:` then resolves to `<icons>/name.svg`. Add the following lines to your configuration:

```json
{
  "icons": "./assets/icons"
}
```

The same shortcode works in `sidebar.icon` and in the footer `social` icons. An unknown shortcode stays as text, and a `lucide-` name that does not exist prints a warning during the build.

### with colors

Custom CSS classes can be added to icons in braces after the shortcode, and a rule in the site stylesheet colors them:

```md
:lucide-heart:{.brand}
```

```css
.np-icon.brand {
  color: var(--np-brand);
}
```

The `lg` class ships with nimpress and grows the icon to one and a half times the text size.

### with animations

Similar to adding colors, it's just as easy to add animations to icons by using an additional style sheet, defining a `@keyframes` rule and adding a dedicated CSS class to the icon:

```css
@keyframes heart {
  0%, 40%, 80%, 100% { transform: scale(1); }
  20%, 60% { transform: scale(1.15); }
}
.np-icon.heart {
  animation: heart 1000ms infinite;
}
```

## Math

KaTeX is a lightweight library that focuses on speed and simplicity. nimpress renders every formula with it as MathML in the browser, so no stylesheet and no fonts are loaded, and the katex code reaches only pages that carry math.

### Use block syntax

Blocks must be enclosed in `$$...$$` on separate lines:

```md
$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$
```

### Use inline block syntax

Inline blocks must be enclosed in `$...$` with no space inside the dollar signs, so a price such as `$5` stays text:

```md
The mass energy equivalence $E = mc^2$ sits inside a sentence.
```

A site that writes dollar signs in prose turns the syntax off. Add the following lines to your configuration:

```json
{
  "math": false
}
```

See [Icons and math](/examples/icons-math) for every form rendered.


## Live components

The `:::component` directive renders a live component from a configured module system inline in any page, through the same iframe harness the workshop uses:

```markdown
:::component {"component":"MarButton","props":{"label":"Save"},"height":"12em"}
:::
```

1. `component` alone suffices when one system is configured; `system` names it otherwise.

2. `story` selects a story file by its base name, `props` and `slots` travel base64 encoded into the frame, `height` sizes it, default `20em`.

3. `:::component MarButton` is the shorthand for the bare component with its default controls.

See [Component modules](/modules) for systems and the harness.

## Restyling the output

Every element the markdown pipeline produces carries a documented class. See [Prose and markdown styling](/styling/prose).
