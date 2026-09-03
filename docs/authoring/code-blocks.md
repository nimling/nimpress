---
title: Code blocks
order: 26
tags: Authoring, Markdown
description: Fenced code with build time highlighting, a title, line numbers, highlighted lines, annotations, and a copy button.
---

Code blocks and examples are an essential part of technical project documentation. nimpress highlights every fence at build time with shiki, so the browser downloads no highlighter, and the info line after the language takes a title, line numbers, highlighted lines, and annotations.

A JSON object after the language on the info line shapes the block. Every option below is rendered on one page in the [Code blocks](/examples/code-blocks) example.

| Field | Effect |
|---|---|
| `title` | Renders in the block header in place of the language label |
| `lines` | Renders a line number column that the copy button leaves out |
| `start` | Sets the first line number and switches the column on |
| `highlight` | Marks the given lines, as numbers and ranges separated by commas |

## Usage

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

