---
title: Nimpress
type: hero
noToc: true
order: 1
sidebar:
  name: Overview
data:
  eyebrow: Documentation framework
  logo: /assets/logo.svg
  tagline: Svelte 5 docs framework that supports it all.
  align: start
---

:::actions
[Getting started](/getting-started){"variant":"primary"}
[Page types](/page-types){"variant":"secondary"}
[Releases](/changelog){"variant":"secondary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"ghost"}
:::

::::features
:::feature {"title":"Content driven","link":"/frontmatter"}
Every route, sidebar entry, and page shell comes from a markdown file and its typed frontmatter. There is no separate navigation config to maintain.
:::

:::feature {"title":"One CLI","link":"/cli"}
`nimpress init`, `dev`, `build`, `lint`, `export`, `guard`, and the modules commands. The CLI owns Vite, so a site carries no build config and no app entry.
:::

:::feature {"title":"Page types","link":"/page-types"}
Doc, hero, changelog, roadmap, the four roadmap issue kinds, database diagrams, an OpenAPI reference, and a live component workshop, each selected by one frontmatter field.
:::

:::feature {"title":"Markdown pipeline","link":"/markdown"}
Callouts, code groups, action rows, feature grids, footnotes, task lists, attributes, and anchors, with shiki highlighting and copy buttons on every fence.
:::

:::feature {"title":"Definition lists","link":"/definition-lists"}
A compact reference grid of terms and one line descriptions, written as plain markdown rather than a table.
:::

:::feature {"title":"Mermaid diagrams","link":"/mermaid"}
Flowcharts, state diagrams, sequence diagrams, and entity relationships render from a fenced block, loaded only on the pages that use one.
:::

:::feature {"title":"Database diagrams","link":"/dbml"}
A schema written in DBML renders as an interactive canvas of table cards and relationship lines, inline in a page or as a page of its own, with every column clickable.
:::

:::feature {"title":"OpenAPI reference","link":"/openapi"}
A JSON or YAML specification becomes a reference page with per operation deep links, a try panel, code examples, and a header control handing the reader the specification in either format.
:::

:::feature {"title":"Changelog collections","link":"/changelog-renderer"}
One markdown file per release collapses into a single page, newest first, so reviewing a release is a single file change.
:::

:::feature {"title":"Roadmaps","link":"/page-types"}
A timeline of milestones, epics, features, and bugs, each its own page, with shipped releases plotting markers on the spine and driving the progress.
:::

:::feature {"title":"Hero pages","link":"/hero"}
An oversized landing band with an eyebrow, a logo, a banner, action buttons, and a feature grid. This page is one.
:::

:::feature {"title":"Component workshop","link":"/modules"}
Present a Vue or Svelte component library inside the site with live rendering, schema driven controls, stories, mock data, and a frame console, each system isolated in its own iframe harness.
:::

:::feature {"title":"Search","link":"/search"}
A MiniSearch index built at build time, with tag boosting and folder scoping, opened from anywhere with one keystroke.
:::

:::feature {"title":"Sidebar from the tree","link":"/sidebar"}
The file tree is the navigation. Declare a group from any page, decorate a row with an icon, and pin an order when alphabetical is wrong.
:::

:::feature {"title":"Themeable","link":"/theming"}
Every surface is a CSS custom property with a light and a dark value. Override the tokens you want in your own stylesheet, or a single page, no fork required.
:::

:::feature {"title":"SEO and feeds","link":"/seo"}
Per page meta, canonical urls, social cards, JSON-LD, a sitemap, and an RSS feed for every changelog collection, all written at build time.
:::

:::feature {"title":"Session gating","link":"/auth"}
Gate any page with one frontmatter field. Gated pages leave the public bundle, build into guarded bundles, and upload behind the auth provider.
:::

:::feature {"title":"Cross repo publishing","link":"/actions"}
A repo keeps its docs beside its code and ships them into a central site on a version tag through the nimpress docs-sync actions.
:::

:::feature {"title":"Build pipeline","link":"/build-pipeline"}
A shell and body split so a page ships only what it renders, a chunk cycle guard on every build, and a base field so the site deploys under any subfolder.
:::
::::

Nimpress is published as `@nimtech/nimpress` and its CLI owns Vite: there is no Vite config to write and no app to mount by hand. A site needs one `nimpress.config` file where every field has a default, so a config can be as small as a title.

This site is itself a nimpress site, built from the `docs/` folder of the nimpress repository and published on every release. Every page here is also an example of the feature it documents.
