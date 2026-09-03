---
title: Content tabs
order: 39
description: A code group, a tab group of any content, a callout inside a tab, nested groups, two linked groups, and an anchor link that opens a tab.
---

Every form a tab group takes on one page. The source of each block sits under it, so copy the fence that matches what you see. The reference is [Markdown](/extensions/markdown).

## Code blocks

:::code-group
```ts
const value = 1
```
```python
value = 1
```
:::

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

## Other content

:::tabs
::tab Python

Install the client with `pip` and import it from `samna`.

1. Create a virtual environment.

2. Run `pip install samna`.

::tab Go

Install the module with `go get` and import it from `github.com/nimling/samna`.

1. Run `go get github.com/nimling/samna`.

2. Import the package.
:::

```md
:::tabs
::tab Python

Install the client with `pip` and import it from `samna`.

1. Create a virtual environment.

2. Run `pip install samna`.

::tab Go

Install the module with `go get` and import it from `github.com/nimling/samna`.

1. Run `go get github.com/nimling/samna`.

2. Import the package.
:::
```

## A callout inside a tab

A callout opens with three colons, so the group holding it opens and closes with four.

::::tabs
::tab Python

:::tip
Python 3.12 or later is required.
:::

```python
client = samna.Client(token)
```

::tab Go

:::warning
Go modules are required.
:::

```go
client := samna.New(token)
```
::::

````md
::::tabs
::tab Python

:::tip
Python 3.12 or later is required.
:::

```python
client = samna.Client(token)
```

::tab Go

:::warning
Go modules are required.
:::

```go
client := samna.New(token)
```
::::
````

## Nested groups

A group inside a tab opens with three colons, so the outer group opens and closes with four.

::::tabs
::tab Install

:::tabs
::tab macOS

Run `brew install samna`.

::tab Linux

Run `apt install samna`.
:::

::tab Configure

Write the token to `~/.samna/config`.
::::

```md
::::tabs
::tab Install

:::tabs
::tab macOS

Run `brew install samna`.

::tab Linux

Run `apt install samna`.
:::

::tab Configure

Write the token to `~/.samna/config`.
::::
```

## Linked groups

Both groups below carry `linked` in their payload, so choosing a label in one selects the same label in the other, and the choice is remembered for later pages. The `tabs` field in `nimpress.config` links every group on the site the same way.

:::tabs {"linked":true}
::tab Python

Create the client.

::tab Go

Create the client.
:::

:::tabs {"linked":true}
::tab Python

Send the request.

::tab Go

Send the request.
:::

```md
:::tabs {"linked":true}
::tab Python

Create the client.

::tab Go

Create the client.
:::

:::tabs {"linked":true}
::tab Python

Send the request.

::tab Go

Send the request.
:::
```

## Anchor links

Every tab carries an id built from `tab-` and its label, so a link selects it. [Open the Go tab](#tab-go) selects `Go` in the first group carrying that label and scrolls to it.

```md
[Open the Go tab](#tab-go)
```
