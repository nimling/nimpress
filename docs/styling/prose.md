---
title: Prose and markdown
order: 63
description: The content column and every element the markdown pipeline produces, including code blocks, callouts, cards, action rows, and feature grids.
---

The content column and every element the markdown pipeline produces, including code blocks, callouts, cards, action rows, and feature grids.

53 classes, listed per component. Every one is an override point: write a rule for it in your own stylesheet and it wins, because everything nimpress ships sits in the `nimpress` cascade layer. See [Styling](/styling) for how that works and [Theming](/theming) for the tokens.

```css
.np-prose {
  border-bottom: 2px solid var(--np-brand);
}
```

## Page

`src/markdown/Page.svelte`

| Class |
|---|
| `np-action-ghost` |
| `np-action-secondary` |
| `np-actions-mounted` |
| `np-code` |
| `np-code-group` |
| `np-code-mount` |
| `np-component-embed` |
| `np-component-embed-mounted` |
| `np-dbml` |
| `np-feature` |
| `np-feature-body` |
| `np-feature-mounted` |
| `np-issue-banner` |
| `np-issue-date` |
| `np-issue-desc` |
| `np-issue-head` |
| `np-issue-kind` |
| `np-issue-kind-bug` |
| `np-issue-kind-epic` |
| `np-issue-kind-feature` |
| `np-issue-kind-milestone` |
| `np-issue-title` |
| `np-mermaid` |
| `np-page` |
| `np-page-backdrop` |
| `np-page-backdrop-doc` |
| `np-page-background` |
| `np-page-footer` |
| `np-page-shell` |
| `np-page-tail` |
| `np-prose` |
| `np-toc-rail` |

## CodeBlock

`src/markdown/CodeBlock.svelte`

| Class |
|---|
| `np-code-bar` |
| `np-code-body` |
| `np-code-copy` |
| `np-code-lang` |

## Card

`src/markdown/Card.svelte`

| Class |
|---|
| `np-card-body` |
| `np-card-icon` |

## Actions

`src/markdown/Actions.svelte`

| Class |
|---|
| `np-action` |
| `np-action-primary` |
| `np-actions-center` |
| `np-actions-end` |
| `np-actions-start` |

## Feature

`src/markdown/Feature.svelte`

| Class |
|---|
| `np-feature-card` |
| `np-feature-content` |
| `np-feature-icon` |
| `np-feature-icon-img` |
| `np-feature-icon-svg` |
| `np-feature-icon-text` |

## CodeGroup

`src/markdown/CodeGroup.svelte`

| Class |
|---|
| `np-code-group-bar` |
| `np-code-group-body` |
| `np-code-group-copy` |
| `np-code-group-tabs` |
