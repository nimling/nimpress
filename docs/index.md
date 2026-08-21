---
title: Nimpress
type: hero
noToc: true
data:
  eyebrow: Documentation framework
  tagline: Svelte 5 docs framework that supports it all.
  align: start
---

:::actions
[Getting started](/getting-started){"variant":"primary"}
[Page types](/page-types){"variant":"secondary"}
[Changelog](/changelog){"variant":"secondary"}
[GitHub](https://github.com/nimling/nimpress){"variant":"ghost"}
:::

::::features
:::feature {"title":"Content driven","link":"/frontmatter"}
Every route, sidebar entry, and page shell comes from a markdown file and its typed frontmatter. There is no separate navigation config to maintain.
:::

:::feature {"title":"Ten page types","link":"/page-types"}
Doc, hero, changelog, roadmap, the roadmap issue kinds, an OpenAPI renderer, and a live component workshop, each selected by one frontmatter field.
:::

:::feature {"title":"Component workshop","link":"/modules"}
Present a Vue or Svelte component library inside the site with live rendering, controls, stories, and per component docs, each system isolated in its own iframe harness.
:::

:::feature {"title":"Themeable","link":"/theming"}
Every surface is a CSS custom property with a light and a dark value. Override the tokens you want in your own stylesheet, no fork required.
:::

:::feature {"title":"Cross repo publishing","link":"/actions"}
A repo keeps its docs beside its code and ships them into a central site on a version tag through the nimpress docs-sync actions.
:::

:::feature {"title":"Database diagrams","link":"/dbml"}
A schema written in DBML renders as an interactive diagram, inline in a page or as a page of its own, with every column clickable.
:::

:::feature {"title":"Session gating","link":"/auth"}
Gate any page with one frontmatter field. Gated pages build into guarded bundles and upload behind the auth provider.
:::
::::

Nimpress is published as `@nimtech/nimpress` and its CLI owns Vite: there is no Vite config to write and no app to mount by hand. A site needs one `nimpress.config` file where every field has a default, so a config can be as small as a title.

This site is itself a nimpress site, built from the `docs/` folder of the nimpress repository and published on every release. Every page here is also an example of the feature it documents.
