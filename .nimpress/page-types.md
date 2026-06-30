---
title: Page types
description: The five page types and when to reach for each.
order: 2
---

A page's `type` frontmatter picks how it renders. Most pages are `doc`. The rest are for a specific shape of content.

## doc

The default. Omit `type`, or set `doc`. Concept guides, references, tutorials, and one off pages all use it. The page mounts in the standard shell with the sidebar and the right rail table of contents.

## openapi

Use only when the page documents an HTTP API and there is a maintained OpenAPI 3.1 spec next to the markdown file. Set `spec` to the spec path. The renderer pulls operation descriptions from the spec and runs them through the same markdown pipeline, so per operation deep links like `#operation/PostBookable` work. Do not retype the spec as prose.

## changelog

Use when a page collects release notes that grow over time. Each release is its own markdown file with `type: changelog` and a `data.version`. Files in one folder share a `title` and collapse into a single page, so reviewing a release is a one file change. Newest version sorts first.

## hero

Use sparingly for the site home, top level section landings, and product introductions. Set `type: hero` and the `data` band fields. Action buttons and a feature grid go in the body with `:::actions` and `:::features`. The oversized type is a beacon, not a default.

## roadmap

Use for a customer facing timeline of planned and shipped work. The `type: roadmap` file holds only the page header and background. Sibling files of `type: milestone | epic | feature | bug` carry the items, each a real page at its own URL. Changelog entries opt in with `data.issue` and `data.status` to move the marker on the spine.

## Issue pages

`milestone`, `epic`, `feature`, and `bug` are the items on a roadmap. Each file is one standalone page under a parent roadmap in the sidebar. They require `title`, `description`, and `data.date`, and `data.parent` nests one under another.

## Decision tree

```
Is the page rendered from an OpenAPI spec?
├─ Yes  → openapi
└─ No
   ├─ A stack of versioned release notes?      → changelog
   ├─ A customer facing roadmap header?        → roadmap
   ├─ One item on a roadmap timeline?          → milestone | epic | feature | bug
   ├─ A beacon style landing page?             → hero
   └─ Otherwise                                → doc
```
