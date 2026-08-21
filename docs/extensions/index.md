---
title: Extensions
order: 20
description: The renderers nimpress layers on top of markdown, each driven by a fenced block or a frontmatter field.
---

Markdown carries the prose. These renderers carry everything that reads better as a picture, a table, or a live surface. Each one is opt in, each one loads only on the pages that use it, and each one has a worked example.

| Extension | Written as | Example |
|---|---|---|
| [Markdown and code](/extensions/markdown) | Fenced blocks, callouts, code groups | [Hero page](/examples/hero) |
| [Definition lists](/extensions/definition-lists) | `term` then `: description` | [Markdown](/extensions/markdown) |
| [Mermaid](/extensions/mermaid) | A ` ```mermaid ` fence | [Mermaid diagrams](/examples/mermaid) |
| [DBML](/extensions/dbml) | A ` ```dbml ` fence or `type: dbml` | [Schema viewer](/examples/schema-viewer) |
| [OpenAPI](/extensions/openapi) | `type: openapi` and a `spec` field | [OpenAPI reference](/examples/openapi) |

## Loading

Every heavy renderer loads through a dynamic import inside the component that owns it. A page with no diagram never downloads the diagram code, and the chunk cycle guard in [the build pipeline](/build-pipeline) fails the build if a shared module ever pulls one in statically.

## Adding your own

The renderers are components, not a plugin surface. A site that needs a shape nimpress does not ship writes it as a Svelte component and mounts it through a component page, described in [Component modules](/modules).

## Restyling a renderer

The diagram cards, the reference surface, and the inline component frame are all nimpress markup styled from tokens, so a site can restyle any of them. See [Renderers styling](/styling/renderers).
