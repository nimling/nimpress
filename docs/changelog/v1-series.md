---
title: Changelog
type: changelog
data:
  version: 1.7.0
  release_date: 2026-07-20
  title: The v1 series
  description: Everything the first generation shipped, from the single config file through the component workshop and the docs pipeline.
---

The whole of v1 in one entry, from `1.2.2` on 29 June 2026 to `1.7.0` on 20 July 2026. The releases below built the surfaces the current version stands on. Each one is described in the terms a consumer sees, and the reference pages carry the current behavior.

## Sites run from one config

A site became a config file and a CLI. `nimpress init` scaffolds it, `nimpress dev` serves it, `nimpress build` builds it, and there is no Vite config to write and no app to mount. Every field carries a default, so a config can be as small as a title. `nimpress lint` validates structure, naming, frontmatter, and every import in content code files, then builds to verify the output compiles.

Assets gained a home. A shared folder is copied whole into the output and served under a configurable base, while an image beside a markdown file is referenced relative to it. A site wide stylesheet loads after the framework styles, and a stylesheet named after a markdown file loads only while that page and its subpages are open.

## Docs move between repos

The three sync actions arrived: a source repo keeps its docs beside its code, a version tag dispatches the docs site, and the docs site mirrors the folder into a mapped subtree, then commits and tags or opens a pull request. One organization GitHub App carries the trust in both directions. The current flow is in [Publishing](/actions), and [Publishing to a central site](/examples/publishing) walks both repos end to end.

## The component workshop

A component library became a surface inside the site. One system per library, vue and svelte both first class, each rendered live in an isolated iframe harness with controls driving its props.

Stories grew up over the series. They started as bags of prop values, became files that render whatever they want, and then moved to sit beside the page they belong to. Sizing moved into the story markup rather than a config knob, and a story gained the ability to nest itself in its own harness.

The harness itself stopped being a fixed frame and became primitives a library arranges: a root, a mount point for the component under test, an effects wrapper, and an overlay root. A library that needs providers, a wrapping layout, or a companion component declares them rather than hoping they are discovered.

`nimpress modules import` brought an existing library across in one command, mining storybook files for groups, stories, and arg types rather than porting page by page.

The full contract is in [Component modules](/modules), and [Component workshop](/examples/components) walks a library from an empty config to a working page.

## Component schemas became authored files

The schema beside a component page turned into the single place a component is described. It seeds itself from the component types, and from there defaults, enums, descriptions, and mocks are written by hand. `nimpress modules update` upserts source changes into it without overwriting authored content, and the dev server runs the same pass on every change, warning about props with no description and types too opaque to build a control from.

## Release feeds and subscriptions

A changelog collection gained an RSS feed and a subscribe dialog, so a reader follows releases from their own reader. The build writes a machine readable map describing every subscribable page, which is what a pipeline compares between releases.

## Gated pages and guarded bundles

One frontmatter field marks a page guarded. The build separates those pages out of the public bundle into guarded bundles, records what went where, and the `nimpress guard` commands describe the artifacts for upload and then wire the built site to them behind the auth provider. See [Auth](/auth) and [Gated pages](/examples/gating).

## Page visibility

Where a page appears became one field with three states: visible, hidden, and dev only. Hidden removes a page from the sidebar, the search index, and the build. Dev only keeps it in `nimpress dev` and leaves it out of what ships.

## The sidebar learned to be told

A `sidebar` block in frontmatter places a page under a named group without changing its folder or its url, and decorates that group with an icon and inline style. Icons accept literal text, ascii art, inline svg, or a path to an svg file inlined at build time. The root index page can join the sidebar the same way. A folder index carrying only a `sidebar` block decorates its own entry without becoming a page. See [Sidebar](/sidebar).

## Reading surfaces

Diagrams arrived as fenced blocks. Heading anchors gained stable hash links that update as the reader scrolls. The right rail moved to container queries on the page shell, so it responds to the content column rather than the window.
