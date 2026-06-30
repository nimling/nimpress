---
title: Nimpress
type: hero
description: A Svelte 5 docs framework that turns a folder of markdown into a full documentation site.
data:
  eyebrow: Documentation framework
  tagline: Markdown in, a full docs site out.
  lead: Content driven routing, a custom markdown pipeline, an OpenAPI renderer, changelogs, roadmaps, and search. One config file and a CLI that owns the build.
  align: center
---

:::actions
[GitHub](https://github.com/nimling/nimpress){"variant":"primary"}
[Changelog](/tools/nimpress/changelog){"variant":"secondary"}
:::

::::features
:::feature {"icon":"📁","title":"Content driven routing"}
A folder of markdown becomes the site. Files are pages, folders are sidebar groups, and frontmatter sets the rest.
:::

:::feature {"icon":"⚡","title":"The CLI owns the build"}
nimpress dev, build, and preview run Vite for you. Write a config, never a Vite file.
:::

:::feature {"icon":"🔌","title":"OpenAPI renderer"}
Point a page at an OpenAPI spec and get per operation deep links rendered through the same markdown pipeline.
:::

:::feature {"icon":"🗂️","title":"Changelogs and roadmaps"}
Release notes collapse into one scrollable page, and a roadmap plots epics, features, and bugs on a timeline.
:::

:::feature {"icon":"🔎","title":"Instant search"}
A search index ships with the build, with tag and folder scoped queries.
:::

:::feature {"icon":"🔁","title":"Docs sync"}
Keep docs beside the code in a .nimpress folder. On a version tag they mirror into the central site.
:::
::::

## How it works

Write markdown under the content folder. Each file becomes a page and each folder a sidebar group. Frontmatter sets the title, the page type, and the metadata. The CLI reads `nimpress.config`, owns Vite, and serves the shell and entry, so there is nothing to wire by hand.

## Distribution

A repo keeps its docs in a `.nimpress` folder. On a version tag it notifies the docs site, which mirrors the folder into its own tree under a mapped path and publishes through the configured approach, a direct commit or a review pull request.
