---
title: Code blocks
status: new
order: 40
description: A titled fence, line numbers from a start, highlighted lines, annotations that open a tip, and a stripped comment, each rendered with its source under it.
---

Every code block option on one page. The source of each block sits under it, so copy the fence that matches what you see. The reference is [Markdown](/extensions/markdown).

## A title

```ts {"title":"client.ts"}
export const client = createClient({ retries: 3 })
```

````md
```ts {"title":"client.ts"}
export const client = createClient({ retries: 3 })
```
````

## Line numbers

```ts {"lines":true}
const response = await fetch(url)
const body = await response.json()
```

````md
```ts {"lines":true}
const response = await fetch(url)
const body = await response.json()
```
````

## Line numbers from a start

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

## Highlighted lines

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

## Annotations

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

## A stripped comment

```bash {"title":"install.sh"}
pnpm install # (1)!
```

1. Installs every dependency from the lockfile.

````md
```bash {"title":"install.sh"}
pnpm install # (1)!
```

1. Installs every dependency from the lockfile.
````

## Every option at once

```ts {"title":"main.ts","start":10,"highlight":"2"}
const client = createClient({ retries: 3 }) // (1)
const response = await client.get('/health')
console.log(response.status)
```

1. The client is created once and shared by every request on the page.

````md
```ts {"title":"main.ts","start":10,"highlight":"2"}
const client = createClient({ retries: 3 }) // (1)
const response = await client.get('/health')
console.log(response.status)
```

1. The client is created once and shared by every request on the page.
````
